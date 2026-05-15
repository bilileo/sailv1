import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getToken } from 'next-auth/jwt';
import * as XLSX from 'xlsx';
import { readDB } from '@/app/lib/db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const STATUS_MAP: Record<string, string> = {
  normal: 'Presente',
  tarde: 'Tarde',
  ausente: 'Ausente',
  abandono: 'Abandonó',
};

const DIA_MAP: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves',
  5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
};

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || 'SAIL_Super_Secreto_Servicio_Social_2026!',
  });

  if (!token || token.role === 'MAESTRO') {
    return new NextResponse('No autorizado', { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const classId = searchParams.get('classId');
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');

  let query = supabase
    .from('Attendance')
    .select(`
      id,
      studentmatricula,
      studentname,
      status,
      attendancedate,
      classsessionid,
      ClassSession (
        subject,
        starttime,
        endtime,
        dayofweek,
        Laboratory ( name )
      )
    `)
    .not('studentmatricula', 'is', null)
    .order('attendancedate', { ascending: true });

  if (classId) query = query.eq('classsessionid', parseInt(classId));
  if (desde) query = query.gte('attendancedate', `${desde}T00:00:00.000Z`);
  if (hasta) query = query.lte('attendancedate', `${hasta}T23:59:59.999Z`);

  const { data: supabaseData, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const wb = XLSX.utils.book_new();

  if (classId) {
    // Merge Supabase records with JSON students pending flush
    const db = await readDB();
    const jsonStudents = db.students.filter((s) => String(s.classId) === classId);

    // Build a set of matriculas already in Supabase to avoid duplicates
    const inSupabase = new Set((supabaseData ?? []).map((r: any) => r.studentmatricula));

    const jsonRows = jsonStudents
      .filter((s) => !inSupabase.has(s.id))
      .map((s) => ({
        studentmatricula: s.id,
        studentname: s.name,
        status: s.status ?? 'normal',
        attendancedate: s.registeredAt ?? null,
        ClassSession: null,
      }));

    const allData = [...(supabaseData ?? []), ...jsonRows];

    // Fetch class info separately if Supabase returned no records (but JSON has some)
    let cs = (supabaseData?.[0] as any)?.ClassSession;
    if (!cs && classId) {
      const { data: csData } = await supabase
        .from('ClassSession')
        .select('subject, starttime, endtime, dayofweek, Laboratory(name)')
        .eq('id', parseInt(classId))
        .single();
      cs = csData;
    }

    const horario = cs ? `${cs.starttime?.slice(0, 5)} - ${cs.endtime?.slice(0, 5)}` : '-';

    const sheetRows: any[][] = [
      ['SAIL - Lista de Asistencia'],
      ['Clase:', cs?.subject ?? '-'],
      ['Laboratorio:', (cs?.Laboratory as any)?.name ?? '-'],
      ['Día:', DIA_MAP[cs?.dayofweek] ?? '-'],
      ['Horario:', horario],
      ['Exportado:', new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })],
      [],
      ['Matrícula', 'Nombre', 'Estado', 'Hora de Registro'],
      ...allData.map((r: any) => [
        r.studentmatricula,
        r.studentname,
        STATUS_MAP[r.status] ?? r.status,
        r.attendancedate ? new Date(r.attendancedate).toLocaleString('es-MX') : '-',
      ]),
      [],
      ['Total alumnos:', allData.length],
      ['Presentes:', allData.filter((r: any) => r.status === 'normal').length],
      ['Tardíos:', allData.filter((r: any) => r.status === 'tarde').length],
      ['Ausentes:', allData.filter((r: any) => r.status === 'ausente').length],
      ['Abandonos:', allData.filter((r: any) => r.status === 'abandono').length],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    ws['!cols'] = [{ wch: 18 }, { wch: 38 }, { wch: 12 }, { wch: 26 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
  } else {
    // Merge JSON students into the general report, filtered by date range
    const db = await readDB();
    const desdeMs = desde ? new Date(`${desde}T00:00:00.000Z`).getTime() : -Infinity;
    const hastaMs = hasta ? new Date(`${hasta}T23:59:59.999Z`).getTime() : Infinity;

    const inSupabaseGeneral = new Set(
      (supabaseData ?? []).map((r: any) => `${r.classsessionid}:${r.studentmatricula}`)
    );

    const filteredJsonStudents = db.students.filter((s) => {
      if (!s.registeredAt) return !desde && !hasta;
      const t = new Date(s.registeredAt).getTime();
      return t >= desdeMs && t <= hastaMs;
    });

    // Fetch ClassSession info for unique classIds from JSON students not already in Supabase
    const jsonStudentsNew = filteredJsonStudents.filter(
      (s) => !inSupabaseGeneral.has(`${s.classId}:${s.id}`)
    );
    const uniqueClassIds = [...new Set(jsonStudentsNew.map((s) => s.classId).filter(Boolean))];

    let csMap: Record<string, any> = {};
    if (uniqueClassIds.length > 0) {
      const { data: csData } = await supabase
        .from('ClassSession')
        .select('id, subject, starttime, endtime, dayofweek, Laboratory(name)')
        .in('id', uniqueClassIds.map(Number));
      (csData ?? []).forEach((c: any) => { csMap[String(c.id)] = c; });
    }

    const jsonFilas = jsonStudentsNew.map((s) => {
      const cs = csMap[String(s.classId)];
      return [
        cs?.subject ?? '-',
        (cs?.Laboratory as any)?.name ?? '-',
        DIA_MAP[cs?.dayofweek] ?? '-',
        cs ? `${cs.starttime?.slice(0, 5)} - ${cs.endtime?.slice(0, 5)}` : '-',
        s.id,
        s.name,
        STATUS_MAP[s.status ?? 'normal'] ?? s.status,
        s.registeredAt ? new Date(s.registeredAt).toLocaleString('es-MX') : '-',
      ];
    });

    const encabezado: any[][] = [
      ['SAIL - Reporte General de Asistencia'],
      ...(desde && hasta ? [['Período:', `${desde}  →  ${hasta}`]] : []),
      ['Exportado:', new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })],
      [],
      ['Clase', 'Laboratorio', 'Día', 'Horario', 'Matrícula', 'Nombre', 'Estado', 'Fecha de Registro'],
    ];

    const supabaseFilas = (supabaseData ?? []).map((r: any) => {
      const cs = r.ClassSession;
      return [
        cs?.subject ?? '-',
        cs?.Laboratory?.name ?? '-',
        DIA_MAP[cs?.dayofweek] ?? '-',
        cs ? `${cs.starttime?.slice(0, 5)} - ${cs.endtime?.slice(0, 5)}` : '-',
        r.studentmatricula,
        r.studentname,
        STATUS_MAP[r.status] ?? r.status,
        r.attendancedate ? new Date(r.attendancedate).toLocaleString('es-MX') : '-',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([...encabezado, ...supabaseFilas, ...jsonFilas]);
    ws['!cols'] = [
      { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
      { wch: 16 }, { wch: 38 }, { wch: 12 }, { wch: 26 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte General');
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const slug = classId
    ? `clase-${classId.slice(0, 8)}`
    : `${desde ?? 'todo'}-${hasta ?? 'fin'}`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="asistencia-${slug}.xlsx"`,
    },
  });
}
