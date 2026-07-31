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
  const hint = btoa(unescape(encodeURIComponent(password)));

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

export async function updatePassword(
  username: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');
  const oldHash = await sha256(oldPassword + username);

  // Verify old password first
  const { data, error } = await supabase
    .from('oreopie_users')
    .select('id')
    .eq('username', username)
    .eq('password_hash', oldHash)
    .single();

  if (error || !data) throw new Error('Current password is incorrect');

  const newHash = await sha256(newPassword + username);
  const { error: updateErr } = await supabase
    .from('oreopie_users')
    .update({ password_hash: newHash })
    .eq('username', username);

  if (updateErr) throw new Error('Failed to update password');
}

// ── Device session management ────────────────────────────────

export interface DeviceSession {
  id: string;
  session_token: string;
  device_info: {
    browser?: string;
    os?: string;
    label?: string;
  };
  created_at: string;
  last_active: string;
  isCurrent?: boolean;
}

function getDeviceInfo(): DeviceSession['device_info'] {
  const ua = navigator.userAgent;
  let browser = 'Unknown browser';
  let os = 'Unknown OS';

  if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os, label: `${browser} on ${os}` };
}

/**
 * Register this device's session in the DB.
 * Safe to call — silently ignores if table doesn't exist yet.
 */
export async function registerDeviceSession(
  userId: string,
  username: string,
  sessionToken: string,
): Promise<void> {
  try {
    await supabase.from('oreopie_sessions').upsert(
      {
        user_id: userId,
        username,
        session_token: sessionToken,
        device_info: getDeviceInfo(),
        last_active: new Date().toISOString(),
      },
      { onConflict: 'session_token' },
    );
  } catch {
    // Table may not exist yet — feature degrades gracefully
  }
}

/** Fetch all active sessions for a user */
export async function getDeviceSessions(
  userId: string,
  currentToken: string,
): Promise<DeviceSession[]> {
  try {
    const { data, error } = await supabase
      .from('oreopie_sessions')
      .select('id,session_token,device_info,created_at,last_active')
      .eq('user_id', userId)
      .order('last_active', { ascending: false });

    if (error || !data) return [];
    return data.map((s) => ({
      ...s,
      isCurrent: s.session_token === currentToken,
    })) as DeviceSession[];
  } catch {
    return [];
  }
}

/** Remove a session by its DB row id — throws on failure so caller can show error */
export async function removeDeviceSession(sessionRowId: string): Promise<void> {
  const { error } = await supabase
    .from('oreopie_sessions')
    .delete()
    .eq('id', sessionRowId);
  if (error) throw new Error(error.message);
}

/** Remove the current device's session on logout */
export async function removeCurrentSession(sessionToken: string): Promise<void> {
  try {
    await supabase.from('oreopie_sessions').delete().eq('session_token', sessionToken);
  } catch {
    // Ignore
  }
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
