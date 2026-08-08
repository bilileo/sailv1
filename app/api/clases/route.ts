import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getToken } from 'next-auth/jwt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const mapaDiasPostgres: Record<string, number> = {
  'Lunes': 1,
  'Martes': 2,
  'Miércoles': 3,
  'Jueves': 4,
  'Viernes': 5,
  'Sábado': 6,
  'Domingo': 7
};

const parseHour = (timeValue?: string | null) => {
  if (!timeValue) return null;
  const [hour] = timeValue.split(':');
  const parsed = parseInt(hour, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const toMateriaCode = (name: string) => {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base || 'ASIG'}-${suffix}`.slice(0, 30);
};

const resolveAsignaturaId = async (name: string, color?: string | null) => {
  const { data: existing, error } = await supabase
    .from('Asignatura')
    .select('id, color')
    .eq('name', name)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (existing?.id) {
    if (color && existing.color !== color) {
      const { error: updateError } = await supabase
        .from('Asignatura')
        .update({ color })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    }
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from('Asignatura')
    .insert([
      {
        name,
        materiaCode: toMateriaCode(name),
        color: color || '#3B82F6'
      }
    ])
    .select('id')
    .maybeSingle();

  if (insertError) throw insertError;
  return created?.id;
};

function generarFechasDeClase(fechaInicio: string, fechaFin: string, dayOfWeek: number) {
  const fechas = [];
  let actual = new Date(fechaInicio + 'T00:00:00');
  const limite = new Date(fechaFin + 'T23:59:59');
  const inicio = new Date(fechaInicio + 'T00:00:00');

  const jsDay = dayOfWeek === 7 ? 0 : dayOfWeek;

  while (actual.getDay() !== jsDay) {
    actual.setDate(actual.getDate() + 1);
  }

  while (actual <= limite) {
    const diffTime = Math.abs(actual.getTime() - inicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const semana = Math.floor(diffDays / 7) + 1;

    fechas.push({
      fecha: actual.toISOString().split('T')[0],
      semana: semana
    });

    actual.setDate(actual.getDate() + 7);
  }

  return fechas;
}

export async function GET(request: Request) {
  try {
    const token = (await getToken({
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET || "SAIL_Super_Secreto_Servicio_Social_2026!"
    })) as { role?: string, id?: string } | null;

    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const urlPeriodoId = searchParams.get('periodoId');
    const urlSemana = searchParams.get('semana');

    let finalPeriodoId = urlPeriodoId ? parseInt(urlPeriodoId, 10) : null;

   if (!finalPeriodoId) {
      const { data: periodoActivo } = await supabase
        .from('Periodo')
        .select('id, fechaInicio')
        .eq('activo', true)
        .single();

      finalPeriodoId = periodoActivo?.id || null;
    }

    if (!finalPeriodoId) {
      return NextResponse.json({ error: 'No hay periodo válido configurado' }, { status: 404 });
    }

    let query = supabase
      .from('ClassSession')
      .select(`
        id, teacherId, status, startTime, endTime, dayOfWeek, laboratoryId, grupoId, asignaturaId, tipoSession,
        Laboratory(id, name),
        Asignatura(id, name, color),
        descripcion,
        Grupo(id, nombre),
        ClassLog(estadoAuditoria, semana),
        ClassDate(fechaClase)
      `)
      .in('status', ['ACTIVE', 'ENDED', 'MAINTENANCE'])
      .eq('periodoId', finalPeriodoId);

    if (token.role === 'MAESTRO') {
      query = query.eq('teacherId', token.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const { data: pData } = await supabase.from('Periodo').select('fechaInicio').eq('id', finalPeriodoId).single();
    let targetSemana = 1;
    let startStr = '';
    let endStr = '';

    if (pData?.fechaInicio) {
      const inicio = new Date(pData.fechaInicio + 'T00:00:00');
      
      if (urlSemana) {
        targetSemana = parseInt(urlSemana, 10);
      } else {
        const diffDays = Math.ceil(Math.abs(new Date().getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
        targetSemana = Math.floor(diffDays / 7) + 1;
      }

      const startOfWeek = new Date(inicio);
      startOfWeek.setDate(startOfWeek.getDate() + (targetSemana - 1) * 7);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      
      startStr = startOfWeek.toISOString().split('T')[0];
      endStr = endOfWeek.toISOString().split('T')[0];
    } else if (urlSemana) {
      targetSemana = parseInt(urlSemana, 10);
    }

    const formattedData = data.map((c) => {
      const row = c as Record<string, any>;

      // Check if ClassSession has a ClassDate in this week
      if (startStr && endStr) {
        const classDates = row['ClassDate'] as any[] | undefined;
        if (!classDates || classDates.length === 0) return null;
        const hasDateInWeek = classDates.some(d => d.fechaClase >= startStr && d.fechaClase <= endStr);
        if (!hasDateInWeek) return null;
      }
      const sHour = parseHour(String(row.startTime ?? null));
      const eHour = parseHour(String(row.endTime ?? null));
      if (sHour === null || eHour === null) return null;

      const asignatura = row['Asignatura'];
      const laboratory = row['Laboratory'];

      const logsSemana = row['ClassLog'] as any[] | undefined;
      const logEspecifico = logsSemana?.find(l => l.semana === targetSemana);

      const estadoDinamico = logEspecifico ? logEspecifico.estadoAuditoria : row['status'];

      return {
        id: row['id'],
        maestroId: row['teacherId'],
        asignaturaId: row['asignaturaId'],
        tipoSession: row['tipoSession'] || 'CLASE',
        status: estadoDinamico,
        nombre: asignatura?.['name'] || 'Sin Asignar',
        grupoId: row['grupoId'],
        laboratorio: laboratory ? laboratory['name'] : 'Sin Asignar',
        laboratorioId: laboratory?.['id'] || row['laboratoryId'],
        dayOfWeek: row['dayOfWeek'],
        descripcion: row['descripcion'],
        horario: `${sHour}:00 - ${eHour}:00`,
        color: asignatura?.['color'] || '#3B82F6'
      };
    }).filter(Boolean);

    return NextResponse.json(formattedData);
  } catch (error: unknown) {
    console.error("Error en GET clases:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

   if (!body?.nombre || !body?.laboratorioId || !body?.maestroId) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    const dayOfWeek = mapaDiasPostgres[body.dia] || 1;

    const horaIStr = body.horario.split('-')[0].trim();
    const horaIParsed = parseInt(horaIStr.split(':')[0]);
    const duracion = body.duracion || 1;
    const horaF = horaIParsed + duracion;

    const startTime = `${horaIParsed.toString().padStart(2, '0')}:00:00`;
    const endTime = `${horaF.toString().padStart(2, '0')}:00:00`;

    const asignaturaId = body.asignaturaId || (await resolveAsignaturaId(body.nombre, body.color));

    if (!asignaturaId) {
      return NextResponse.json({ error: 'No se pudo resolver la asignatura' }, { status: 400 });
    }

    const grupoId = body.grupoId ? Number(body.grupoId) : null;
    if (body.grupoId && Number.isNaN(grupoId)) {
      return NextResponse.json({ error: 'Selecciona un grupo válido' }, { status: 400 });
    }

    const { data: periodoActivo, error: errorPeriodo } = await supabase
    .from('Periodo')
    .select('id, fechaInicio, fechaFin')
    .eq('activo', true)
    .single();

    if (errorPeriodo || !periodoActivo) {
      return NextResponse.json({ error: 'Debes tener un periodo activo para crear clases' }, { status: 400 });
    }

    const { data: sessionData, error } = await supabase
      .from('ClassSession')
      .insert([{
        asignaturaId,
        dayOfWeek: dayOfWeek,
        startTime: startTime,
        endTime: endTime,
        descripcion: body.descripcion || null,
        laboratoryId: parseInt(body.laboratorioId, 10),
        teacherId: body.maestroId,
        status: 'ACTIVE',
        periodoId: periodoActivo.id,
        grupoId: grupoId,
        tipoSession: body.tipoSession || null,
      }])
      .select('id')
      .single();

    if (error) throw error;
    const sessionId = sessionData.id;

    const { data: asuetos } = await supabase
      .from('Asuetos')
      .select('fechaAsueto, fechaFinAsueto')
      .eq('periodoID', periodoActivo.id);

    let fechasParaInsertar: string[] = [];
    if (!body.repeat) {
      if (!body.fechaClase) return NextResponse.json({ error: 'Falta fechaClase para clase única' }, { status: 400 });
      fechasParaInsertar.push(body.fechaClase);
    } else {
      const allFechas = generarFechasDeClase(periodoActivo.fechaInicio, periodoActivo.fechaFin, dayOfWeek);
      fechasParaInsertar = allFechas.map(f => f.fecha);
    }

    fechasParaInsertar = fechasParaInsertar.filter(fechaStr => {
      const d = new Date(fechaStr + 'T00:00:00');
      for (const asueto of (asuetos || [])) {
        const aInicio = new Date(asueto.fechaAsueto + 'T00:00:00');
        const aFin = asueto.fechaFinAsueto ? new Date(asueto.fechaFinAsueto + 'T23:59:59') : new Date(asueto.fechaAsueto + 'T23:59:59');
        if (d >= aInicio && d <= aFin) return false;
      }
      return true;
    });

    if (fechasParaInsertar.length > 0) {
      const classDates = fechasParaInsertar.map(d => ({
        idClassSession: sessionId,
        fechaClase: d
      }));
      const { error: errorFechas } = await supabase.from('ClassDate').insert(classDates);
      if (errorFechas) throw errorFechas;
    }

    if (!error && asignaturaId && body.maestroId) {
      await supabase
        .from('Imparte')
        .upsert([{ userId: body.maestroId, asignaturaId }], { onConflict: 'userId,asignaturaId' });
    }

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (body.status && !body.horario && !body.laboratorioId && !body.nombre && !body.dia) {
      const { error } = await supabase
        .from('ClassSession')
        .update({ status: body.status })
        .eq('id', body.id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (!body?.id) {
      return NextResponse.json({ error: 'ID de sesión no proporcionado' }, { status: 400 });
    }

    if (!body?.laboratorioId || !body?.maestroId || !body?.asignaturaId || !body?.horario || !body?.dia) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para editar la sesión' }, { status: 400 });
    }

    const dayOfWeek = mapaDiasPostgres[body.dia] || 1;

    const horaIStr = body.horario.split('-')[0].trim();
    const horaIParsed = parseInt(horaIStr.split(':')[0]);
    const duracion = body.duracion || 1;
    const horaF = horaIParsed + duracion;

    const startTime = `${horaIParsed.toString().padStart(2, '0')}:00:00`;
    const endTime = `${horaF.toString().padStart(2, '0')}:00:00`;

    const asignaturaId = Number(body.asignaturaId);
    const maestroId = Number(body.maestroId);
    const grupoId = body.grupoId ? Number(body.grupoId) : null;

    if (Number.isNaN(asignaturaId)) {
      return NextResponse.json({ error: 'Selecciona una asignatura válida' }, { status: 400 });
    }

    if (Number.isNaN(maestroId)) {
      return NextResponse.json({ error: 'Selecciona un maestro válido' }, { status: 400 });
    }

    if (Number.isNaN(grupoId)) {
      return NextResponse.json({ error: 'Selecciona un grupo válido' }, { status: 400 });
    }

    const updatePayload: any = {
      laboratoryId: parseInt(body.laboratorioId, 10),
      teacherId: maestroId,
      asignaturaId,
      grupoId: grupoId,
      descripcion: body.descripcion || null,
      tipoSession: body.tipoSession || null,
      dayOfWeek: dayOfWeek,
      startTime: startTime,
      endTime: endTime,
      status: body.status || 'ACTIVE'
    };

    const { error } = await supabase
      .from('ClassSession')
      .update(updatePayload)
      .eq('id', body.id);

    if (!error && asignaturaId && maestroId) {
      await supabase
        .from('Imparte')
        .upsert([{ userId: maestroId, asignaturaId }], { onConflict: 'userId,asignaturaId' });
    }

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error en PUT:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });

    await supabase.from('Attendance').delete().eq('classSessionId', id);
    await supabase.from('Incident').delete().eq('classSessionId', id);

    const { error } = await supabase.from('ClassSession').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
