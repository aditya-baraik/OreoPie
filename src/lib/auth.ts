import { supabase } from './supabase';
import type { User } from './session';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Returns an error string if invalid, null if valid */
export function validateUsername(u: string): string | null {
  if (u.length < 6) return 'Must be at least 6 characters';
  if (!/^[a-zA-Z0-9]+$/.test(u)) return 'Letters and numbers only — no spaces or symbols';
  return null;
}

export async function signup(username: string, email: string, password: string): Promise<User> {
  const uErr = validateUsername(username);
  if (uErr) throw new Error(uErr);
  if (!email.includes('@')) throw new Error('Enter a valid email address');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const hash = await sha256(password + username);
  const hint = btoa(unescape(encodeURIComponent(password))); // base64 for recovery

  const { data, error } = await supabase
    .from('oreopie_users')
    .insert({ username, email, password_hash: hash, password_hint: hint })
    .select('id,username,email')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Username already taken — choose another');
    throw new Error(error.message);
  }

  return { id: data.id, username: data.username, email: data.email };
}

export async function login(username: string, password: string): Promise<User> {
  if (!username || !password) throw new Error('Enter your username and password');
  const hash = await sha256(password + username);

  const { data, error } = await supabase
    .from('oreopie_users')
    .select('id,username,email')
    .eq('username', username)
    .eq('password_hash', hash)
    .single();

  if (error || !data) throw new Error('Invalid username or password');
  return { id: data.id, username: data.username, email: data.email };
}

export async function forgotPassword(username: string, email: string): Promise<string> {
  const { data, error } = await supabase
    .from('oreopie_users')
    .select('password_hint')
    .eq('username', username)
    .eq('email', email)
    .single();

  if (error || !data) throw new Error('No account matches that username and email');
  try {
    return decodeURIComponent(escape(atob(data.password_hint)));
  } catch {
    return atob(data.password_hint);
  }
}

export async function searchUsers(query: string, currentUsername: string): Promise<string[]> {
  if (!query || query.length < 2) return [];
  const { data, error } = await supabase
    .from('oreopie_users')
    .select('username')
    .ilike('username', `%${query}%`)
    .neq('username', currentUsername)
    .limit(8);
  if (error) return [];
  return data.map((d: { username: string }) => d.username);
}
