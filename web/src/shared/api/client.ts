import type {
  ApiErrorBody,
  AuthResponse,
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
  SignupRequest,
  Wallet,
  WalletBalance,
} from './types';

const baseUrl = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, body: ApiErrorBody = {}) {
    super(body.code ?? `HTTP ${status}`);
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
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
  const { code, fields } = value as Record<string, unknown>;
  return {
    code: typeof code === 'string' ? code : undefined,
    fields: isStringRecord(fields) ? fields : undefined,
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
};

export function lotImageUrl(id: number): string {
  return `${baseUrl}/lots/${id}/image`;
}
