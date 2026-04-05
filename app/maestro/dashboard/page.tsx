// app/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { User, LogOut, Users, X, Clock, QrCode } from 'lucide-react';
import { getStudents, updateStudentStatus, deleteStudent, updateActiveCode } from './actions';
import { Student, StudentStatus } from '@/app/lib/db';

const CODE_REFRESH_INTERVAL = 10; // Segundos

// Función auxiliar: Genera un código alfanumérico aleatorio de 6 caracteres
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default function TeacherDashboard() {
  // === ESTADOS DEL COMPONENTE ===
  const [students, setStudents] = useState<Student[]>([]);
  const [currentCode, setCurrentCode] = useState<string>('------');
  const [timeLeft, setTimeLeft] = useState(CODE_REFRESH_INTERVAL);
  const [classStatus, setClassStatus] = useState<'inProgress' | 'finished'>('inProgress');
  const [openReportFor, setOpenReportFor] = useState<string | null>(null);

  // === CARGA INICIAL Y POLLING DE DATOS (TIEMPO REAL SIMULADO) ===
  useEffect(() => {
    const fetchLatestStudents = async () => {
      const data = await getStudents();
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
  }, [classStatus]);

  // === MOTOR DEL CÓDIGO DINÁMICO ===
  // Este Effect maneja la rotación del código cada 10 segundos
  useEffect(() => {
    if (classStatus === 'finished') {
      updateActiveCode(null); // Limpiamos el código en el servidor al terminar
      return;
    }

    // Inicializar el primer código
    const initialCode = generateCode();
    setCurrentCode(initialCode);
    updateActiveCode(initialCode); // Guardar en el JSON

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // El tiempo expiró: Generamos nuevo código
          const nextCode = generateCode();
          setCurrentCode(nextCode);
          updateActiveCode(nextCode); // Impactamos el JSON vía Server Action
          return CODE_REFRESH_INTERVAL;
        }
        return prev - 1; // Solo restamos 1 segundo
      });
    }, 1000);

    // Limpieza del intervalo cuando el componente se desmonta
    return () => clearInterval(timer);
  }, [classStatus]);

  // === MANEJADORES DE EVENTOS (HANDLERS) ===

  const finalizeClass = () => {
    setClassStatus('finished');
    setTimeLeft(0);
    setCurrentCode('------');
  };

  const handleStatusChange = async (studentId: string, newStatus: StudentStatus) => {
    // 1. Actualización Optimista (UI responde de inmediato)
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
    // 2. Persistencia en el archivo JSON
    await updateStudentStatus(studentId, newStatus);
    setOpenReportFor(null); // Cerramos el menú contextual
  };

  const handleDelete = async (studentId: string) => {
    // 1. Actualización Optimista
    setStudents(prev => prev.filter(s => s.id !== studentId));
    // 2. Persistencia en el archivo JSON
    await deleteStudent(studentId);
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
      <nav className="flex justify-between items-center px-6 py-3 bg-white border-b border-gray-300">
        <div className="text-gray-700 font-medium">Inicio</div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-gray-800 font-medium">
            <User size={20} className="text-gray-900" />
            <span>Luis Vizcarra (Maestro)</span>
          </div>
          <button className="flex items-center space-x-1 text-red-500 hover:text-red-700 transition-colors font-medium">
            <span>Cerrar Sesion</span>
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-4">
        {/* === ENCABEZADO DE LA CLASE === */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <span className={`${classStatus === 'inProgress' ? 'bg-[#2e8b57]' : 'bg-gray-600'} text-white px-3 py-1 rounded text-sm font-bold tracking-wide shadow-sm`}>
                {classStatus === 'inProgress' ? 'En curso' : 'Finalizado'}
              </span>
              <h1 className="text-2xl font-bold">Admón. Base de Datos</h1>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <button
              onClick={finalizeClass}
              disabled={classStatus === 'finished'}
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
                {classStatus === 'inProgress' ? `Cambia en ${timeLeft}s` : 'Clase finalizada'}
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
          </div>
        </div>
      </main>
    </div>
  );
}