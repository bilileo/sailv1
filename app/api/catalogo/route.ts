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
    const data = await request.json();

    const { error } = await supabase
      .from('Asignatura')
      .insert([
        {
          name: data.name,
          materiaCode: data.materiaCode,
          color: data.color || 'bg-blue-600',
          semestre: data.semestre || 1
        }
      ]);

    if (error) {
      // 23505 es el código de PostgreSQL para una violación de clave única (Unique Violation)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'La clave de asignatura ya está registrada' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();

    const updatePayload: Record<string, unknown> = {
      name: data.name,
      materiaCode: data.materiaCode,
      color: data.color || 'bg-blue-600',
      semestre: data.semestre || 1
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
