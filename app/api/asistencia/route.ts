import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classSessionId = searchParams.get('classSessionId');
    const userId = searchParams.get('userId');

    let query = supabase
      .from('Attendance')
      .select(`
        id, classsessionid, userid, attendancedate, status, authcode, createdat,
        ClassSession ( subject, Laboratory ( name ) ),
        User ( name )
      `)
      .order('attendancedate', { ascending: false });

    if (classSessionId) query = query.eq('classsessionid', classSessionId);
    if (userId) query = query.eq('userid', userId);

    const { data, error } = await query;
    if (error) throw error;

    const formattedData = data.map((a: any) => ({
      id: a.id,
      classSessionId: a.classsessionid,
      userId: a.userid,
      attendanceDate: a.attendancedate,
      status: a.status,
      authCode: a.authcode,
      createdAt: a.createdat,
      clase: a.ClassSession?.subject,
      laboratorio: a.ClassSession?.Laboratory?.name,
      alumno: a.User?.name
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const payload: any = {
      classsessionid: body.classSessionId,
      userid: body.userId,
      status: body.status || 'PRESENT'
    };

    if (body.attendanceDate) payload.attendancedate = body.attendanceDate;
    if (body.authCode) payload.authcode = body.authCode;

    const { error } = await supabase
      .from('Attendance')
      .insert([payload]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
    }

    const updatePayload: any = {};
    if (body.classSessionId) updatePayload.classsessionid = body.classSessionId;
    if (body.userId) updatePayload.userid = body.userId;
    if (body.status) updatePayload.status = body.status;
    if (body.attendanceDate) updatePayload.attendancedate = body.attendanceDate;
    if (body.authCode !== undefined) updatePayload.authcode = body.authCode;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Sin datos para actualizar' }, { status: 400 });
    }

    const { error } = await supabase
      .from('Attendance')
      .update(updatePayload)
      .eq('id', body.id);

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

    const { error } = await supabase.from('Attendance').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
