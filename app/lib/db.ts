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
  classId?: string;
}

// Ruta absoluta a nuestro json sustito de base de datos
const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

// Estructura de nuestro archivo JSON
interface DatabaseSchema {
  activeCodes: Record<string, string | null>;
  students: Student[];
}

type LegacyDatabaseSchema = DatabaseSchema & {
  activeCode?: string | null;
};

// Inicializa el archivo si no existe
async function initDB() {
  try {
    await fs.access(DB_PATH);
  } catch {
    // Si falla, es porque el archivo no existe o no hay carpeta 'data'
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    const initialData: DatabaseSchema = { activeCodes: {}, students: [] };
    await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

function normalizeDB(raw: LegacyDatabaseSchema): { normalized: DatabaseSchema; changed: boolean } {
  let changed = false;

  const normalized: DatabaseSchema = {
    activeCodes: raw.activeCodes ?? {},
    students: Array.isArray(raw.students) ? raw.students : []
  };

  if (!raw.activeCodes && raw.activeCode !== undefined) {
    normalized.activeCodes = raw.activeCode ? { legacy: raw.activeCode } : {};
    changed = true;
  }

  const mappedStudents = normalized.students.map((student) => {
    if (!student.classId) {
      changed = true;
      return { ...student, classId: 'legacy' };
    }
    return student;
  });

  normalized.students = mappedStudents;

  return { normalized, changed };
}

// Función genérica para leer la base de datos
export async function readDB(): Promise<DatabaseSchema> {
  await initDB();
  const data = await fs.readFile(DB_PATH, 'utf-8');
  const parsed = JSON.parse(data) as LegacyDatabaseSchema;
  const { normalized, changed } = normalizeDB(parsed);
  if (changed) {
    await fs.writeFile(DB_PATH, JSON.stringify(normalized, null, 2));
  }
  return normalized;
}

// Función genérica para escribir en la base de datos
export async function writeDB(data: DatabaseSchema): Promise<void> {
  await initDB();
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}