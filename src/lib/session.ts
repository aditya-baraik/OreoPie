export type User = { id: string; username: string; email: string };

const KEY = 'oreopie_user';

export function getSession(): User | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setSession(user: User): void {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}
