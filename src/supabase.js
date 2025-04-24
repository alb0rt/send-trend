import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Get the site URL from environment or fallback to window.location.origin
const siteUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Set the site URL for redirects
      site_url: siteUrl,
    },
  });