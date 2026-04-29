import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('Laboratory')
      .select('id, name')
      .order('name');
      
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error Supabase Laboratorios:", error);
    return NextResponse.json({ error: 'Error al obtener laboratorios' }, { status: 500 });
  }
}