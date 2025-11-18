import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client with fallback values to prevent build errors
// The client will only work properly when environment variables are set
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

