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

export type Wallet = {
  balance: number;
  committed: number;
  available: number;
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

export type ApiErrorBody = {
  code?: string;
  fields?: Record<string, string>;
};
