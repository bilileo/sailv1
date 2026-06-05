import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('Incident')
      .select(`
        id, title, description, status, "createdAt", "classSessionId", "reportedById", "laboratoryId",
        ClassSession ( Asignatura ( name ), Laboratory ( name ) ),
        Laboratory ( name ),
        User ( name )
      `)
      .order('status', { ascending: false })
      .order('createdAt', { ascending: false });

    if (error) throw error;

    const formattedData = data.map((i: any) => ({
      id: i.id,
      title: i.title,
      message: i.description,
      status: i.status,
      createdAt: i.createdAt,
      classSessionId: i.classSessionId,
      reportedById: i.reportedById,
      clase: i.ClassSession?.Asignatura?.name,
      laboratorio: i.Laboratory?.name || i.ClassSession?.Laboratory?.name,
      reportador: i.User?.name
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    let laboratoryId = data.laboratoryId || null;
    if (!laboratoryId && data.classSessionId) {
      const { data: classSession, error: classError } = await supabase
        .from('ClassSession')
        .select('laboratoryId')
        .eq('id', data.classSessionId)
        .maybeSingle();
      if (classError) throw classError;
      laboratoryId = classSession?.laboratoryId || null;
    }

    const { error } = await supabase
      .from('Incident')
      .insert([{
        classSessionId: data.classSessionId,
        reportedById: data.reportedById,
        laboratoryId,
        title: data.title || 'Incidencia Reportada',
        description: data.message,
        status: 'PENDING'
      }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    
    let updatePayload: any = {};
    if (data.status) {
      updatePayload = { status: data.status };
      if (data.status === 'RESOLVED') {
        updatePayload.resolvedAt = new Date().toISOString();
      }
    } else {
      let laboratoryId = data.laboratoryId || null;
      if (!laboratoryId && data.classSessionId) {
        const { data: classSession, error: classError } = await supabase
          .from('ClassSession')
          .select('laboratoryId')
          .eq('id', data.classSessionId)
          .maybeSingle();
        if (classError) throw classError;
        laboratoryId = classSession?.laboratoryId || null;
      }

      updatePayload = { 
        classSessionId: data.classSessionId, 
        laboratoryId,
        title: data.title || 'Incidencia Actualizada',
        description: data.message 
      };
    }

    const { error } = await supabase
      .from('Incident')
      .update(updatePayload)
      .eq('id', data.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });

    const { error } = await supabase.from('Incident').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}