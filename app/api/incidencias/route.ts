import { NextResponse } from 'next/server';
import sql from 'mssql';
import crypto from 'crypto';

const dbConfig = {
  user: 'sa', password: 'admin123', server: 'localhost', database: 'SAIL_DB',
  options: { encrypt: false, trustServerCertificate: true }
};

export async function GET() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT 
        i.id, i.message, i.status, i.createdAt, 
        i.classSessionId, i.reportedById, 
        c.subjectName as clase, 
        l.name as laboratorio,
        u.name as reportador
      FROM Incident i
      INNER JOIN ClassSession c ON i.classSessionId = c.id
      INNER JOIN Laboratory l ON c.laboratoryId = l.id
      INNER JOIN [User] u ON i.reportedById = u.id
      ORDER BY 
        CASE WHEN i.status = 'PENDING' THEN 1 ELSE 2 END, 
        i.createdAt DESC
    `);
    return NextResponse.json(result.recordset);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const pool = await sql.connect(dbConfig);
    const id = crypto.randomUUID();

    await pool.request()
      .input('id', sql.VarChar(36), id)
      .input('classSessionId', sql.VarChar(36), data.classSessionId)
      .input('reportedById', sql.VarChar(36), data.reportedById)
      .input('message', sql.NVarChar(sql.MAX), data.message)
      .query('INSERT INTO Incident (id, classSessionId, reportedById, message) VALUES (@id, @classSessionId, @reportedById, @message)');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const pool = await sql.connect(dbConfig);

    if (data.status) {
      // Marcar como resuelto
      await pool.request()
        .input('id', sql.VarChar(36), data.id)
        .input('status', sql.VarChar(50), data.status)
        .query('UPDATE Incident SET status = @status WHERE id = @id');
    } else {
      // Editar el texto/clase de la falla
      await pool.request()
        .input('id', sql.VarChar(36), data.id)
        .input('classSessionId', sql.VarChar(36), data.classSessionId)
        .input('message', sql.NVarChar(sql.MAX), data.message)
        .query('UPDATE Incident SET classSessionId = @classSessionId, message = @message WHERE id = @id');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const pool = await sql.connect(dbConfig);
    
    await pool.request()
      .input('id', sql.VarChar(36), id)
      .query('DELETE FROM Incident WHERE id = @id');
      
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}