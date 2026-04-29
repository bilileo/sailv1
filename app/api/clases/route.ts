import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getToken } from 'next-auth/jwt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const token = await getToken({ 
      req: request as any, 
      secret: process.env.NEXTAUTH_SECRET || "SAIL_Super_Secreto_Servicio_Social_2026!"
    });
    
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    let query = supabase
      .from('ClassSession')
      .select('id, teacherid, status, subject, starttime, endtime, dayofweek, Laboratory(name)')
      .eq('status', 'ACTIVE');

    if (token.role === 'MAESTRO') {
      query = query.eq('teacherid', token.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formattedData = data.map((c: any) => {
      if (!c.starttime || !c.endtime) return null;
      
      const sHour = parseInt(c.starttime.split(':')[0]);
      const eHour = parseInt(c.endtime.split(':')[0]);

      return {
        id: c.id,
        maestroId: c.teacherid, 
        status: c.status,
        nombre: c.subject,      
        laboratorio: c.Laboratory ? c.Laboratory.name : 'Sin Asignar',
        dayOfWeek: c.dayofweek,
        horario: `${sHour}:00 - ${eHour}:00`
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
    
    const mapaDiasPostgres: any = { 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Domingo': 7 };
    const dayOfWeek = mapaDiasPostgres[body.dia] || 1;

    const horaIStr = body.horario.split('-')[0].trim();
    const horaIParsed = parseInt(horaIStr.split(':')[0]);
    const duracion = body.duracion || 1;
    const horaF = horaIParsed + duracion;
    
    const startTime = `${horaIParsed.toString().padStart(2, '0')}:00:00`;
    const endTime = `${horaF.toString().padStart(2, '0')}:00:00`;

    const { error } = await supabase
      .from('ClassSession')
      .insert([{
        laboratoryid: parseInt(body.laboratorioId), 
        teacherid: body.maestroId,                  
        subject: body.nombre,
        dayofweek: dayOfWeek,                       
        starttime: startTime,                       
        endtime: endTime,                           
        status: 'ACTIVE'
      }]);
      
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    const mapaDiasPostgres: any = { 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Domingo': 7 };
    const dayOfWeek = mapaDiasPostgres[body.dia] || 1;

    const horaIStr = body.horario.split('-')[0].trim();
    const horaIParsed = parseInt(horaIStr.split(':')[0]);
    const duracion = body.duracion || 1;
    const horaF = horaIParsed + duracion;
    
    const startTime = `${horaIParsed.toString().padStart(2, '0')}:00:00`;
    const endTime = `${horaF.toString().padStart(2, '0')}:00:00`;

    const { error } = await supabase
      .from('ClassSession')
      .update({
        laboratoryid: parseInt(body.laboratorioId),
        subject: body.nombre,
        dayofweek: dayOfWeek,
        starttime: startTime,
        endtime: endTime,
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

    await supabase.from('Attendance').delete().eq('classsessionid', id);
    await supabase.from('Incident').delete().eq('classsessionid', id);
    
    const { error } = await supabase.from('ClassSession').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}