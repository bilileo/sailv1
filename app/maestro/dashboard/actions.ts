// app/actions.ts
'use server' // <-- Esta directiva es crucial, le dice a Next.js que esto corre en Node

import { revalidatePath } from 'next/cache';
import { supabase } from '@/app/lib/supabase';
import { readDB, writeDB } from '@/app/lib/db';
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

const getLabCodeKey = (labId: number | string) => String(labId);

const isExpired = (expiresAt?: string | null) => {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt).getTime();
  return Number.isNaN(expires) ? false : expires <= Date.now();
};

const resolveDeviceTypeId = async (name: string) => {
  const normalized = name.trim();
  if (!normalized) return null;

  const { data: existing, error } = await supabase
    .from('DeviceType')
    .select('id')
    .eq('name', normalized)
    .maybeSingle();

  if (error) throw error;
  if (existing?.id) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from('DeviceType')
    .insert([{ name: normalized }])
    .select('id')
    .maybeSingle();

  if (insertError) throw insertError;
  return created?.id || null;
};

// Guarda el código dinámico generado por el profesor
export async function updateActiveCode(labId: string, code: string | null) {
  if (!labId) return;
  const key = getLabCodeKey(labId);
  const db = await readDB();

  if (!code) {
    db.activeCodes[key] = null;
    await writeDB(db);
    return;
  }

  db.activeCodes[key] = {
    code,
    expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString()
  };

  await writeDB(db);
}

// Obtiene la lista de alumnos
export async function getStudents(classId: string): Promise<StudentRow[]> {
  const { data, error } = await supabase
    .from('Attendance')
    .select('id, studentId, status, Student ( id, name )')
    .eq('classSessionId', classId)
    .order('checkInTime', { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => {
    // Supabase standard join can return an array or object depending on schema
    const r = row as { 
      studentId: string; 
      Student: { id: string; name: string } | { id: string; name: string }[] | null; 
      status: string 
    };
    
    let studentData: { id: string; name: string } | null = null;
    if (r.Student) {
      studentData = Array.isArray(r.Student) ? r.Student[0] : r.Student;
    }

    return {
      id: r.studentId,
      name: studentData?.name || r.studentId,
      status: attendanceToStatus[r.status as AttendanceStatus] || 'normal'
    };
  });
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

  const labIds = (labs || []).map((lab) => (lab as { id: number }).id);
  if (labIds.length === 0) return null;

  const db = await readDB();
  let changed = false;

  const matchingLabId = labIds.find((labId: number) => {
    const entry = db.activeCodes[getLabCodeKey(labId)];
    if (!entry) return false;
    if (isExpired(entry.expiresAt)) {
      db.activeCodes[getLabCodeKey(labId)] = null;
      changed = true;
      return false;
    }
    return entry.code.toUpperCase() === normalizedCode;
  });

  if (changed) {
    await writeDB(db);
  }

  if (!matchingLabId) return null;

  const { data: classes, error: classError } = await supabase
    .from('ClassSession')
    .select('id, "dayOfWeek", "startTime", "endTime"')
    .eq('laboratoryId', matchingLabId)
    .eq('status', 'ACTIVE');

  if (classError) throw classError;

  const activeClass = (classes || []).find((session) => {
    const s = session as { dayOfWeek: number; startTime: string; endTime: string; id: number };
    return isClassInProgress(s.dayOfWeek, s.startTime, s.endTime);
  });

  return activeClass ? String((activeClass as { id: number }).id) : null;
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
    .select('teacherId')
    .eq('id', classId)
    .maybeSingle();

  if (classError) throw classError;
  if (!classSession?.teacherId) {
    return { success: false, error: 'No se pudo determinar el maestro de la clase.' };
  }

  const { data: existingAttendance, error: attendanceQueryError } = await supabase
    .from('Attendance')
    .select('id')
    .eq('classSessionId', classId)
    .eq('studentId', studentData.id)
    .maybeSingle();

  if (attendanceQueryError) throw attendanceQueryError;

  const deviceTypeName = studentData.deviceType || 'Propio';
  const deviceTypeId = await resolveDeviceTypeId(deviceTypeName);

  if (!deviceTypeId) {
    return { success: false, error: 'No se pudo determinar el tipo de dispositivo.' };
  }

  const payload = {
    classSessionId: Number(classId),
    teacherId: classSession.teacherId,
    studentId: studentData.id,
    registrationCode: studentData.code,
    deviceTypeId,
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