import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Inicializar el cliente de Supabase
// Usamos el service role key en el backend (si está disponible) para tener acceso total a las tablas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    
    // Construimos la consulta
    let query = supabase.from('User').select('id, name, email, role');
    
    if (role) {
      query = query.eq('role', role);
    }
      
    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const hash = await bcrypt.hash(data.password, 10);

    const { error } = await supabase
      .from('User')
      .insert([
        { 
          // Eliminamos la línea donde se mandaba el "id"
          name: data.name, 
          email: data.email, 
          role: data.role, 
          password: hash // Asegúrate de usar 'password' como dice tu esquema SQL, no 'passwordHash'
        }
      ]);

    if (error) {
      // 23505 es el código de PostgreSQL para una violación de clave única (Unique Violation)
      if (error.code === '23505') {
         return NextResponse.json({ error: 'El correo ya está registrado' }, { status: 400 });
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
    const data = await request.json();
    
    const updatePayload: any = {
      name: data.name,
      email: data.email
    };

    // Si mandó contraseña nueva, la actualizamos también
    if (data.password) {
      const hash = await bcrypt.hash(data.password, 10);
      updatePayload.passwordHash = hash;
    }

    const { error } = await supabase
      .from('User')
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
    
    if (!id) throw new Error('ID no proporcionado');

    const { error } = await supabase
      .from('User')
      .delete()
      .eq('id', id);
      
    if (error) {
      // 23503 es el código de PostgreSQL para una violación de llave foránea (Foreign Key Violation)
      if (error.code === '23503') {
        return NextResponse.json({ error: 'No se puede eliminar porque tiene clases asignadas.' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}