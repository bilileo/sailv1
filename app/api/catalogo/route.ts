import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let query = supabase
      .from('Asignatura')
      .select('*')
      .order('id', { ascending: false });

    if (id) query = query.eq('id', id);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.materiaCode) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    const payload = {
      name: body.name,
      materia_code: body.materiaCode,
      color: body.color || 'bg-blue-600'
    };

    const { data, error } = await supabase.from('Asignatura').insert([payload]).select();
    if (error) throw error;

    return NextResponse.json(data?.[0] ?? { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
    console.log("Error en POST:", message); // Debug: Ver error en consola
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    
    const updatePayload: Record<string, unknown> = {
      name: data.name,
      materia_code: data.materiaCode,
      color: data.color || 'bg-blue-600'
    };

    const { error } = await supabase
      .from('Asignatura')
      .update(updatePayload)
      .eq('id', data.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
    }

    const { error } = await supabase.from('Asignatura').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
