// app/actions.ts
'use server' // <-- Esta directiva es crucial, le dice a Next.js que esto corre en Node

import { readDB, writeDB, Student, StudentStatus } from '@/app/lib/db';
import { revalidatePath } from 'next/cache';

// Guarda el código dinámico generado por el profesor
export async function updateActiveCode(classId: string, code: string | null) {
  const db = await readDB();
  db.activeCodes[classId] = code;
  await writeDB(db);
}

// Obtiene la lista de alumnos
export async function getStudents(classId: string): Promise<Student[]> {
  const db = await readDB();
  return db.students.filter(student => student.classId === classId);
}

// Actualiza el estado de un alumno (llegada tardía, ausente, etc.)
export async function updateStudentStatus(studentId: string, classId: string, status: StudentStatus) {
  const db = await readDB();
  db.students = db.students.map(student => 
    student.id === studentId && student.classId === classId ? { ...student, status } : student
  );
  await writeDB(db);
  revalidatePath('/'); // Refresca la UI automáticamente
}

// Elimina a un alumno de la lista
export async function deleteStudent(studentId: string, classId: string) {
  const db = await readDB();
  db.students = db.students.filter(student => !(student.id === studentId && student.classId === classId));
  await writeDB(db);
  revalidatePath('/');
}

// Obtiene el código activo actual desde el JSON
export async function getActiveCode(classId: string): Promise<string | null> {
  const db = await readDB();
  return db.activeCodes[classId] || null;
}

// Valida un codigo activo y regresa la clase asociada
export async function validateActiveCode(code: string): Promise<string | null> {
  const db = await readDB();
  const entries = Object.entries(db.activeCodes);
  const found = entries.find(([, value]) => value === code);
  return found ? found[0] : null;
}

// Registra un alumno validando que el código siga siendo correcto
export async function registerStudent(
  studentData: { id: string; name: string; code: string; registeredAt: string; classId?: string }
) {
  const db = await readDB();

  const classId = studentData.classId || (studentData.code ? await validateActiveCode(studentData.code) : null);
  if (!classId) {
    return { success: false, error: 'Clase no encontrada para el codigo proporcionado.' };
  }

  // Eliminar si ya existe y agregarlo de nuevo (como en tu lógica original)
  db.students = [
    ...db.students.filter(s => !(s.id === studentData.id && s.classId === classId)),
    { ...studentData, classId, status: 'normal' }
  ];
  
  await writeDB(db);
  revalidatePath('/maestro/dashboard'); // Actualiza el panel del maestro automáticamente
  return { success: true };
}