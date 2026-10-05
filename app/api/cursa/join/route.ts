import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { studentId, code } = data;

    if (!studentId || !code) {
      return NextResponse.json({ error: 'Faltan datos requeridos (studentId o code)' }, { status: 400 });
    }

    // Buscar la asignatura por materiaCode
    const { data: asignatura, error: asigError } = await supabase
      .from('Asignatura')
      .select('id')
      .eq('materiaCode', code)
      .maybeSingle();

    if (asigError || !asignatura) {
      return NextResponse.json({ error: 'Código de materia inválido' }, { status: 404 });
    }

    const asignaturaId = asignatura.id;

    // Verificar si ya está inscrito
    const { data: existing, error: checkError } = await supabase
      .from('Cursa')
      .select('id')
      .eq('studentId', studentId)
      .eq('asignaturaId', asignaturaId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Ya estabas registrado en esta materia' });
    }

    // Inscribir al alumno
    const { error: insertError } = await supabase
      .from('Cursa')
      .insert([{ studentId, asignaturaId }]);

    if (insertError) {
      return NextResponse.json({ error: 'Error al registrarte en la materia' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
