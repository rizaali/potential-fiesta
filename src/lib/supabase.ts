import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if we're in the browser and have valid credentials
if (typeof window !== 'undefined') {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
    console.error('Missing or invalid Supabase credentials. Please check your environment variables.');
  }
}

// Use dummy values during build to prevent errors
// These will be replaced with actual values at runtime when env vars are available
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

// Create client with fallback values to prevent build errors
// The client will only work properly when environment variables are set
export const supabase = createClient(finalUrl, finalKey);

