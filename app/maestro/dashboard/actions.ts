// app/actions.ts
'use server' // <-- Esta directiva es crucial, le dice a Next.js que esto corre en Node

import { revalidatePath } from 'next/cache';
import { supabase } from '@/app/lib/supabase';
import { redis } from '@/app/lib/redis';
import type { StudentRow, StudentStatus } from '@/app/lib/attendance-types';

type AttendanceStatus = 'PRESENT' | 'LATE' | 'LEFT_EARLY' | 'UNAUTHORIZED' | 'ABSENT';

const statusToAttendance: Record<StudentStatus, AttendanceStatus> = {
  normal: 'PRESENT',
  tarde: 'LATE',
  ausente: 'ABSENT',
  abandono: 'LEFT_EARLY'
};

const attendanceToStatus: Record<AttendanceStatus, StudentStatus> = {
  PRESENT: 'normal',
  LATE: 'tarde',
  ABSENT: 'ausente',
  LEFT_EARLY: 'abandono',
  UNAUTHORIZED: 'ausente'
};

const CODE_TTL_SECONDS = 60;

const getDayOfWeekDb = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const timeToMinutes = (time?: string | null) => {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const isClassInProgress = (dayOfWeek: number, startTime: string, endTime: string) => {
  const now = new Date();
  if (dayOfWeek !== getDayOfWeekDb(now)) return false;
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
};

const getLabCodeKey = (labId: number | string) => `lab:codigo:${labId}`;

// Guarda el código dinámico generado por el profesor
export async function updateActiveCode(labId: string, code: string | null) {
  if (!labId) return;
  const key = getLabCodeKey(labId);

  if (!code) {
    await redis.del(key);
    return;
  }

  await redis.set(key, code, { ex: CODE_TTL_SECONDS });
}

// Obtiene la lista de alumnos
export async function getStudents(classId: string): Promise<StudentRow[]> {
  const { data, error } = await supabase
    .from('Attendance')
    .select('id, studentId, status, Student ( id, name )')
    .eq('classSessionId', classId)
    .order('checkInTime', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.studentId,
    name: row.Student?.name || row.studentId,
    status: attendanceToStatus[row.status as AttendanceStatus] || 'normal'
  }));
}

// Actualiza el estado de un alumno (llegada tardía, ausente, etc.)
export async function updateStudentStatus(studentId: string, classId: string, status: StudentStatus) {
  const { error } = await supabase
    .from('Attendance')
    .update({ status: statusToAttendance[status] })
    .eq('classSessionId', classId)
    .eq('studentId', studentId);

  if (error) throw error;
  revalidatePath('/'); // Refresca la UI automáticamente
}

// Elimina a un alumno de la lista
export async function deleteStudent(studentId: string, classId: string) {
  const { error } = await supabase
    .from('Attendance')
    .delete()
    .eq('classSessionId', classId)
    .eq('studentId', studentId);

  if (error) throw error;
  revalidatePath('/');
}

// Valida un codigo activo y regresa la clase asociada
export async function validateActiveCode(code: string): Promise<string | null> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;

  const { data: labs, error: labsError } = await supabase
    .from('Laboratory')
    .select('id');

  if (labsError) throw labsError;

  const labIds = (labs || []).map((lab: any) => lab.id);
  if (labIds.length === 0) return null;

  const codes = await Promise.all(
    labIds.map((labId: number) => redis.get<string>(getLabCodeKey(labId)))
  );

  const matchingLabId = labIds.find((labId: number, index: number) => {
    const storedCode = codes[index];
    return storedCode && storedCode.toUpperCase() === normalizedCode;
  });

  if (!matchingLabId) return null;

  const { data: classes, error: classError } = await supabase
    .from('ClassSession')
    .select('id, dayofweek, starttime, endtime')
    .eq('laboratoryid', matchingLabId)
    .eq('status', 'ACTIVE');

  if (classError) throw classError;

  const activeClass = (classes || []).find((session: any) =>
    isClassInProgress(session.dayofweek, session.starttime, session.endtime)
  );

  return activeClass ? String(activeClass.id) : null;
}

// Registra un alumno validando que el código siga siendo correcto
export async function registerStudent(
  studentData: { id: string; name: string; code: string; registeredAt: string; classId?: string; deviceType?: string }
) {
  const classId = studentData.classId || (studentData.code ? await validateActiveCode(studentData.code) : null);
  if (!classId) {
    return { success: false, error: 'Clase no encontrada para el codigo proporcionado.' };
  }

  const { data: student, error: studentError } = await supabase
    .from('Student')
    .select('id')
    .eq('id', studentData.id)
    .maybeSingle();

  if (studentError) throw studentError;
  if (!student) {
    return { success: false, error: 'El alumno no existe en la tabla Student.' };
  }

  const { data: classSession, error: classError } = await supabase
    .from('ClassSession')
    .select('teacherid')
    .eq('id', classId)
    .maybeSingle();

  if (classError) throw classError;
  if (!classSession?.teacherid) {
    return { success: false, error: 'No se pudo determinar el maestro de la clase.' };
  }

  const { data: existingAttendance, error: attendanceQueryError } = await supabase
    .from('Attendance')
    .select('id')
    .eq('classSessionId', classId)
    .eq('studentId', studentData.id)
    .maybeSingle();

  if (attendanceQueryError) throw attendanceQueryError;

  const payload = {
    classSessionId: Number(classId),
    teacherId: classSession.teacherid,
    studentId: studentData.id,
    registrationCode: studentData.code,
    deviceType: studentData.deviceType || 'Propio',
    status: 'PRESENT' as AttendanceStatus
  };

  if (existingAttendance?.id) {
    const { error } = await supabase
      .from('Attendance')
      .update(payload)
      .eq('id', existingAttendance.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('Attendance')
      .insert([payload]);

    if (error) throw error;
  }

  revalidatePath('/maestro/dashboard'); // Actualiza el panel del maestro automáticamente
  return { success: true };
}