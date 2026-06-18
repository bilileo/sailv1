import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asignaturaId = searchParams.get('asignaturaId');

    if (!asignaturaId) {
      return NextResponse.json({ error: 'Falta el ID de la asignatura' }, { status: 400 });
    }

    const asignaturaIdNumber = Number(asignaturaId);

    if (Number.isNaN(asignaturaIdNumber)) {
      return NextResponse.json({ error: 'ID de asignatura inválido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('Imparte')
      .select('userId')
      .eq('asignaturaId', asignaturaIdNumber);

    if (error) throw error;

    return NextResponse.json(data?.map((item) => item.userId) || []);
  } catch (error) {
    console.error("Error Supabase Imparte:", error);
    return NextResponse.json({ error: 'Error al obtener profesores de la asignatura' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const asignaturaId = Number(body.asignaturaId);
    const userIds = Array.isArray(body.userIds)
      ? body.userIds.map((id: number | string) => Number(id)).filter((id: number) => !Number.isNaN(id))
      : [];

    if (Number.isNaN(asignaturaId)) {
      return NextResponse.json({ error: 'ID de asignatura inválido' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('Imparte')
      .delete()
      .eq('asignaturaId', asignaturaId);

    if (deleteError) throw deleteError;

    if (userIds.length > 0) {
      const registros = userIds.map((userId: number) => ({
        userId,
        asignaturaId
      }));

      const { error: insertError } = await supabase
        .from('Imparte')
        .insert(registros);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ message: 'Profesores actualizados correctamente' });
  } catch (error) {
    console.error("Error Supabase Imparte:", error);
    return NextResponse.json({ error: 'Error al actualizar profesores de la asignatura' }, { status: 500 });
  }
}