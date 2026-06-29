import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Se requieren fechaInicio y fechaFin' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('Attendance')
      .select(`
        id,
        checkInTime,
        status,
        ClassSession (
          Laboratory ( id, name )
        )
      `)
      .gte('checkInTime', `${fechaInicio}T00:00:00.000Z`)
      .lte('checkInTime', `${fechaFin}T23:59:59.999Z`);

    if (error) throw error;

    const registros = (data || []).map((r) => {
      const row = r as Record<string, unknown>;
      const session = row['ClassSession'] as Record<string, unknown> | undefined;
      const lab = session?.['Laboratory'] as Record<string, unknown> | undefined;
      return {
        id: row['id'] as string,
        checkInTime: row['checkInTime'] as string,
        status: row['status'] as string,
        laboratorioId: lab?.['id'] ? String(lab['id']) : null,
        laboratorio: lab?.['name'] as string | null,
      };
    });

    return NextResponse.json(registros);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
