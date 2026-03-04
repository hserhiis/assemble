import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Инициализируем клиент прямо здесь, чтобы не зависеть от внешних файлов
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ error: "Date parameter is missing" }, { status: 400 });
    }

    try {
        // 1. Получаем лимит мастеров
        const { data: staff } = await supabase.from('staff').select('id');
        const staffLimit = staff?.length || 0;

        // 2. Получаем брони на конкретную дату
        const { data: bookings, error: dbError } = await supabase
            .from('bookings')
            .select('slot_id')
            .eq('target_date', date);

        if (dbError) throw dbError;

        // 3. Получаем настройки цен
        const { data: pricing } = await supabase
            .from('settings')
            .select('*')
            .eq('id', 'pricing')
            .single();

        // Превращаем массив в объект { slot_id: количество }
        const bookedSlots = bookings?.reduce((acc: any, b: any) => {
            acc[b.slot_id] = (acc[b.slot_id] || 0) + 1;
            return acc;
        }, {}) || {};

        return NextResponse.json({
            staffLimit,
            bookedSlots,
            pricing: {
                initial: pricing?.initial_price || 40,
                extra: pricing?.extra_price || 25
            }
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}