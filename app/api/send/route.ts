// app/api/send/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { address, phone, desc, slot_id, image_url, estimated_hours, target_date } = await req.json();

        const { data, error } = await supabase
            .from('bookings')
            .insert([
                {
                    address,
                    phone,
                    description: desc,
                    slot_id,
                    image_url,
                    estimated_hours,
                    target_date: target_date // Сопоставляем данные из фронта с колонкой в БД
                }
            ]);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}