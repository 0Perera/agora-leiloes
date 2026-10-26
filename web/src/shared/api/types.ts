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

export type ApiErrorBody = {
  code?: string;
  fields?: Record<string, string>;
};
