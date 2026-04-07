import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngtjhwswbbivqajtpjvg.supabase.co';

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgwNTc4NjMsImV4cCI6MjA2My41NTc4NjN9.y7z6r4lLqx-qC3Y5X5QwQ7XqX3Yw8z5LqyY3Lg';

const getSupabaseKey = () => {
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
  if (process.env.SUPABASE_SERVICE_KEY) {
    return process.env.SUPABASE_SERVICE_KEY;
  }
  return ANON_KEY;
};

const supabaseKey = getSupabaseKey();

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});
