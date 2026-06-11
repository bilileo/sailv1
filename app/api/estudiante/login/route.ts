import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.email || !body.password) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
    }

    const { data: student, error } = await supabase
      .from('Student')
      .select('id, name, email, password')
      .eq('email', body.email)
      .maybeSingle();

    if (error || !student) {
      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 });
    }

    const matches = await bcrypt.compare(body.password, student.password);
    if (!matches) {
      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 });
    }

    return NextResponse.json({
      id: student.id,
      name: student.name,
      email: student.email
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
