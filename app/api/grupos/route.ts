import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('Grupo')
      .select('id, nombre, createdAt')
      .order('nombre', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nombre = String(body?.nombre || '').trim();

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre del grupo es obligatorio' }, { status: 400 });
    }

    const { data: existente, error: existeError } = await supabase
      .from('Grupo')
      .select('id')
      .ilike('nombre', nombre)
      .limit(1)
      .maybeSingle();

    if (existeError) throw existeError;

    if (existente) {
      return NextResponse.json({ error: 'Ya existe un grupo con ese nombre' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('Grupo')
      .insert([{ nombre }])
      .select('id, nombre, createdAt')
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body?.id);
    const nombre = String(body?.nombre || '').trim();

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'ID de grupo no válido' }, { status: 400 });
    }

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre del grupo es obligatorio' }, { status: 400 });
    }

    const { data: existente, error: existeError } = await supabase
      .from('Grupo')
      .select('id')
      .ilike('nombre', nombre)
      .neq('id', id)
      .limit(1)
      .maybeSingle();

    if (existeError) throw existeError;

    if (existente) {
      return NextResponse.json({ error: 'Ya existe otro grupo con ese nombre' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('Grupo')
      .update({ nombre })
      .eq('id', id)
      .select('id, nombre, createdAt')
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'ID de grupo no válido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('Grupo')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
