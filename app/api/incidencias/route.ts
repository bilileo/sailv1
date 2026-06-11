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

    const formattedData = data.map((i) => {
      const row = i as Record<string, unknown>;
      return {
        id: row['id'],
        title: row['title'],
        message: row['description'],
        status: row['status'],
        createdAt: row['createdAt'],
        classSessionId: row['classSessionId'],
        reportedById: row['reportedById'],
        clase: ((row['ClassSession'] as Record<string, unknown> | undefined)?.['Asignatura'] as Record<string, unknown> | undefined)?.['name'],
        laboratorio: (row['Laboratory'] as Record<string, unknown> | undefined)?.['name'] || ((row['ClassSession'] as Record<string, unknown> | undefined)?.['Laboratory'] as Record<string, unknown> | undefined)?.['name'],
        reportador: (row['User'] as Record<string, unknown> | undefined)?.['name']
      };
    });

    return NextResponse.json(formattedData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    
    let updatePayload: Record<string, unknown> = {};
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}