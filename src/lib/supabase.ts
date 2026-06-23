import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseUrl.trim() !== '' && 
  supabaseUrl !== 'https://tu-proyecto-id.supabase.co' &&
  supabaseAnonKey && 
  supabaseAnonKey.trim() !== '' &&
  supabaseAnonKey !== 'tu-anon-key-de-supabase'
);

if (!isSupabaseConfigured) {
  console.warn(
    'ADVERTENCIA: Las variables de entorno de Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY) no están definidas o contienen valores de marcador de posición. Por favor, configúralas en tu archivo .env.local.'
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey! : 'placeholder-key'
);
