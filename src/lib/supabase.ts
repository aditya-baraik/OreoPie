import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when both env vars are present and the client is usable */
export const supabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Create a real client when configured, or a stub that won't throw at import time
export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');
