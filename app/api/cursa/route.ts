import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asignaturaId = searchParams.get('asignaturaId');
    const studentId = searchParams.get('studentId');

    let query = supabase.from('Cursa').select('*');
    if (asignaturaId) query = query.eq('asignaturaId', asignaturaId);
    if (studentId) query = query.eq('studentId', studentId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { asignaturaId, studentIds } = body;

    if (!asignaturaId || !Array.isArray(studentIds)) {
      return NextResponse.json({ error: 'Missing asignaturaId or studentIds' }, { status: 400 });
    }

    // Server-side validation confirms that both student and asignatura exist
    const { data: asignaturaData, error: asignaturaError } = await supabase
      .from('Asignatura')
      .select('id')
      .eq('id', asignaturaId)
      .maybeSingle();

    if (asignaturaError || !asignaturaData) {
      return NextResponse.json({ error: 'Asignatura does not exist' }, { status: 404 });
    }

    // Delete existing relations
    const { error: deleteError } = await supabase
      .from('Cursa')
      .delete()
      .eq('asignaturaId', asignaturaId);

    if (deleteError) throw deleteError;

    // Insert new relations
    if (studentIds.length > 0) {
      const inserts = studentIds.map((studentId: string) => ({
        asignaturaId,
        studentId
      }));

      const { error: insertError } = await supabase
        .from('Cursa')
        .insert(inserts);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
