import type {
  ApiErrorBody,
  AuthResponse,
  BidEvent,
  BidHistory,
  BookFilter,
  CatalogDepartment,
  CatalogSearch,
  CreatedLot,
  CreateLotRequest,
  DashboardBook,
  DashboardSummary,
  DepositRequest,
  LoginRequest,
  LotCard,
  LotDetail,
  LotFilter,
  LotShowcase,
  LotStatus,
  PlaceBidRequest,
  PlacedBid,
  SignupRequest,
  Wallet,
  WalletBalance,
} from './types';

const baseUrl = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields?: Record<string, string>;
  readonly minimum?: number;
  readonly available?: number;
  readonly startsAt?: string;

  constructor(status: number, body: ApiErrorBody = {}) {
    super(body.code ?? `HTTP ${status}`);
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
    this.minimum = body.minimum;
    this.available = body.available;
    this.startsAt = body.startsAt;
  }
}

type Options = {
  method?: 'GET' | 'POST';
  body?: unknown;
};

let token: string | null = null;
let onUnauthorized = () => {};

export function setToken(value: string | null) {
  token = value;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const sentToken = token;
  const response = await send(path, options, sentToken);
  if (!response.ok) {
    if (response.status === 401 && sentToken) onUnauthorized();
    throw new ApiError(response.status, await readError(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function send(
  path: string,
  { method = 'GET', body }: Options,
  sentToken: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (sentToken) headers.Authorization = `Bearer ${sentToken}`;
  try {
    return await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0);
  }
}

async function readError(response: Response): Promise<ApiErrorBody> {
  try {
    return toErrorBody(await response.json());
  } catch {
    return {};
  }
}

function toErrorBody(value: unknown): ApiErrorBody {
  if (typeof value !== 'object' || value === null) return {};
  const { code, fields, minimum, available, startsAt } = value as Record<
    string,
    unknown
  >;
  return {
    code: typeof code === 'string' ? code : undefined,
    fields: isStringRecord(fields) ? fields : undefined,
    minimum: typeof minimum === 'number' ? minimum : undefined,
    available: typeof available === 'number' ? available : undefined,
    startsAt: typeof startsAt === 'string' ? startsAt : undefined,
  };
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}

export const api = {
  signup: (body: SignupRequest) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body }),
  login: (body: LoginRequest) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body }),
  wallet: () => request<Wallet>('/wallet'),
  deposit: (amount: number) => {
    const body: DepositRequest = { amount };
    return request<WalletBalance>('/wallet/deposits', { method: 'POST', body });
  },
  catalogSearch: (q: string, department: CatalogDepartment, page: number) => {
    const query = new URLSearchParams({ q, department, page: String(page) });
    return request<CatalogSearch>(`/catalog/search?${query}`);
  },
  createLot: (body: CreateLotRequest) =>
    request<CreatedLot>('/lots', { method: 'POST', body }),
  cancelLot: (id: number) =>
    request<void>(`/lots/${id}/cancel`, { method: 'POST' }),
  dashboardLots: (status: BookFilter, page: number) => {
    const query = new URLSearchParams({ status, page: String(page) });
    return request<DashboardBook>(`/dashboard/lots?${query}`);
  },
  dashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),
  lots: (status: LotStatus, page: number, filter: LotFilter) => {
    const query = new URLSearchParams({ status, page: String(page) });
    if (filter.q) query.set('q', filter.q);
    if (filter.number) query.set('number', String(filter.number));
    return request<LotShowcase>(`/lots?${query}`);
  },
  featured: () => request<LotCard | undefined>('/lots/featured'),
  lot: (id: number) => request<LotDetail>(`/lots/${id}`),
  lotBids: (id: number, page: number) =>
    request<BidHistory>(`/lots/${id}/bids?page=${page}`),
  placeBid: (id: number, amount: number) => {
    const body: PlaceBidRequest = { amount };
    return request<PlacedBid>(`/lots/${id}/bids`, { method: 'POST', body });
  },
};

type StreamHandlers = {
  onBid: (bid: BidEvent) => void;
  onOpen: () => void;
};

const reopenDelay = 3000;

// o EventSource reconecta sozinho, mas desiste se a resposta vier sem status 200
export function openLotStream(
  id: number,
  handlers: StreamHandlers,
): () => void {
  let source: EventSource | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const connect = () => {
    source = new EventSource(`${baseUrl}/lots/${id}/stream`);
    source.addEventListener('open', handlers.onOpen);
    source.addEventListener('bid', (event) => {
      const bid = parseBidEvent(event.data);
      if (bid) handlers.onBid(bid);
    });
    source.addEventListener('error', () => {
      if (closed || source?.readyState !== EventSource.CLOSED) return;
      timer = setTimeout(connect, reopenDelay);
    });
  };

  connect();
  return () => {
    closed = true;
    clearTimeout(timer);
    source?.close();
  };
}

function parseBidEvent(data: unknown): BidEvent | null {
  if (typeof data !== 'string') return null;
  try {
    const value: unknown = JSON.parse(data);
    return isBidEvent(value) ? value : null;
  } catch {
    return null;
  }
}

function isBidEvent(value: unknown): value is BidEvent {
  if (typeof value !== 'object' || value === null) return false;
  const { seq, amount, alias, createdAt, endsAt } = value as Record<
    string,
    unknown
  >;
  return (
    Number.isInteger(seq) &&
    Number.isInteger(amount) &&
    typeof alias === 'string' &&
    typeof createdAt === 'string' &&
    typeof endsAt === 'string'
  );
}

export function lotImageUrl(id: number): string {
  return `${baseUrl}/lots/${id}/image`;
}
