import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

// Maneja la solicitud GET para obtener el secreto de un laboratorio
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const labId = searchParams.get('labId');

  if (!labId) {
    return NextResponse.json({ error: 'Falta el parámetro labId' }, { status: 400 });
  }

  // Obtener el secreto del laboratorio desde la tabla LabSecretos
  const { data: secretData, error: secretError } = await supabase
    .from('LabSecretos')
    .select('secreto')
    .eq('idLaboratory', labId)
    .single();

  if (secretError || !secretData) {
    return NextResponse.json({ error: 'Laboratorio o secreto no encontrado' }, { status: 404 });
  }

  // Obtener el nombre del laboratorio desde la tabla Laboratory (asumiendo que existe) para extraer la letra
  const { data: labData, error: labError } = await supabase
    .from('Laboratory')
    .select('name')
    .eq('id', labId)
    .single();

  if (labError || !labData) {
    return NextResponse.json({ error: 'Información del laboratorio no encontrada' }, { status: 404 });
  }

  // Mapeamos el ID del laboratorio a una letra (1 -> a, 2 -> b, etc.)
  const letterIndex = Number(labId);
  const letter = (!isNaN(letterIndex) && letterIndex > 0 && letterIndex <= 26) 
    ? String.fromCharCode(96 + letterIndex) 
    : 'a';

  return NextResponse.json({ 
    secreto: secretData.secreto, 
    letter 
  });
}

// Maneja la solicitud POST para crear o actualizar (upsert) un secreto de laboratorio
export async function POST(request: Request) {
  try {
    const { idLaboratory, secreto } = await request.json();

    if (!idLaboratory || !secreto) {
      return NextResponse.json({ error: 'Se requieren idLaboratory y secreto' }, { status: 400 });
    }

    // Insertar o actualizar el registro en la tabla LabSecretos
    const { data, error } = await supabase
      .from('LabSecretos')
      .upsert({ idLaboratory, secreto }, { onConflict: 'idLaboratory' })
      .select();

    if (error) {
      console.error('Error al hacer upsert del secreto:', error);
      return NextResponse.json({ error: 'Error al guardar el secreto' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error en POST /api/labSecrets:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
