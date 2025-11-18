import { createClient } from '@supabase/supabase-js';

// Use dummy values during build to prevent errors
// These will be replaced with actual values at runtime when env vars are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Create client with fallback values to prevent build errors
// The client will only work properly when environment variables are set
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

