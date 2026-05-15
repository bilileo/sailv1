// app/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { User, LogOut, Users, X, Clock, QrCode } from 'lucide-react';
import { getStudents, updateStudentStatus, deleteStudent, updateActiveCode, registerStudent } from './actions';
import { Student, StudentStatus } from '@/app/lib/db';
import { getSession, signOut } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';

const CODE_REFRESH_INTERVAL = 10; // Segundos

const getDiaJs = (dayOfWeek?: number) => {
  if (!dayOfWeek) return null;
  return dayOfWeek === 7 ? 0 : dayOfWeek;
};

const parseHorario = (horario?: string) => {
  if (!horario) return null;
  const partes = horario.split('-');
  if (partes.length < 2) return null;
  const startHour = parseInt(partes[0].trim().split(':')[0]);
  const endHour = parseInt(partes[1].trim().split(':')[0]);
  if (Number.isNaN(startHour) || Number.isNaN(endHour)) return null;
  return { startHour, endHour };
};

const getMinutesNow = (fecha: Date) => fecha.getHours() * 60 + fecha.getMinutes();

// Función auxiliar: Genera un código alfanumérico aleatorio de 6 caracteres
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

function TeacherDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const classId = searchParams.get('classId');

  // === ESTADOS DEL COMPONENTE ===
  const [students, setStudents] = useState<Student[]>([]);
  const [currentCode, setCurrentCode] = useState<string>('------');
  const [timeLeft, setTimeLeft] = useState(CODE_REFRESH_INTERVAL);
  const [classStatus, setClassStatus] = useState<'scheduled' | 'inProgress' | 'finished'>('scheduled');
  const [openReportFor, setOpenReportFor] = useState<string | null>(null);
  const [usuarioActivo, setUsuarioActivo] = useState<{ id: string; name: string; role: string } | null>(null);
  const [claseInfo, setClaseInfo] = useState<any | null>(null);
  const [maestroNombre, setMaestroNombre] = useState('');
  const [cargandoClase, setCargandoClase] = useState(false);
  const [claseNoEncontrada, setClaseNoEncontrada] = useState(false);
  const isMaestro = usuarioActivo?.role === 'MAESTRO';
  const [faseClase, setFaseClase] = useState<'scheduled' | 'inProgress' | 'ended'>('scheduled');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualId, setManualId] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualError, setManualError] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  useEffect(() => {
    getSession().then(session => {
      if (session?.user) setUsuarioActivo(session.user as any);
    });
  }, []);

  useEffect(() => {
    if (!classId) {
      setClaseInfo(null);
      setMaestroNombre('');
      setClaseNoEncontrada(false);
      return;
    }

    const cargarClase = async () => {
      setCargandoClase(true);
      setClaseNoEncontrada(false);

      const timestamp = new Date().getTime();
      const resClases = await fetch(`/api/clases?t=${timestamp}`, { cache: 'no-store' });

      if (!resClases.ok) {
        setClaseInfo(null);
        setMaestroNombre('');
        setClaseNoEncontrada(true);
        setCargandoClase(false);
        return;
      }

      const data = await resClases.json();
      const encontrada = data.find((c: any) => String(c.id) === String(classId)) || null;

      if (!encontrada) {
        setClaseInfo(null);
        setMaestroNombre('');
        setClaseNoEncontrada(true);
        setCargandoClase(false);
        return;
      }

      setClaseInfo(encontrada);

      if (encontrada.maestroId) {
        const resMaestros = await fetch(`/api/maestros?t=${timestamp}`, { cache: 'no-store' });
        if (resMaestros.ok) {
          const maestros = await resMaestros.json();
          const maestro = maestros.find((m: any) => m.id === encontrada.maestroId);
          setMaestroNombre(maestro?.name || usuarioActivo?.name || '');
        } else {
          setMaestroNombre(usuarioActivo?.name || '');
        }
      } else {
        setMaestroNombre(usuarioActivo?.name || '');
      }

      setCargandoClase(false);
    };

    cargarClase();
  }, [classId, usuarioActivo?.name]);

  const actualizarEstadoClase = async (nuevoEstado: 'ENDED' | 'ACTIVE') => {
    if (!claseInfo?.id) return;
    await fetch('/api/clases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: claseInfo.id, status: nuevoEstado })
    });
    setClaseInfo((prev: any) => (prev ? { ...prev, status: nuevoEstado } : prev));
  };

  useEffect(() => {
    if (!claseInfo) return;

    const evaluarFase = async () => {
      if (claseInfo.status === 'ENDED') {
        setFaseClase('ended');
        setClassStatus('finished');
        return;
      }

      const horario = parseHorario(claseInfo.horario);
      const diaClase = getDiaJs(claseInfo.dayOfWeek);
      const hoy = new Date();

      if (diaClase === null || !horario) {
        setFaseClase('scheduled');
        setClassStatus('scheduled');
        return;
      }

      const hoyDia = hoy.getDay();
      if (diaClase < hoyDia) {
        setFaseClase('ended');
        setClassStatus('finished');
        if (claseInfo.status !== 'ENDED') {
          await actualizarEstadoClase('ENDED');
        }
        return;
      }

      if (diaClase > hoyDia) {
        setFaseClase('scheduled');
        setClassStatus('scheduled');
        return;
      }

      const ahora = getMinutesNow(hoy);
      const inicio = horario.startHour * 60;
      const fin = horario.endHour * 60;

      if (ahora < inicio) {
        setFaseClase('scheduled');
        setClassStatus('scheduled');
        return;
      }

      if (ahora >= fin) {
        setFaseClase('ended');
        setClassStatus('finished');
        if (claseInfo.status !== 'ENDED') {
          await actualizarEstadoClase('ENDED');
        }
        return;
      }

      setFaseClase('inProgress');
      setClassStatus('inProgress');
    };

    evaluarFase();
    const interval = setInterval(evaluarFase, 30000);
    return () => clearInterval(interval);
  }, [claseInfo]);

  // === CARGA INICIAL Y POLLING DE DATOS (TIEMPO REAL SIMULADO) ===
  useEffect(() => {
    const fetchLatestStudents = async () => {
      if (!classId) {
        setStudents([]);
        return;
      }
      const data = await getStudents(String(classId));
      setStudents(data);
    };

    // 1. Carga inicial
    fetchLatestStudents();

    // 2. Polling: Preguntar a la "base de datos" cada 3 segundos si hay cambios
    // Solo hacemos polling si la clase está en curso
    let interval: NodeJS.Timeout;
    if (classStatus === 'inProgress') {
      interval = setInterval(fetchLatestStudents, 3000);
    }

    // Limpiamos el intervalo al desmontar o si la clase termina
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [classStatus, classId]);

  // === MOTOR DEL CÓDIGO DINÁMICO ===
  // Este Effect maneja la rotación del código cada 10 segundos
  useEffect(() => {
    if (classStatus !== 'inProgress') {
      if (classId) {
        updateActiveCode(String(classId), null); // Limpiamos el código en el servidor al terminar o antes de iniciar
      }
      return;
    }

    if (!classId) return;

    // Inicializar el primer código
    const initialCode = generateCode();
    setCurrentCode(initialCode);
    updateActiveCode(String(classId), initialCode); // Guardar en el JSON

    let secsLeft = CODE_REFRESH_INTERVAL;
    const timer = setInterval(() => {
      secsLeft -= 1;
      setTimeLeft(secsLeft);
      if (secsLeft <= 0) {
        const nextCode = generateCode();
        setCurrentCode(nextCode);
        updateActiveCode(String(classId), nextCode);
        secsLeft = CODE_REFRESH_INTERVAL;
      }
    }, 1000);

    // Limpieza del intervalo cuando el componente se desmonta
    return () => clearInterval(timer);
  }, [classStatus]);

  // === MANEJADORES DE EVENTOS (HANDLERS) ===

  const finalizeClass = async () => {
    await actualizarEstadoClase('ENDED');
    setFaseClase('ended');
    setClassStatus('finished');
    setTimeLeft(0);
    setCurrentCode('------');
  };

  const handleStatusChange = async (studentId: string, newStatus: StudentStatus) => {
    if (!classId) return;
    // 1. Actualización Optimista (UI responde de inmediato)
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
    // 2. Persistencia en el archivo JSON
    await updateStudentStatus(studentId, String(classId), newStatus);
    setOpenReportFor(null); // Cerramos el menú contextual
  };

  const handleDelete = async (studentId: string) => {
    if (!classId) return;
    // 1. Actualización Optimista
    setStudents(prev => prev.filter(s => s.id !== studentId));
    // 2. Persistencia en el archivo JSON
    await deleteStudent(studentId, String(classId));
  };

  const handleManualEntry = () => {
    setManualError('');
    setManualId('');
    setManualName('');
    setManualOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId) {
      setManualError('No se pudo determinar la clase.');
      return;
    }
    if (!manualId.trim() || !manualName.trim()) {
      setManualError('Completa el codigo y el nombre del alumno.');
      return;
    }
    if (!currentCode || currentCode === '------') {
      setManualError('No hay codigo activo para registrar asistencia.');
      return;
    }

    setManualSaving(true);
    const result = await registerStudent({
      id: manualId.trim(),
      name: manualName.trim(),
      code: currentCode,
      registeredAt: new Date().toISOString(),
      classId: String(classId)
    });
    setManualSaving(false);

    if (!result.success) {
      setManualError(result.error || 'No se pudo registrar la asistencia.');
      return;
    }

    const data = await getStudents(String(classId));
    setStudents(data);
    setManualOpen(false);
  };

  // === RENDERIZADO CONDICIONAL ===
  
  const getStudentRowStyle = (status: StudentStatus = 'normal') => {
    const styles = {
      normal: 'bg-white',
      tarde: 'bg-yellow-100',
      ausente: 'bg-gray-200 text-gray-600',
      abandono: 'bg-red-200 text-red-800'
    };
    return styles[status] || styles.normal;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 font-sans pb-10">
      <nav className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex space-x-8">
          {['Inicio', 'Administradores', 'Maestros', 'Auxiliares', 'Clases', 'Incidencias'].map(t => {
            if (usuarioActivo?.role === 'MAESTRO' && t !== 'Inicio' && t !== 'Incidencias') return null;

            if (usuarioActivo?.role === 'AUXILIAR' && (t === 'Administradores' || t === 'Auxiliares')) return null;

            return (
              <button
                key={t}
                onClick={() => router.push('/')}
                className="text-sm font-bold transition-colors text-gray-500 hover:text-gray-700"
              >
                {t}
              </button>
            );
          })}
        </div>
        <div className="flex items-center space-x-4 text-sm font-bold">
          <div className="flex items-center text-gray-700">
            <User className="w-4 h-4 mr-2" />
            {usuarioActivo ? `${usuarioActivo.name} (${usuarioActivo.role})` : 'Cargando...'}
          </div>
          <button
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.href = '/login';
            }}
            className="text-red-500 hover:text-red-700 flex items-center space-x-1"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-4">
        {/* === ENCABEZADO DE LA CLASE === */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <span className={`${faseClase === 'ended' ? 'bg-red-600' : faseClase === 'inProgress' ? 'bg-[#2e8b57]' : 'bg-gray-600'} text-white px-3 py-1 rounded text-sm font-bold tracking-wide shadow-sm`}>
                {faseClase === 'scheduled' ? 'Programada' : faseClase === 'inProgress' ? 'En curso' : 'Finalizado'}
              </span>
              <h1 className="text-2xl font-bold">{claseInfo?.nombre || 'Clase sin seleccionar'}</h1>
            </div>
            <div className="text-sm text-gray-600">
              {cargandoClase && <span>Cargando datos de clase...</span>}
              {!cargandoClase && claseNoEncontrada && (
                <span>No se encontro la clase o no tienes acceso.</span>
              )}
              {!cargandoClase && !claseNoEncontrada && (
                <span>
                  {claseInfo?.laboratorio ? `Laboratorio: ${claseInfo.laboratorio}` : 'Laboratorio: ---'}
                  {' · '}
                  {maestroNombre ? `Maestro: ${maestroNombre}` : 'Maestro: ---'}
                  {' · '}
                  {claseInfo?.status ? `Estado: ${claseInfo.status}` : 'Estado: ---'}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <button
              onClick={finalizeClass}
              disabled={faseClase === 'ended'}
              className="bg-[#d9534f] hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded shadow-sm text-sm font-medium"
            >
              Finalizar Clase ahora
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* === PANEL IZQUIERDO: CÓDIGO DINÁMICO === */}
          <div className="lg:col-span-5 bg-white border border-gray-300 rounded shadow-sm p-8 flex flex-col items-center">
            <h2 className="text-xl mb-6 text-black font-medium text-center">Escanear o ingresa codigo</h2>
            <div className="mb-6 relative">
              <QrCode size={160} strokeWidth={1.5} className="text-black" />
            </div>
            
            <div className="flex flex-col items-center w-full max-w-50">
              <div className="border border-blue-400 border-dashed text-blue-500 font-bold text-3xl tracking-widest px-8 py-2 bg-white w-full text-center mb-2">
                {currentCode}
              </div>
              
              {/* Barra de progreso */}
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1 overflow-hidden">
                <div 
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 ease-linear" 
                  style={{ width: `${(timeLeft / CODE_REFRESH_INTERVAL) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">
                {classStatus === 'inProgress'
                  ? `Cambia en ${timeLeft}s`
                  : classStatus === 'scheduled'
                  ? 'Clase programada'
                  : 'Clase finalizada'}
              </span>
            </div>
          </div>

          {/* === PANEL DERECHO: LISTA DE ALUMNOS === */}
          <div className="lg:col-span-7 flex flex-col border border-gray-300 rounded bg-white shadow-sm min-h-100">
            <div className="bg-[#1a73e8] text-white px-4 py-2 flex justify-between items-center rounded-t">
              <div className="flex items-center space-x-2">
                <Users size={18} />
                <span className="font-medium">Alumnos registrados</span>
              </div>
              <div className="bg-white text-black text-xs font-semibold px-2 py-1 rounded">
                Total : {students.length}
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <ul className="divide-y divide-gray-300">
                {students.map((student) => (
                  <li key={student.id} className={`flex justify-between items-center px-4 py-3 ${getStudentRowStyle(student.status)} hover:brightness-95 transition-colors`}>
                    <span className="text-sm font-medium">{student.name} - {student.id}</span>
                    
                    {/* Controles de Acción por Alumno */}
                    <div className="flex items-center space-x-3 text-black">
                      <button onClick={() => handleDelete(student.id)} className="hover:text-red-500">
                        <X size={18} strokeWidth={2.5} />
                      </button>
                      <button onClick={() => handleStatusChange(student.id, student.status === 'tarde' ? 'normal' : 'tarde')} className="hover:text-yellow-600">
                        <Clock size={18} />
                      </button>
                      
                      {/* Menú Desplegable de Reportes */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenReportFor(openReportFor === student.id ? null : student.id)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 px-2 py-1 rounded"
                        >
                          Reportar
                        </button>
                        {openReportFor === student.id && (
                          <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-300 rounded shadow-lg z-10">
                            <button onClick={() => handleStatusChange(student.id, 'ausente')} className="block w-full text-left text-sm px-3 py-2 hover:bg-gray-100">
                              Ausente
                            </button>
                            <button onClick={() => handleStatusChange(student.id, 'abandono')} className="block w-full text-left text-sm px-3 py-2 hover:bg-red-50">
                              Abandono temprano
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gray-200 px-4 py-3">
              <button
                onClick={handleManualEntry}
                disabled={classStatus !== 'inProgress' || currentCode === '------' || !classId}
                className="w-full bg-[#1a73e8] hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded transition-colors shadow-sm"
              >
                Registrar asistencia manual
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Usa este boton si un alumno no cuenta con dispositivo.
              </p>
            </div>
          </div>
        </div>

        {manualOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md bg-white rounded shadow-lg border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900">Registro manual de asistencia</h3>
                <button
                  onClick={() => setManualOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleManualSubmit} className="px-4 py-4 space-y-3">
                <div>
                  <label htmlFor="manualId" className="block text-xs font-semibold text-gray-700 mb-1">
                    Codigo / Matricula
                  </label>
                  <input
                    id="manualId"
                    type="text"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                  />
                </div>
                <div>
                  <label htmlFor="manualName" className="block text-xs font-semibold text-gray-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    id="manualName"
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                  />
                </div>

                {manualError && (
                  <p className="text-xs text-red-600">{manualError}</p>
                )}

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setManualOpen(false)}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={manualSaving}
                    className="bg-[#1a73e8] hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded"
                  >
                    {manualSaving ? 'Guardando...' : 'Registrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <TeacherDashboard />
    </Suspense>
  );
}