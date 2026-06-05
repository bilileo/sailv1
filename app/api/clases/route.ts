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

export async function GET(request: Request) {
  try {
    const token = await getToken({ 
      req: request as any, 
      secret: process.env.NEXTAUTH_SECRET || "SAIL_Super_Secreto_Servicio_Social_2026!"
    });
    
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    let query = supabase
      .from('ClassSession')
      .select('id, teacherId, status, startTime, endTime, dayOfWeek, laboratoryId, asignaturaId, Laboratory(id, name), Asignatura(id, name, color)')
      .in('status', ['ACTIVE', 'ENDED', 'MAINTENANCE']); 

    if (token.role === 'MAESTRO') {
      query = query.eq('teacherId', token.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formattedData = data.map((c: any) => {
      const sHour = parseHour(c.startTime);
      const eHour = parseHour(c.endTime);
      if (sHour === null || eHour === null) return null;

      return {
        id: c.id,
        maestroId: c.teacherId, 
        status: c.status,
        nombre: c.Asignatura?.name || 'Sin Asignar',
        laboratorio: c.Laboratory ? c.Laboratory.name : 'Sin Asignar',
        laboratorioId: c.Laboratory?.id || c.laboratoryId,
        dayOfWeek: c.dayOfWeek,
        horario: `${sHour}:00 - ${eHour}:00`,
        color: c.Asignatura?.color || '#3B82F6'
      };
    }).filter(Boolean); 

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error("Error en GET clases:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const { error } = await supabase
      .from('ClassSession')
      .insert([{
        laboratoryId: parseInt(body.laboratorioId, 10), 
        teacherId: body.maestroId,                  
        asignaturaId,
        dayOfWeek: dayOfWeek,                       
        startTime: startTime,                       
        endTime: endTime,                           
        status: 'ACTIVE'
      }]);

    if (!error && asignaturaId && body.maestroId) {
      await supabase
        .from('Imparte')
        .upsert([{ userId: body.maestroId, asignaturaId }], { onConflict: 'userId,asignaturaId' });
    }
      
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
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
    
    const dayOfWeek = mapaDiasPostgres[body.dia] || 1;

    const horaIStr = body.horario.split('-')[0].trim();
    const horaIParsed = parseInt(horaIStr.split(':')[0]);
    const duracion = body.duracion || 1;
    const horaF = horaIParsed + duracion;
    
    const startTime = `${horaIParsed.toString().padStart(2, '0')}:00:00`;
    const endTime = `${horaF.toString().padStart(2, '0')}:00:00`;

    const { data: classSession, error: classFetchError } = await supabase
      .from('ClassSession')
      .select('asignaturaId')
      .eq('id', body.id)
      .maybeSingle();

    if (classFetchError) throw classFetchError;

    const asignaturaId = body.asignaturaId || classSession?.asignaturaId || null;

    if (asignaturaId && body.nombre) {
      const { error: asignaturaError } = await supabase
        .from('Asignatura')
        .update({
          name: body.nombre,
          color: body.color || undefined
        })
        .eq('id', asignaturaId);

      if (asignaturaError) throw asignaturaError;
    }

    const { error } = await supabase
      .from('ClassSession')
      .update({
        laboratoryId: parseInt(body.laboratorioId, 10),
        dayOfWeek: dayOfWeek,
        startTime: startTime,
        endTime: endTime,
        status: body.status || 'ACTIVE'
      })
      .eq('id', body.id);
      
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) { 
    console.error("Error en PUT:", error);
    return NextResponse.json({ error: error.message }, { status: 500 }); 
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}