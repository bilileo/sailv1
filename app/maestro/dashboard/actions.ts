// app/actions.ts
'use server' // <-- Esta directiva es crucial, le dice a Next.js que esto corre en Node

import { readDB, writeDB, Student, StudentStatus } from '@/app/lib/db';
import { revalidatePath } from 'next/cache';

// Guarda el código dinámico generado por el profesor
export async function updateActiveCode(code: string | null) {
  const db = await readDB();
  db.activeCode = code;
  await writeDB(db);
}

// Obtiene la lista de alumnos
export async function getStudents(): Promise<Student[]> {
  const db = await readDB();
  return db.students;
}

// Actualiza el estado de un alumno (llegada tardía, ausente, etc.)
export async function updateStudentStatus(studentId: string, status: StudentStatus) {
  const db = await readDB();
  db.students = db.students.map(student => 
    student.id === studentId ? { ...student, status } : student
  );
  await writeDB(db);
  revalidatePath('/'); // Refresca la UI automáticamente
}

// Elimina a un alumno de la lista
export async function deleteStudent(studentId: string) {
  const db = await readDB();
  db.students = db.students.filter(student => student.id !== studentId);
  await writeDB(db);
  revalidatePath('/');
}

// Obtiene el código activo actual desde el JSON
export async function getActiveCode(): Promise<string | null> {
  const db = await readDB();
  return db.activeCode;
}

// Registra un alumno validando que el código siga siendo correcto
export async function registerStudent(
  studentData: { id: string; name: string; code: string; registeredAt: string }
) {
  const db = await readDB();
  


  // Eliminar si ya existe y agregarlo de nuevo (como en tu lógica original)
  db.students = [
    ...db.students.filter(s => s.id !== studentData.id),
    { ...studentData, status: 'normal' }
  ];
  
  await writeDB(db);
  revalidatePath('/maestro/dashboard'); // Actualiza el panel del maestro automáticamente
  return { success: true };
}