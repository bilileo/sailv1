import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classSessionId = searchParams.get('classSessionId');
    const studentId = searchParams.get('studentId');
    const teacherId = searchParams.get('teacherId');

    let query = supabase
      .from('Attendance')
      .select(`
        id,
        classSessionId,
        teacherId,
        studentId,
        registrationCode,
        deviceType,
        status,
        checkInTime,
        checkOutTime,
        Student ( name, email ),
        ClassSession ( subject, Laboratory ( name ) )
      `)
      .order('checkInTime', { ascending: false });

    if (classSessionId) query = query.eq('classSessionId', classSessionId);
    if (studentId) query = query.eq('studentId', studentId);
    if (teacherId) query = query.eq('teacherId', teacherId);

    const { data, error } = await query;
    if (error) throw error;

    const formattedData = (data || []).map((a: any) => ({
      id: a.id,
      classSessionId: a.classSessionId,
      teacherId: a.teacherId,
      studentId: a.studentId,
      registrationCode: a.registrationCode,
      deviceType: a.deviceType,
      status: a.status,
      checkInTime: a.checkInTime,
      checkOutTime: a.checkOutTime,
      alumno: a.Student?.name,
      email: a.Student?.email,
      clase: a.ClassSession?.subject,
      laboratorio: a.ClassSession?.Laboratory?.name
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
      classSessionId: body.classSessionId,
      teacherId: body.teacherId,
      studentId: body.studentId,
      registrationCode: body.registrationCode,
      deviceType: body.deviceType,
      status: body.status || 'PRESENT',
      checkInTime: body.checkInTime,
      checkOutTime: body.checkOutTime
    };

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
    if (body.classSessionId) updatePayload.classSessionId = body.classSessionId;
    if (body.teacherId) updatePayload.teacherId = body.teacherId;
    if (body.studentId) updatePayload.studentId = body.studentId;
    if (body.status) updatePayload.status = body.status;
    if (body.registrationCode !== undefined) updatePayload.registrationCode = body.registrationCode;
    if (body.deviceType) updatePayload.deviceType = body.deviceType;
    if (body.checkInTime !== undefined) updatePayload.checkInTime = body.checkInTime;
    if (body.checkOutTime !== undefined) updatePayload.checkOutTime = body.checkOutTime;

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
