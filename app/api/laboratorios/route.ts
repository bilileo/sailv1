import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('Laboratory')
      .select('id, name, building, capacity, status')
      .order('name');
      
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nombreLimpio = body.name.trim();

    // Verificar si ya existe uno con el mismo nombre (Ignorando mayúsculas/minúsculas)
    const { data: existente } = await supabase
      .from('Laboratory')
      .select('id')
      .ilike('name', nombreLimpio)
      .maybeSingle();

    if (existente) {
      return NextResponse.json({ error: 'Ya existe un laboratorio con ese nombre.' }, { status: 400 });
    }

    // Si no existe, lo insertamos
    const { error } = await supabase
      .from('Laboratory')
      .insert([{ 
        name: nombreLimpio, 
        building: body.building,
        capacity: body.capacity,
        status: body.status || 'AVAILABLE'
      }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const nombreLimpio = body.name.trim();

    // Verificar si ya existe otro lab con este nuevo nombre
    const { data: existente } = await supabase
      .from('Laboratory')
      .select('id')
      .ilike('name', nombreLimpio)
      .neq('id', body.id) // Excluimos el que estamos editando actualmente
      .maybeSingle();

    if (existente) {
      return NextResponse.json({ error: 'Ya existe un laboratorio con este nombre.' }, { status: 400 });
    }

    // Si es válido, actualizamos
    const { error } = await supabase
      .from('Laboratory')
      .update({ 
        name: nombreLimpio, 
        building: body.building,
        capacity: body.capacity,
        status: body.status
      })
      .eq('id', body.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { error } = await supabase
      .from('Laboratory')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json({ error: 'No se puede eliminar este laboratorio porque tiene clases asignadas.' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
