import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asignaturaId = searchParams.get('asignaturaId');

    if (asignaturaId) {
      const asignaturaIdNumber = Number(asignaturaId);

      if (Number.isNaN(asignaturaIdNumber)) {
        return NextResponse.json({ error: 'ID de asignatura inválido' }, { status: 400 });
      }

      const { data: imparteData, error: imparteError } = await supabase
        .from('Imparte')
        .select('userId')
        .eq('asignaturaId', asignaturaIdNumber);

      if (imparteError) throw imparteError;

      const userIds = imparteData?.map((item) => item.userId) || [];

      if (userIds.length === 0) {
        return NextResponse.json([]);
      }

      const { data, error } = await supabase
        .from('User')
        .select('id, name')
        .eq('role', 'MAESTRO')
        .in('id', userIds)
        .order('name');

      if (error) throw error;

      return NextResponse.json(data);
    }
    const { data, error } = await supabase
      .from('User')
      .select('id, name')
      .eq('role', 'MAESTRO')
      .order('name');

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error Supabase Maestros:", error);
    return NextResponse.json({ error: 'Error al obtener maestros' }, { status: 500 });
  }
}
