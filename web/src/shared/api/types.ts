export type Role = 'AUCTIONEER' | 'BIDDER';

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type SignupRequest = {
  name: string;
  email: string;
  password: string;
  role: Role | '';
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type WalletBalance = {
  balance: number;
  committed: number;
  available: number;
};

export type CommittedLot = {
  id: number;
  number: number;
  title: string;
  amount: number;
  endsAt: string;
};

export type Wallet = WalletBalance & {
  lots: CommittedLot[];
  lotsTotal: number;
};

export type DepositRequest = {
  amount: number;
};

export type CatalogDepartment =
  'European Painting and Sculpture' | 'Greek and Roman Art';

export type Artwork = {
  id: number;
  title: string;
  artist: string;
  date: string;
  type: string;
  technique: string;
  imageUrl: string;
};

export type CatalogSearch = {
  items: Artwork[];
  page: number;
  pageSize: number;
  total: number;
};

export type CreateLotRequest = {
  artworkId: number;
  startingBid: number;
  increment: number;
  startsAt: string;
  endsAt: string;
};

export type CreatedLot = {
  id: number;
  number: number;
  title: string;
  artist: string;
  startingBid: number;
  increment: number;
  startsAt: string;
  endsAt: string;
};

export type LotStatus = 'live' | 'scheduled' | 'ended';

export type LotCard = {
  id: number;
  number: number;
  title: string;
  artist: string;
  startingBid: number;
  currentBid: number | null;
  startsAt: string;
  endsAt: string;
  status: LotStatus;
};

export type LotShowcase = {
  items: LotCard[];
  page: number;
  pageSize: number;
  total: number;
  counts: Record<LotStatus, number>;
};

export type LotFilter = { q?: string; number?: number };

export type LotDetail = {
  id: number;
  number: number;
  artworkId: number;
  accessionNumber: string;
  title: string;
  artist: string;
  date: string;
  type: string;
  technique: string;
  measurements: string;
  description: string | null;
  department: string;
  startingBid: number;
  increment: number;
  startsAt: string;
  endsAt: string;
  status: LotStatus;
  currentBid: number | null;
  bidCount: number;
  serverTime: string;
  // Nulo até a liquidação; alias e valor nulos quando o lote encerrou sem lances.
  result: LotResult | null;
  me?: { alias: string; hasBid: boolean; receiptToken?: string };
};

export type LotResult = { alias: string | null; amount: number | null };

export type BookStatus = LotStatus | 'cancelled';

export type DashboardLot = {
  id: number;
  number: number;
  title: string;
  artist: string;
  status: BookStatus;
  startingBid: number;
  currentBid: number | null;
  bidCount: number;
  startsAt: string;
  endsAt: string;
  result: BookResult | null;
};

export type BookResult = {
  alias: string | null;
  amount: number | null;
  receiptToken: string | null;
};

export type BookFilter = BookStatus | 'all';

export type DashboardBook = {
  items: DashboardLot[];
  page: number;
  pageSize: number;
  total: number;
  counts: Record<BookFilter, number>;
};

export type DashboardSummary = {
  live: { count: number; currentBidTotal: number };
  scheduled: { count: number; nextStartsAt: string | null };
  ended: { count: number; withoutBids: number };
  received: number;
};

export type Receipt = {
  lotId: number;
  number: number;
  title: string;
  artist: string;
  amount: number;
  alias: string;
  settledAt: string;
  finalHash: string;
  valid: boolean;
};

export type AuditResult =
  'intact' | 'tampered' | 'truncated' | 'receipt_tampered';

export type BidMark = 'intact' | 'tampered' | 'unverifiable';

export type AuditBid = {
  seq: number;
  alias: string;
  amount: number;
  createdAt: string;
  hash: string;
  mark: BidMark;
};

export type LotAudit = {
  id: number;
  number: number;
  title: string;
  status: LotStatus;
  result: AuditResult;
  // Seq do primeiro lance quebrado; nulo fora de 'tampered'.
  brokenSeq: number | null;
  bids: AuditBid[];
};

export type LotId = { id: number };

export type MyBidsSection = 'ongoing' | 'won' | 'lost';

export type OngoingBid = {
  id: number;
  number: number;
  title: string;
  artist: string;
  currentBid: number | null;
  myBid: number;
  endsAt: string;
  situation: 'winning' | 'outbid';
  awaitingSettlement: boolean;
};

export type WonBid = {
  id: number;
  number: number;
  title: string;
  artist: string;
  amount: number;
  settledAt: string;
  receiptToken: string;
};

export type LostBid = {
  id: number;
  number: number;
  title: string;
  artist: string;
  amount: number | null;
  myBid: number;
  settledAt: string;
};

type MyBidsPage<S extends MyBidsSection, T> = {
  section: S;
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  counts: Record<MyBidsSection, number>;
};

export type MyBids =
  | MyBidsPage<'ongoing', OngoingBid>
  | MyBidsPage<'won', WonBid>
  | MyBidsPage<'lost', LostBid>;

export type PlaceBidRequest = { amount: number };

export type PlacedBid = {
  seq: number;
  amount: number;
  alias: string;
  createdAt: string;
  endsAt: string;
};

export type BidEvent = PlacedBid;

export type SettledEvent = LotResult;

export type BidHistoryItem = {
  seq: number;
  alias: string;
  amount: number;
  createdAt: string;
};

export type BidHistory = {
  items: BidHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type ApiErrorBody = {
  code?: string;
  fields?: Record<string, string>;
  startsAt?: string;
  minimum?: number;
  available?: number;
};
