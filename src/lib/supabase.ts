import { createClient } from '@supabase/supabase-js';

// Get environment variables - these are embedded at build time in Next.js
// For Vercel: Make sure these are set in Environment Variables before building
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log in browser to help debug
if (typeof window !== 'undefined') {
  console.log('Supabase URL from env:', supabaseUrl);
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co' || !supabaseUrl.includes('supabase.co')) {
    console.error('⚠️ Missing or invalid Supabase URL. Current value:', supabaseUrl);
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL in your Vercel environment variables and redeploy.');
  }
}

// For build time: use placeholder to prevent errors
// For runtime: use actual values if available
// IMPORTANT: In Next.js, NEXT_PUBLIC_* vars must be set at BUILD TIME
// If not set in Vercel before build, placeholder will be used
const finalUrl = supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co' 
  ? supabaseUrl 
  : 'https://placeholder.supabase.co';
  
const finalKey = supabaseAnonKey && supabaseAnonKey !== 'placeholder-key'
  ? supabaseAnonKey
  : 'placeholder-key';

// Create client
export const supabase = createClient(finalUrl, finalKey);

