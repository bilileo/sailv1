import { NextResponse } from 'next/server';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const dbConfig = {
  user: 'sa', password: 'admin123', server: 'localhost', database: 'SAIL_DB',
  options: { encrypt: false, trustServerCertificate: true }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // Recibimos si queremos MAESTRO, ADMIN, etc.
    
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('role', sql.VarChar(50), role)
      .query('SELECT id, name, email, role FROM [User] WHERE role = @role');
      
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
    const hash = await bcrypt.hash(data.password, 10);

    await pool.request()
      .input('id', sql.VarChar(36), id)
      .input('name', sql.NVarChar(255), data.name)
      .input('email', sql.NVarChar(255), data.email)
      .input('role', sql.VarChar(50), data.role)
      .input('pass', sql.NVarChar(255), hash)
      .query('INSERT INTO [User] (id, name, email, role, passwordHash) VALUES (@id, @name, @email, @role, @pass)');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message.includes('UQ_User_email')) return NextResponse.json({ error: 'El correo ya está registrado' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const pool = await sql.connect(dbConfig);
    
    let query = 'UPDATE [User] SET name = @name, email = @email WHERE id = @id';
    const req = pool.request()
      .input('id', sql.VarChar(36), data.id)
      .input('name', sql.NVarChar(255), data.name)
      .input('email', sql.NVarChar(255), data.email);

    // Si mandó contraseña nueva, la actualizamos también
    if (data.password) {
      const hash = await bcrypt.hash(data.password, 10);
      query = 'UPDATE [User] SET name = @name, email = @email, passwordHash = @pass WHERE id = @id';
      req.input('pass', sql.NVarChar(255), hash);
    }

    await req.query(query);
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
      .query('DELETE FROM [User] WHERE id = @id');
      
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Validación de integridad referencial (QA Win)
    if (error.message.includes('REFERENCE constraint')) {
      return NextResponse.json({ error: 'No se puede eliminar porque tiene clases asignadas.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}