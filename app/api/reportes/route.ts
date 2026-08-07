import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin    = searchParams.get('fechaFin');
    const detalle     = searchParams.get('detalle');

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Se requieren fechaInicio y fechaFin' }, { status: 400 });
    }

    if (detalle === 'true') {
      const { data, error } = await supabase
        .from('Attendance')
        .select(`
          id,
          classSessionId,
          checkInTime,
          status,
          observaciones,
          Student (name, email),
          DeviceType (name),
          ClassDate!Attendance_claseId_fkey (fechaClase),
          ClassSession (
            dayOfWeek,
            startTime,
            endTime,
            Asignatura (name),
            Laboratory (name),
            User (name),
            Grupo (nombre)
          )
        `)
        .gte('checkInTime', `${fechaInicio}T00:00:00.000Z`)
        .lte('checkInTime', `${fechaFin}T23:59:59.999Z`)
        .order('checkInTime', { ascending: true });

      if (error) throw error;

      // Agrupar por classSessionId
      const grouped: Record<string, {
        sessionId: number;
        asignatura: string;
        maestro: string;
        laboratorio: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        grupo: string;
        asistencias: {
          alumno: string;
          email: string;
          fechaClase: string | null;
          status: string;
          deviceType: string;
          observaciones: string | null;
        }[];
      }> = {};

      for (const r of (data || [])) {
        const row        = r as Record<string, unknown>;
        const session    = row['ClassSession'] as Record<string, unknown> | null;
        const asignatura = session?.['Asignatura'] as Record<string, unknown> | null;
        const lab        = session?.['Laboratory'] as Record<string, unknown> | null;
        const maestro    = session?.['User'] as Record<string, unknown> | null;
        const grupo      = session?.['Grupo'] as Record<string, unknown> | null;
        const student    = row['Student'] as Record<string, unknown> | null;
        const device     = row['DeviceType'] as Record<string, unknown> | null;
        const classDate  = row['ClassDate'] as Record<string, unknown> | null;

        const sid = String(row['classSessionId']);

        if (!grouped[sid]) {
          grouped[sid] = {
            sessionId:   row['classSessionId'] as number,
            asignatura:  asignatura?.['name'] as string ?? '—',
            maestro:     maestro?.['name'] as string ?? '—',
            laboratorio: lab?.['name'] as string ?? '—',
            dayOfWeek:   session?.['dayOfWeek'] as number ?? 0,
            startTime:   session?.['startTime'] as string ?? '',
            endTime:     session?.['endTime'] as string ?? '',
            grupo:       grupo?.['nombre'] as string ?? '',
            asistencias: [],
          };
        }

        grouped[sid].asistencias.push({
          alumno:       student?.['name'] as string ?? '—',
          email:        student?.['email'] as string ?? '—',
          fechaClase:   classDate?.['fechaClase'] as string | null,
          status:       row['status'] as string,
          deviceType:   device?.['name'] as string ?? '—',
          observaciones: row['observaciones'] as string | null,
        });
      }

      return NextResponse.json(Object.values(grouped));
    }

    // Respuesta resumida (modo original)
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
      const row     = r as Record<string, unknown>;
      const session = row['ClassSession'] as Record<string, unknown> | undefined;
      const lab     = session?.['Laboratory'] as Record<string, unknown> | undefined;
      return {
        id:           row['id'] as string,
        checkInTime:  row['checkInTime'] as string,
        status:       row['status'] as string,
        laboratorioId: lab?.['id'] ? String(lab['id']) : null,
        laboratorio:  lab?.['name'] as string | null,
      };
    });

    return NextResponse.json(registros);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}