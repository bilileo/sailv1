// lib/db.ts
import fs from 'fs/promises';
import path from 'path';

// Definimos las interfaces para mantener el tipado estricto
export type StudentStatus = 'normal' | 'tarde' | 'ausente' | 'abandono';

export interface Student {
  id: string;
  name: string;
  code?: string;
  registeredAt?: string;
  status?: StudentStatus;
}

// Ruta absoluta a nuestro json sustito de base de datos
const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

// Estructura de nuestro archivo JSON
interface DatabaseSchema {
  activeCode: string | null;
  students: Student[];
}

// Inicializa el archivo si no existe
async function initDB() {
  try {
    await fs.access(DB_PATH);
  } catch {
    // Si falla, es porque el archivo no existe o no hay carpeta 'data'
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    const initialData: DatabaseSchema = { activeCode: null, students: [] };
    await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

// Función genérica para leer la base de datos
export async function readDB(): Promise<DatabaseSchema> {
  await initDB();
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

// Función genérica para escribir en la base de datos
export async function writeDB(data: DatabaseSchema): Promise<void> {
  await initDB();
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}