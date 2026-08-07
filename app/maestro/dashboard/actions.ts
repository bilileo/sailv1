// app/actions.ts
'use server' // <-- Esta directiva es crucial, le dice a Next.js que esto corre en Node

import { revalidatePath } from 'next/cache';
import { supabase } from '@/app/lib/supabase';
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

const resolveDeviceTypeId = async (name: string) => {
  const normalized = name.trim();
  if (!normalized) return null;

  const { data: existing, error } = await supabase
    .from('DeviceType')
    .select('id')
    .eq('name', normalized)
    .maybeSingle();

  if (error) throw error;

  if (existing?.id !== undefined && existing?.id !== null) {
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from('DeviceType')
    .insert([{ name: normalized }])
    .select('id')
    .maybeSingle();

  if (insertError) throw insertError;
  return created?.id ?? null;
};

const resolveDeviceTypeIdFromValue = async (deviceTypeId?: number | string | null, deviceTypeName?: string) => {
  if (deviceTypeId !== undefined && deviceTypeId !== null && deviceTypeId !== '') {
    const parsed = Number(deviceTypeId);

    if (Number.isNaN(parsed)) {
      return null;
    }

    return parsed;
  }

  return resolveDeviceTypeId(deviceTypeName || 'Propio');
};

const normalizeSeatDeviceTypeId = (seatDeviceTypeId?: number | string | null) => {
  if (seatDeviceTypeId === undefined || seatDeviceTypeId === null || seatDeviceTypeId === '') {
    return null;
  }

  const parsed = Number(seatDeviceTypeId);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
};



// Obtiene la lista de alumnos
export async function getStudents(classId: string, providedDate?: string | null): Promise<StudentRow[]> {
  const hoy = providedDate || new Date().toISOString().split('T')[0];
  const { data: classDate } = await supabase
    .from('ClassDate')
    .select('id')
    .eq('idClassSession', classId)
    .eq('fechaClase', hoy)
    .maybeSingle();

  let query = supabase
    .from('Attendance')
    .select('id, studentId, status, observaciones, deviceTypeId, seatDeviceTypeId, Student ( id, name )')
    .eq('classSessionId', classId);

  if (classDate?.id) {
    query = query.eq('claseId', classDate.id);
  } else {
    // Fallback: only show attendances where checkInTime is that day
    const startOfDay = new Date(hoy + 'T00:00:00');
    const endOfDay = new Date(hoy + 'T23:59:59.999');
    query = query.gte('checkInTime', startOfDay.toISOString()).lte('checkInTime', endOfDay.toISOString());
  }

  const { data, error } = await query.order('checkInTime', { ascending: true });

  if (error) throw error;

  const { data: deviceTypes, error: deviceTypesError } = await supabase
    .from('DeviceType')
    .select('id, name');

  if (deviceTypesError) throw deviceTypesError;

  const deviceTypeMap = new Map(
    (deviceTypes || []).map((deviceType) => {
      const item = deviceType as { id: number; name: string };
      return [item.id, item.name];
    })
  );

  return (data || []).map((row) => {
    const r = row as {
      studentId: string;
      Student: { id: string; name: string } | { id: string; name: string }[] | null;
      status: string;
      observaciones?: string;
      deviceTypeId?: number | null;
      seatDeviceTypeId?: number | null;
    };

    let studentData: { id: string; name: string } | null = null;
    if (r.Student) {
      studentData = Array.isArray(r.Student) ? r.Student[0] : r.Student;
    }

    return {
      id: r.studentId,
      name: studentData?.name || r.studentId,
      status: attendanceToStatus[r.status as AttendanceStatus] || 'normal',
      observaciones: r.observaciones,
      deviceTypeId: r.deviceTypeId ?? null,
      deviceType: r.deviceTypeId !== null && r.deviceTypeId !== undefined ? deviceTypeMap.get(r.deviceTypeId) || null : null,
      seatDeviceTypeId: r.seatDeviceTypeId ?? null,
      seatDeviceType: r.seatDeviceTypeId !== null && r.seatDeviceTypeId !== undefined ? deviceTypeMap.get(r.seatDeviceTypeId) || null : null
    };
  });
}

// Actualiza el estado de un alumno (llegada tardía, ausente, etc.)
export async function updateStudentStatus(studentId: string, classId: string, status: StudentStatus, observaciones?: string) {
  const payload: Record<string, unknown> = { status: statusToAttendance[status] };
  if (observaciones !== undefined) payload.observaciones = observaciones;

  const { error } = await supabase
    .from('Attendance')
    .update(payload)
    .eq('classSessionId', classId)
    .eq('studentId', studentId);

  if (error) throw error;
  revalidatePath('/');
}

// Elimina a un alumno de la lista
export async function deleteStudent(studentId: string, classId: string, providedDate?: string | null) {
  let query = supabase
    .from('Attendance')
    .delete()
    .eq('classSessionId', classId)
    .eq('studentId', studentId);

  const hoy = providedDate || new Date().toISOString().split('T')[0];
  const { data: classDate } = await supabase
    .from('ClassDate')
    .select('id')
    .eq('idClassSession', classId)
    .eq('fechaClase', hoy)
    .maybeSingle();

  if (classDate?.id) {
    query = query.eq('claseId', classDate.id);
  }

  const { error } = await query;

  if (error) throw error;
  revalidatePath('/');
}

// Valida un codigo activo y regresa la clase asociada de manera stateless
export async function validateActiveCode(code: string): Promise<string | null> {
  const normalizedCode = code.trim().toLowerCase();
  if (normalizedCode.length !== 7) return null;

  const letter = normalizedCode[0];
  const otpCode = normalizedCode.slice(1);
  const labIndex = letter.charCodeAt(0) - 96; // 'a' -> 1, 'b' -> 2
  
  if (labIndex <= 0) return null;

  const { data: labSecret, error: secretError } = await supabase
    .from('LabSecretos')
    .select('secreto')
    .eq('idLaboratory', labIndex)
    .maybeSingle();

  if (secretError || !labSecret?.secreto) return null;

  const { verify } = await import('otplib');
  const isValid = await verify({ token: otpCode, secret: labSecret.secreto });
  
  if (!isValid.valid) return null;

  const { data: classes, error: classError } = await supabase
    .from('ClassSession')
    .select('id, "dayOfWeek", "startTime", "endTime"')
    .eq('laboratoryId', labIndex)
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
  studentData: {
    id: string;
    name: string;
    code: string;
    registeredAt: string;
    classId?: string;
    deviceType?: string;
    deviceTypeId?: number | string | null;
    seatDeviceTypeId?: number | string | null;
    observaciones?: string;
    classDate?: string | null;
  }
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
    .select(`
      teacherId, 
      asignaturaId,
      Asignatura ( name )
    `)
    .eq('id', classId)
    .maybeSingle();

  if (classError) throw classError;
  if (!classSession?.teacherId) {
    return { success: false, error: 'No se pudo determinar el maestro de la clase.' };
  }

  const asignaturaData = classSession.Asignatura as { name?: string } | null;
  const asignaturaName = asignaturaData?.name || '';
  const esEventoEspecial = asignaturaName.toUpperCase().startsWith('EVENTO:');

  if (!esEventoEspecial && classSession.asignaturaId) {
    const { data: inscripcion, error: inscError } = await supabase
      .from('Cursa') 
      .select('studentId')
      .eq('studentId', studentData.id)
      .eq('asignaturaId', classSession.asignaturaId)
      .maybeSingle();

    if (inscError) throw inscError;

    if (!inscripcion) {
      return { 
        success: false, 
        error: 'Acceso denegado: No tienes esta materia registrada en tu carga académica.' 
      };
    }
  }

  const hoy = studentData.classDate || new Date().toISOString().split('T')[0];
  const { data: classDate } = await supabase
    .from('ClassDate')
    .select('id')
    .eq('idClassSession', classId)
    .eq('fechaClase', hoy)
    .maybeSingle();

  let attendanceQuery = supabase
    .from('Attendance')
    .select('id')
    .eq('classSessionId', classId)
    .eq('studentId', studentData.id);

  if (classDate?.id) {
    attendanceQuery = attendanceQuery.eq('claseId', classDate.id);
  } else {
    const startOfDay = new Date(hoy + 'T00:00:00');
    const endOfDay = new Date(hoy + 'T23:59:59.999');
    attendanceQuery = attendanceQuery.gte('checkInTime', startOfDay.toISOString()).lte('checkInTime', endOfDay.toISOString());
  }

  const { data: existingAttendance, error: attendanceQueryError } = await attendanceQuery.maybeSingle();

  if (attendanceQueryError) throw attendanceQueryError;

  const deviceTypeId = await resolveDeviceTypeIdFromValue(studentData.deviceTypeId, studentData.deviceType);

  if (deviceTypeId === null || deviceTypeId === undefined) {
    return { success: false, error: 'No se pudo determinar el tipo de dispositivo.' };
  }

  const seatDeviceTypeId = normalizeSeatDeviceTypeId(studentData.seatDeviceTypeId);

  const payload: Record<string, unknown> = {
    classSessionId: Number(classId),
    teacherId: classSession.teacherId,
    studentId: studentData.id,
    registrationCode: studentData.code,
    deviceTypeId,
    seatDeviceTypeId,
    claseId: classDate?.id || null,
    status: 'PRESENT' as AttendanceStatus,
    ...(studentData.observaciones ? { observaciones: studentData.observaciones } : {})
  };

  if (existingAttendance?.id) {
    return { success: false, error: 'Ya has registrado tu asistencia para esta clase.' };
  } else {
    const { error } = await supabase
      .from('Attendance')
      .insert([payload as Record<string, unknown>]);

    if (error) throw error;
  }

  revalidatePath('/maestro/dashboard'); // Actualiza el panel del maestro automáticamente
  return { success: true };
}

export async function getClassInfo(classId: string) {
  const { data, error } = await supabase
    .from('ClassSession')
    .select(`
      id,
      Asignatura ( name ),
      Grupo ( nombre )
    `)
    .eq('id', classId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    className: (data.Asignatura as { name: string })?.name || 'Clase Desconocida',
    groupName: (data.Grupo as { nombre: string })?.nombre || 'Sin Grupo'
  };
}


export async function finalizarClaseParaHoy(classId: string) {
  const hoy = new Date().toISOString().split('T')[0];

  const { data: periodoActivo } = await supabase
    .from('Periodo')
    .select('id, fechaInicio')
    .eq('activo', true)
    .single();

  if (!periodoActivo) return { success: false, error: 'No hay periodo activo' };

  const inicio = new Date(periodoActivo.fechaInicio + 'T00:00:00');
  const ahora = new Date();
  const diffTime = Math.abs(ahora.getTime() - inicio.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const semanaActual = Math.floor(diffDays / 7) + 1;

  const { data: existingLog } = await supabase
    .from('ClassLog')
    .select('id')
    .eq('classSessionId', classId)
    .eq('semana', semanaActual)
    .maybeSingle();

  if (existingLog) {
    await supabase.from('ClassLog').update({ estadoAuditoria: 'FINALIZADA' }).eq('id', existingLog.id);
  } else {
    await supabase.from('ClassLog').insert({
      classSessionId: parseInt(classId),
      semana: semanaActual,
      fecha: hoy,
      estadoAuditoria: 'FINALIZADA',
      periodoId: periodoActivo.id
    });
  }

  return { success: true };
}