import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
  try {
    const { periodoId, fechaInicio, fechaFin } = await request.json();

    const { data: sesiones, error: errorSesiones } = await supabase
      .from('ClassSession')
      .select('*');

    if (errorSesiones) throw errorSesiones;

    const logs = [];
    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay(); 

      for (const sesion of sesiones) {
        if (sesion.dayOfWeek === dayOfWeek) {
          logs.push({
            classSessionId: sesion.id,
            periodoId: periodoId,
            fecha: d.toISOString().split('T')[0],
            estadoAuditoria: 'PROGRAMADA',
            semana: 1
          });
        }
      }
    }

    const { error: errorInsert } = await supabase.from('ClassLog').insert(logs);
    if (errorInsert) throw errorInsert;

    return NextResponse.json({ success: true, count: logs.length });
  } catch (error) {
    return NextResponse.json({ error: 'Error al generar bitácora' }, { status: 500 });
  }
}