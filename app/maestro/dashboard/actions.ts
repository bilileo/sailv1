// app/actions.ts
'use server'

import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
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

function getTijuanaTimeInfo(dateObj: Date = new Date()) {
  const tzString = dateObj.toLocaleString('en-US', { timeZone: 'America/Tijuana', hour12: false });
  const [datePart, timePart] = tzString.split(', ');
  const [m, d, y] = datePart.split('/');
  const [hr, min] = timePart.split(':');

  const ymd = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  
  const dateForDay = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const day = dateForDay.getDay();
  const dayOfWeekDb = day === 0 ? 7 : day;

  let parsedHr = parseInt(hr, 10);
  if (parsedHr === 24) parsedHr = 0;

  return {
    ymd,
    hour: parsedHr,
    minute: parseInt(min, 10),
    dayOfWeekDb
  };
}

const timeToMinutes = (time?: string | null) => {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const isClassInProgress = (dayOfWeek: number, startTime: string, endTime: string) => {
  const tj = getTijuanaTimeInfo();
  if (dayOfWeek !== tj.dayOfWeekDb) return false;
  
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null) return false;
  
  const nowMinutes = tj.hour * 60 + tj.minute;
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
};

const resolveDeviceTypeId = async (name: string) => {
  const normalized = name.trim();
  if (!normalized) return null;

  const { data: existing, error } = await supabase.from('DeviceType').select('id').eq('name', normalized).maybeSingle();
  if (error) throw error;
  if (existing?.id !== undefined && existing?.id !== null) return existing.id;

  const { data: created, error: insertError } = await supabase.from('DeviceType').insert([{ name: normalized }]).select('id').maybeSingle();
  if (insertError) throw insertError;
  return created?.id ?? null;
};

const resolveDeviceTypeIdFromValue = async (deviceTypeId?: number | string | null, deviceTypeName?: string) => {
  if (deviceTypeId !== undefined && deviceTypeId !== null && deviceTypeId !== '') {
    const parsed = Number(deviceTypeId);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }
  return resolveDeviceTypeId(deviceTypeName || 'Propio');
};

const normalizeSeatDeviceTypeId = (seatDeviceTypeId?: number | string | null) => {
  if (seatDeviceTypeId === undefined || seatDeviceTypeId === null || seatDeviceTypeId === '') return null;
  const parsed = Number(seatDeviceTypeId);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

export async function getStudents(classId: string, providedDate?: string | null): Promise<StudentRow[]> {
  noStore();
  
  const hoy = providedDate || getTijuanaTimeInfo().ymd;

  const { data: classDate } = await supabase
    .from('ClassDate')
    .select('id')
    .eq('idClassSession', classId)
    .eq('fechaClase', hoy)
    .maybeSingle();

  const { data, error } = await supabase
    .from('Attendance')
    .select('id, studentId, status, observaciones, deviceTypeId, seatDeviceTypeId, checkInTime, claseId, Student ( id, name )')
    .eq('classSessionId', classId)
    .order('checkInTime', { ascending: false });

  if (error) throw error;

  const ahoraMs = Date.now();

  const alumnosFiltrados = (data || []).filter((row: any) => {
    if (!row.checkInTime) return true;
    
    if (classDate?.id && row.claseId && String(row.claseId) === String(classDate.id)) return true;

    const checkInMs = new Date(row.checkInTime).getTime();
    const tzCheckIn = getTijuanaTimeInfo(new Date(checkInMs));
    if (tzCheckIn.ymd === hoy) return true;

    const horasPasadas = (ahoraMs - checkInMs) / (1000 * 60 * 60);
    if (horasPasadas >= 0 && horasPasadas <= 18) return true;

    return false;
  });

  const { data: deviceTypes } = await supabase.from('DeviceType').select('id, name');
  const deviceTypeMap = new Map((deviceTypes || []).map((dt: any) => [dt.id, dt.name]));

  const { data: studentsData } = await supabase.from('Student').select('id, name');
  const studentMap = new Map((studentsData || []).map((s: any) => [s.id, s.name]));

  return alumnosFiltrados.map((row: any) => {
    let fallbackName = studentMap.get(row.studentId) || row.studentId;
    if (row.Student) {
      fallbackName = Array.isArray(row.Student) ? row.Student[0].name : row.Student.name;
    }

    return {
      id: row.studentId,
      name: fallbackName,
      status: attendanceToStatus[row.status as AttendanceStatus] || 'normal',
      observaciones: row.observaciones,
      deviceTypeId: row.deviceTypeId ?? null,
      deviceType: row.deviceTypeId ? deviceTypeMap.get(row.deviceTypeId) || null : null,
      seatDeviceTypeId: row.seatDeviceTypeId ?? null,
      seatDeviceType: row.seatDeviceTypeId ? deviceTypeMap.get(row.seatDeviceTypeId) || null : null
    };
  });
}

export async function updateStudentStatus(studentId: string, classId: string, status: StudentStatus, observaciones?: string, providedDate?: string | null) {
  const { data: records } = await supabase
    .from('Attendance')
    .select('id')
    .eq('classSessionId', classId)
    .eq('studentId', studentId)
    .order('checkInTime', { ascending: false })
    .limit(1);

  if (!records || records.length === 0) return;

  const payload: Record<string, unknown> = { status: statusToAttendance[status] };
  if (observaciones !== undefined) payload.observaciones = observaciones;

  await supabase.from('Attendance').update(payload).eq('id', records[0].id);
  revalidatePath('/maestro/dashboard');
}

export async function deleteStudent(studentId: string, classId: string, providedDate?: string | null) {
  const { data: records } = await supabase
    .from('Attendance')
    .select('id')
    .eq('classSessionId', classId)
    .eq('studentId', studentId)
    .order('checkInTime', { ascending: false })
    .limit(1);

  if (!records || records.length === 0) return;

  await supabase.from('Attendance').delete().eq('id', records[0].id);
  revalidatePath('/maestro/dashboard');
}

export async function validateActiveCode(code: string): Promise<string | null> {
  const normalizedCode = code.trim().toLowerCase();
  if (normalizedCode.length !== 7) return null;

  const letter = normalizedCode[0];
  const otpCode = normalizedCode.slice(1);
  const labIndex = letter.charCodeAt(0) - 96; 
  
  if (labIndex <= 0) return null;

  const { data: labSecret, error: secretError } = await supabase.from('LabSecretos').select('secreto').eq('idLaboratory', labIndex).maybeSingle();
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
  if (!classId) return { success: false, error: 'Clase no encontrada para el codigo proporcionado (Verifica la hora).' };

  const { data: student, error: studentError } = await supabase.from('Student').select('id').eq('id', studentData.id).maybeSingle();
  if (studentError) throw studentError;
  if (!student) return { success: false, error: 'El alumno no existe en la base de datos.' };

  const { data: classSession, error: classError } = await supabase
    .from('ClassSession')
    .select('teacherId, asignaturaId, Asignatura ( name, materiaCode )')
    .eq('id', classId)
    .maybeSingle();

  if (classError) throw classError;
  if (!classSession?.teacherId) return { success: false, error: 'No se pudo determinar el maestro de la clase.' };

  let nombreAsignatura = '';
  let codigoAsignatura = '';
  if (classSession.Asignatura) {
    const asig = Array.isArray(classSession.Asignatura) ? classSession.Asignatura[0] : classSession.Asignatura;
    nombreAsignatura = (asig.name || '').toUpperCase();
    codigoAsignatura = asig.materiaCode || '';
  }

  const esEventoEspecial = codigoAsignatura === '000000' || nombreAsignatura === 'EVENTO' || nombreAsignatura.startsWith('EVENTO:');

  if (!esEventoEspecial) {
    if (!classSession.asignaturaId) return { success: false, error: 'Error: La clase no tiene asignatura válida.' };

    const { data: inscripcion, error: inscError } = await supabase
      .from('Cursa') 
      .select('studentId')
      .eq('studentId', studentData.id)
      .eq('asignaturaId', classSession.asignaturaId)
      .limit(1)
      .maybeSingle();

    if (inscError) throw inscError;
    if (!inscripcion) return { success: false, error: 'Acceso denegado: No tienes esta materia registrada en tu carga académica.' };
  }

  const limiteHoras = new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString();
  
  const { data: existingAttendance } = await supabase
    .from('Attendance')
    .select('id')
    .eq('classSessionId', classId)
    .eq('studentId', studentData.id)
    .gte('checkInTime', limiteHoras)
    .limit(1)
    .maybeSingle();

  if (existingAttendance?.id) return { success: false, error: 'Ya has registrado tu asistencia para esta clase el día de hoy.' };

  const hoyLocal = getTijuanaTimeInfo().ymd;
  const hoy = studentData.classDate || hoyLocal;
  const { data: classDate } = await supabase.from('ClassDate').select('id').eq('idClassSession', classId).eq('fechaClase', hoy).maybeSingle();

  const deviceTypeId = await resolveDeviceTypeIdFromValue(studentData.deviceTypeId, studentData.deviceType);
  if (deviceTypeId === null || deviceTypeId === undefined) return { success: false, error: 'No se pudo determinar el tipo de dispositivo.' };

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

  const { error } = await supabase.from('Attendance').insert([payload as Record<string, unknown>]);
  if (error) throw error;

  revalidatePath('/maestro/dashboard');
  return { success: true };
}

export async function getClassInfo(classId: string) {
  const { data, error } = await supabase.from('ClassSession').select('id, Asignatura ( name ), Grupo ( nombre )').eq('id', classId).maybeSingle();
  if (error || !data) return null;
  return {
    className: (data.Asignatura as { name: string })?.name || 'Clase Desconocida',
    groupName: (data.Grupo as { nombre: string })?.nombre || 'Sin Grupo'
  };
}

export async function finalizarClaseParaHoy(classId: string, providedDate?: string | null) {
  const hoy = providedDate || getTijuanaTimeInfo().ymd;

  const { data: session } = await supabase.from('ClassSession').select('periodoId').eq('id', classId).single();
  let pId = session?.periodoId;
  let semActual = 1;

  if (!pId) {
    const { data: periodoActivo } = await supabase.from('Periodo').select('id, fechaInicio').eq('activo', true).single();
    if (periodoActivo) {
      pId = periodoActivo.id;
      const inicio = new Date(periodoActivo.fechaInicio + 'T00:00:00');
      const diffDays = Math.ceil(Math.abs(new Date().getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      semActual = Math.floor(diffDays / 7) + 1;
    }
  } else {
    const { data: specificPeriod } = await supabase.from('Periodo').select('fechaInicio').eq('id', pId).single();
    if (specificPeriod?.fechaInicio) {
      const inicio = new Date(specificPeriod.fechaInicio + 'T00:00:00');
      const diffDays = Math.ceil(Math.abs(new Date().getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      semActual = Math.floor(diffDays / 7) + 1;
    }
  }

  if (!pId) {
    await supabase.from('ClassSession').update({ status: 'ENDED' }).eq('id', classId);
    revalidatePath('/maestro/dashboard');
    return { success: true };
  }

  const { data: existingLog } = await supabase.from('ClassLog')
    .select('id').eq('classSessionId', classId).eq('fecha', hoy).maybeSingle();

  if (existingLog) {
    await supabase.from('ClassLog').update({ estadoAuditoria: 'FINALIZADA' }).eq('id', existingLog.id);
  } else {
    await supabase.from('ClassLog').insert({
      classSessionId: parseInt(classId),
      semana: semActual,
      fecha: hoy,
      estadoAuditoria: 'FINALIZADA',
      periodoId: pId
    });
  }

  revalidatePath('/maestro/dashboard');
  return { success: true };
}

export async function getDashboardClassDetails(classId: string, providedDate?: string | null) {
  const hoy = providedDate || getTijuanaTimeInfo().ymd;

  const { data, error } = await supabase
    .from('ClassSession')
    .select(`
      id, teacherId, status, dayOfWeek, startTime, endTime, laboratoryId, descripcion,
      Laboratory ( name ), Asignatura ( name, materiaCode ), User!teacherId ( name )
    `)
    .eq('id', classId)
    .maybeSingle();

  if (error || !data) return null;

  const { data: log } = await supabase
    .from('ClassLog')
    .select('estadoAuditoria')
    .eq('classSessionId', classId)
    .eq('fecha', hoy)
    .maybeSingle();

  const finalStatus = (log?.estadoAuditoria === 'FINALIZADA') ? 'FINALIZADA' : data.status;

  const asig = Array.isArray(data.Asignatura) ? data.Asignatura[0] : data.Asignatura;
  const lab = Array.isArray(data.Laboratory) ? data.Laboratory[0] : data.Laboratory;
  const user = Array.isArray(data.User) ? data.User[0] : data.User;

  return {
    id: String(data.id),
    maestroId: data.teacherId ? String(data.teacherId) : undefined,
    maestroNombre: user?.name || '',
    status: finalStatus, 
    nombre: asig?.name || 'Clase sin nombre',
    laboratorio: lab?.name || 'Sin laboratorio',
    laboratorioId: data.laboratoryId ? String(data.laboratoryId) : '',
    dayOfWeek: data.dayOfWeek,
    horario: `${data.startTime.substring(0, 5)}-${data.endTime.substring(0, 5)}`,
    color: '#3B82F6',
    descripcion: data.descripcion
  };
}