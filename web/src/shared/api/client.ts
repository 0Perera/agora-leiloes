import type { HealthResponse } from './types';

const baseUrl = import.meta.env.VITE_API_URL;

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} on ${path}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getHealth: () => request<HealthResponse>('/health'),
};
