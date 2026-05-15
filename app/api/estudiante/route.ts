import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    let query = supabase
      .from('Student')
      .select('id, name, email, createdAt')
      .order('createdAt', { ascending: false });

    if (id) query = query.eq('id', id);
    if (email) query = query.eq('email', email);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.id || !body.name || !body.email || !body.password) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    const hash = await bcrypt.hash(body.password, 10);

    const { error } = await supabase
      .from('Student')
      .insert([
        {
          id: body.id,
          name: body.name,
          email: body.email,
          password: hash
        }
      ]);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El correo o la matricula ya estan registrados' }, { status: 400 });
      }
      throw error;
    }

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

    const updatePayload: any = {
      name: body.name,
      email: body.email
    };

    if (body.password) {
      updatePayload.password = await bcrypt.hash(body.password, 10);
    }

    const { error } = await supabase
      .from('Student')
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

    if (!id) {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
    }

    const { error } = await supabase
      .from('Student')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
