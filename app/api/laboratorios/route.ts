import { NextResponse } from 'next/server';
import sql from 'mssql';

const dbConfig = {
  user: 'sa', 
  password: 'admin123', // <-- Recuerda poner tu password
  server: 'localhost',
  database: 'SAIL_DB',
  options: { encrypt: false, trustServerCertificate: true }
};

export async function GET() {
  try {
    const pool = await sql.connect(dbConfig);
    // Traemos todos los laboratorios ordenados alfabéticamente
    const result = await pool.request().query('SELECT id, name FROM Laboratory ORDER BY name');
    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error SQL Laboratorios:", error);
    return NextResponse.json({ error: 'Error al obtener laboratorios' }, { status: 500 });
  }
}