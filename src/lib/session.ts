export type User = { id: string; username: string; email: string };

const USER_KEY  = 'oreopie_user';
const TOKEN_KEY = 'oreopie_session_token';

export function getSession(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setSession(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

/** A stable random token identifying this browser tab session — generated once per login */
export function getOrCreateSessionToken(): string {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function getSessionToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
