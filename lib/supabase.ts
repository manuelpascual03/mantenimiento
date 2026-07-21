import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Exportamos esta constante para usarla en cualquier parte del sistema
export const supabase = createClient(supabaseUrl, supabaseAnonKey);