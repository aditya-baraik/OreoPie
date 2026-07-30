import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://azggwkbzlihmquzpvdmf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nit6Giy4-k4zOjVg0qLS9g_RYjz2CzJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
