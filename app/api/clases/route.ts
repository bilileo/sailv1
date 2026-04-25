import { NextResponse } from 'next/server';
import sql from 'mssql';
import crypto from 'crypto';

const dbConfig = {
  user: 'sa', 
  password: 'admin123', // <--- No olvides poner tu contraseña aquí
  server: 'localhost',
  database: 'SAIL_DB',
  options: { encrypt: false, trustServerCertificate: true }
};

export async function GET() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT 
        c.id, 
        c.subjectName as nombre, 
        l.name as laboratorio,
        -- Obtenemos la fecha exacta sin conversiones extrañas
        FORMAT(c.startTime, 'yyyy-MM-ddTHH:mm:ss') as startTime,
        CAST(DATEPART(HOUR, c.startTime) AS VARCHAR) + ':00- ' + 
        CASE 
          WHEN DATEPART(HOUR, c.estimatedEndTime) = 0 THEN '24:00'
          ELSE CAST(DATEPART(HOUR, c.estimatedEndTime) AS VARCHAR) + ':00'
        END as horario
      FROM ClassSession c 
      INNER JOIN Laboratory l ON c.laboratoryId = l.id 
      WHERE c.isActive = 1
    `);
    return NextResponse.json(result.recordset);
  } catch (error) {
    return NextResponse.json({ error: 'Error en GET' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pool = await sql.connect(dbConfig);

    // 1. Obtener la fecha de hoy en UTC
    const ahora = new Date();
    const mapaDias: any = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
    
    // Calculamos cuántos días faltan o pasaron para el día seleccionado usando UTC
    const diferenciaDias = mapaDias[body.dia] - ahora.getUTCDay();
    const fechaDestino = new Date(ahora);
    fechaDestino.setUTCDate(ahora.getUTCDate() + diferenciaDias);

    // 2. Extraer la hora inicial del texto "0:00- 1:00" o "2:00- 5:00"
    const horaI = parseInt(body.horario.split('-')[0].trim().split(':')[0]);
    const duracion = body.duracion || 1; // Duración en horas (default: 1)
    const horaF = horaI + duracion;

    // 3. CONSTRUCCIÓN CON UTC EXPLÍCITO
    const yyyy = fechaDestino.getUTCFullYear();
    const mm = fechaDestino.getUTCMonth(); // 0-11
    const dd = fechaDestino.getUTCDate();
    
    const startTime = new Date(Date.UTC(yyyy, mm, dd, horaI, 0, 0));
    const endTime = new Date(Date.UTC(yyyy, mm, dd, horaF, 0, 0));

    console.log("INSERTANDO FECHAS EN UTC:", startTime.toISOString(), endTime.toISOString(), `Duración: ${duracion} horas`);

    await pool.request()
      .input('id', sql.VarChar(36), crypto.randomUUID())
      .input('labId', sql.Int, parseInt(body.laboratorioId))
      .input('maestroId', sql.VarChar(36), body.maestroId)
      .input('name', sql.NVarChar(100), body.nombre)
      .input('code', sql.VarChar(10), 'TEMP123')
      .input('start', sql.DateTime2, startTime)
      .input('end', sql.DateTime2, endTime)
      .query(`INSERT INTO ClassSession (id, laboratoryId, maestroId, subjectName, currentDynamicCode, startTime, estimatedEndTime, isActive)
              VALUES (@id, @labId, @maestroId, @name, @code, @start, @end, 1)`);
      
    return NextResponse.json({ success: true });
  } catch (error: any) { 
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}