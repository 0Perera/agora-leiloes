import type { AuthResponse, Role, User } from '../shared/api/types';

export type Session = AuthResponse;

const storageKey = 'agora.session';
const roles: Role[] = ['AUCTIONEER', 'BIDDER'];

export function homePath(role: Role): string {
  return role === 'AUCTIONEER' ? '/dashboard' : '/';
}

export function isTokenValid(token: string, now = Date.now()): boolean {
  const exp = readExp(token);
  return exp !== null && exp * 1000 > now;
}

function readExp(token: string): number | null {
  try {
    const payload: unknown = JSON.parse(decodeBase64Url(token.split('.')[1]));
    if (typeof payload !== 'object' || payload === null) return null;
    const { exp } = payload as Record<string, unknown>;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
}

export function loadSession(): Session | null {
  const stored = readStored();
  if (isSession(stored) && isTokenValid(stored.token)) return stored;
  clearSession();
  return null;
}

function readStored(): unknown {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? 'null');
  } catch {
    return null;
  }
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const { token, user } = value as Record<string, unknown>;
  return typeof token === 'string' && isUser(user);
}

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const { name, role } = value as Record<string, unknown>;
  return typeof name === 'string' && roles.includes(role as Role);
}

export function saveSession(session: Session) {
  safely(() => localStorage.setItem(storageKey, JSON.stringify(session)));
}

export function clearSession() {
  safely(() => localStorage.removeItem(storageKey));
}

// storage bloqueado (modo privado, política do navegador) lança: a sessão vale até recarregar
function safely(action: () => void) {
  try {
    action();
  } catch {
    return;
  }
}
