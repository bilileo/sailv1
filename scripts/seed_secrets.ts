import { createClient } from '@supabase/supabase-js';
import { generateSecret } from 'otplib';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno de Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Iniciando script de generación de secretos para laboratorios...');

  // 1. Obtener todos los laboratorios
  const { data: laboratorios, error: errorLabs } = await supabase
    .from('Laboratory')
    .select('id, name');

  if (errorLabs) {
    console.error('Error al obtener laboratorios:', errorLabs);
    return;
  }

  if (!laboratorios || laboratorios.length === 0) {
    console.log('No se encontraron laboratorios en la base de datos.');
    return;
  }

  console.log(`Se encontraron ${laboratorios.length} laboratorios. Verificando secretos...`);

  // 2. Iterar sobre cada laboratorio y asignar un secreto si no lo tiene
  for (const lab of laboratorios) {
    const { data: secretoExistente, error: errorSecreto } = await supabase
      .from('LabSecretos')
      .select('secreto')
      .eq('idLaboratory', lab.id)
      .maybeSingle();

    if (errorSecreto) {
      console.error(`Error al verificar secreto para el laboratorio ${lab.name} (ID: ${lab.id}):`, errorSecreto);
      continue;
    }

    if (secretoExistente && secretoExistente.secreto) {
      console.log(`El laboratorio ${lab.name} (ID: ${lab.id}) ya tiene un secreto. Se omite.`);
    } else {
      // Generar nuevo secreto usando otplib
      const nuevoSecreto = generateSecret();
      
      const { error: errorInsert } = await supabase
        .from('LabSecretos')
        .insert([{ idLaboratory: lab.id, secreto: nuevoSecreto }]);

      if (errorInsert) {
        console.error(`Error al guardar el secreto para el laboratorio ${lab.name} (ID: ${lab.id}):`, errorInsert);
      } else {
        console.log(`✅ Secreto generado y guardado exitosamente para el laboratorio ${lab.name} (ID: ${lab.id}).`);
      }
    }
  }

  console.log('Proceso finalizado.');
}

main();
