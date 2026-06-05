// lib/db.ts
import fs from 'fs/promises';
import path from 'path';

export interface CodeEntry {
  code: string;
  expiresAt?: string | null;
}

// Ruta absoluta a nuestro json sustito de base de datos
const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

// Estructura de nuestro archivo JSON (solo codigos QR por laboratorio)
interface DatabaseSchema {
  activeCodes: Record<string, CodeEntry | null>;
}

type LegacyDatabaseSchema = DatabaseSchema & {
  activeCode?: string | null;
  activeCodes?: Record<string, string | CodeEntry | null>;
  students?: unknown;
};

// Inicializa el archivo si no existe
async function initDB() {
  try {
    await fs.access(DB_PATH);
  } catch {
    // Si falla, es porque el archivo no existe o no hay carpeta 'data'
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    const initialData: DatabaseSchema = { activeCodes: {} };
    await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

function normalizeDB(raw: LegacyDatabaseSchema): { normalized: DatabaseSchema; changed: boolean } {
  let changed = false;

  const normalized: DatabaseSchema = {
    activeCodes: {}
  };

  if (raw.activeCodes && typeof raw.activeCodes === 'object') {
    for (const [labId, value] of Object.entries(raw.activeCodes)) {
      if (!value) {
        normalized.activeCodes[labId] = null;
        continue;
      }

      if (typeof value === 'string') {
        normalized.activeCodes[labId] = { code: value, expiresAt: null };
        changed = true;
        continue;
      }

      normalized.activeCodes[labId] = value as CodeEntry;
    }
  }

  if (!raw.activeCodes && raw.activeCode !== undefined) {
    normalized.activeCodes = raw.activeCode ? { legacy: { code: raw.activeCode, expiresAt: null } } : {};
    changed = true;
  }

  if (raw.students) {
    changed = true;
  }

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