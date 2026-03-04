import { createClient } from '@supabase/supabase-js';

// Инициализируем клиент прямо здесь, чтобы не зависеть от внешних файлов
export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);