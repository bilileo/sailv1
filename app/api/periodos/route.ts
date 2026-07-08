import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('Periodo')
      .select('*')
      .order('fechaInicio', { ascending: false });

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

    if (!body.nombre || !body.fechaInicio || !body.fechaFin) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const { error } = await supabase
      .from('Periodo')
      .insert([
        {
          nombre: body.nombre,
          fechaInicio: body.fechaInicio,
          fechaFin: body.fechaFin,
          activo: false 
        }
      ]);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El nombre de este periodo ya existe' }, { status: 400 });
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
    const body = await request.json();

    if (!body.id) return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });

    if (body.activo === true) {
      const { error: deactivateError } = await supabase
        .from('Periodo')
        .update({ activo: false })
        .neq('id', body.id); // Todos menos el seleccionado

      if (deactivateError) throw deactivateError;
    }

    const { error } = await supabase
      .from('Periodo')
      .update({
        nombre: body.nombre,
        fechaInicio: body.fechaInicio,
        fechaFin: body.fechaFin,
        activo: body.activo
      })
      .eq('id', body.id);

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

    const { error } = await supabase.from('Periodo').delete().eq('id', id);
    
    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'No puedes eliminar este periodo porque ya tiene clases y asistencias vinculadas en el historial.' }, 
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}