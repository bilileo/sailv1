import { NextResponse } from 'next/server';
import sql from 'mssql';

const dbConfig = {
  user: 'sa', 
  password: 'admin123',
  server: 'localhost',
  database: 'SAIL_DB',
  options: { encrypt: false, trustServerCertificate: true }
};

export async function GET() {
  try {
    const pool = await sql.connect(dbConfig);
    // Traemos todos los usuarios con rol MAESTRO
    const result = await pool.request().query(`
      SELECT id, name 
      FROM [User] 
      WHERE role = 'MAESTRO' 
      ORDER BY name
    `);
    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error SQL Maestros:", error);
    return NextResponse.json({ error: 'Error al obtener maestros' }, { status: 500 });
  }
}

