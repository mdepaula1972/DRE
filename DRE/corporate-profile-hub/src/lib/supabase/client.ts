import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isKeyValid = supabaseUrl.startsWith('http') && !supabaseAnonKey.includes('YOUR_');

if (!isKeyValid) {
  console.warn('⚠️ Supabase credentials invalid or missing. Check your .env.local file.');
}

// Export a dummy or the real client
export const supabase = isKeyValid 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({} as any); // Previne crash imediato, mas falhará em chamadas de API.
