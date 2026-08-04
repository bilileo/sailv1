import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idGrupo = searchParams.get('idGrupo');
    const idAsignatura = searchParams.get('idAsignatura');

    let query = supabase.from('Llevan').select('*');

    if (idGrupo) {
      query = query.eq('idGrupo', idGrupo);
    }
    if (idAsignatura) {
      query = query.eq('idAsignatura', idAsignatura);
    }

    const { data, error } = await query;

    if (error) {
      return new NextResponse(error.message, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}

// Maneja la petición POST para sincronizar relaciones grupo-asignatura en la tabla Llevan
export async function POST(request: Request) {
  try {
    const { idGrupo, idsAsignatura } = await request.json();

    if (!idGrupo || !Array.isArray(idsAsignatura)) {
      return new NextResponse('Bad data: idGrupo and an array of idsAsignatura are required', { status: 400 });
    }

    // Primero eliminamos las relaciones existentes para este grupo
    const { error: deleteError } = await supabase.from('Llevan').delete().eq('idGrupo', idGrupo);
    if (deleteError) {
      return new NextResponse(deleteError.message, { status: 500 });
    }

    // Luego insertamos las nuevas (si las hay)
    if (idsAsignatura.length > 0) {
      const insertData = idsAsignatura.map(id => ({ idGrupo, idAsignatura: id }));
      const { error: insertError } = await supabase.from('Llevan').insert(insertData);

      if (insertError) {
        return new NextResponse(insertError.message, { status: 500 });
      }
    }

    return new NextResponse(null, { status: 201 });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}
