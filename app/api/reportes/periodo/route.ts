import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodoId = searchParams.get('periodoId');

    if (!periodoId) {
      return NextResponse.json({ error: 'Se requiere periodoId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ClassSession')
      .select(`
        id,
        dayOfWeek,
        startTime,
        endTime,
        Asignatura (name, materiaCode, color),
        Laboratory (name),
        User (name),
        Grupo (nombre),
        Attendance (
          id,
          status,
          checkInTime,
          checkOutTime,
          observaciones,
          Student (id, name, email),
          DeviceType (name),
          ClassDate!Attendance_claseId_fkey (fechaClase)
        )
      `)
      .eq('periodoId', periodoId)
      .order('dayOfWeek', { ascending: true });

    if (error) throw error;

    const result = (data || []).map((session) => {
      const s = session as Record<string, unknown>;
      const asignatura = s['Asignatura'] as Record<string, unknown> | null;
      const lab = s['Laboratory'] as Record<string, unknown> | null;
      const maestro = s['User'] as Record<string, unknown> | null;
      const grupo = s['Grupo'] as Record<string, unknown> | null;
      const rawAttendances = (s['Attendance'] as Record<string, unknown>[] | null) ?? [];

      const asistencias = rawAttendances.map((a) => {
        const student = a['Student'] as Record<string, unknown> | null;
        const device = a['DeviceType'] as Record<string, unknown> | null;
        const classDate = a['ClassDate'] as Record<string, unknown> | null;
        return {
          id: a['id'] as number,
          status: a['status'] as string,
          checkInTime: a['checkInTime'] as string | null,
          checkOutTime: a['checkOutTime'] as string | null,
          observaciones: a['observaciones'] as string | null,
          alumno: student?.['name'] as string ?? '—',
          matricula: String(student?.['id'] ?? '—'),
          email: student?.['email'] as string ?? '—',
          deviceType: device?.['name'] as string ?? '—',
          fechaClase: classDate?.['fechaClase'] as string | null,
        };
      });

      // Ordenar asistencias por fecha y luego por nombre del alumno
      asistencias.sort((a, b) => {
        const fechaA = a.fechaClase ?? a.checkInTime ?? '';
        const fechaB = b.fechaClase ?? b.checkInTime ?? '';
        if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
        return a.alumno.localeCompare(b.alumno);
      });

      return {
        id: s['id'] as number,
        dayOfWeek: s['dayOfWeek'] as number,
        startTime: s['startTime'] as string,
        endTime: s['endTime'] as string,
        asignatura: asignatura?.['name'] as string ?? '—',
        materiaCode: asignatura?.['materiaCode'] as string ?? '',
        color: (asignatura?.['color'] as string | null) || '#3B82F6',
        laboratorio: lab?.['name'] as string ?? '—',
        maestro: maestro?.['name'] as string ?? '—',
        grupo: grupo?.['nombre'] as string ?? '',
        asistencias,
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}