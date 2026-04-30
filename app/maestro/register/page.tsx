"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserCheck, CheckCircle2 } from 'lucide-react';
import { registerStudent } from '../dashboard/actions';

export default function StudentRegisterPage() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = (searchParams.get('code') ?? '').toUpperCase();
  const classIdFromUrl = searchParams.get('classId') ?? '';
  const [classId, setClassId] = useState('');

  // Validación inicial rápida usando la sesión de la pantalla anterior
  useEffect(() => {
    const rawAccess = sessionStorage.getItem('registerAccess');
    if (!rawAccess || !codeFromUrl) {
      router.replace('/maestro/join');
      return;
    }
    
    try {
      const access = JSON.parse(rawAccess);
      if (access.code !== codeFromUrl) throw new Error('Mismatch');
      setClassId(access.classId || classIdFromUrl);
      setIsAuthorized(true);
    } catch {
      router.replace('/maestro/join');
    }
  }, [codeFromUrl, classIdFromUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) return;

    // Llamamos a la Server Action para escribir en el JSON
    const resolvedClassId = classId || classIdFromUrl;
    if (!resolvedClassId) {
      setError('No se pudo determinar la clase para esta asistencia.');
      return;
    }

    const result = await registerStudent({
      id: id.trim(),
      name: name.trim(),
      code: codeFromUrl,
      registeredAt: new Date().toISOString(),
      classId: resolvedClassId,
    });

    if (result.success) {
      sessionStorage.removeItem('registerAccess');
      setSubmitted(true);
      
      setTimeout(() => {
        router.push('/maestro/join');
      }, 3000);
    } else {
      setError('Ocurrió un error al registrar asistencia.');
    }
  };

  // Evitar renderizados extraños mientras verifica autorización
  if (isAuthorized === null) return null; 

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white border border-gray-300 rounded shadow-md p-8 w-full max-w-md flex flex-col items-center text-center animate-in zoom-in duration-300">
          <CheckCircle2 size={64} className="text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Asistencia Registrada!</h2>
          <p className="text-gray-500">Ya puedes guardar tu teléfono.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="bg-white border border-gray-300 rounded shadow-md p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-blue-100 p-3 rounded-full mb-4">
            <UserCheck size={32} className="text-[#1a73e8]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Registro de Asistencia</h1>
          <p className="text-gray-500 text-sm mt-1">Admón. Base de Datos - Grupo 151</p>
          <p className="text-blue-600 text-xs mt-2 font-semibold">Código activo: {codeFromUrl}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
              Código / Matrícula
            </label>
            <input
              type="text"
              id="studentId"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="text-black w-full px-3 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
              required
            />
          </div>
          <div>
            <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              id="studentName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-black w-full px-3 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
              required
            />
          </div>
          
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          
          <button
            type="submit"
            className="w-full bg-[#1a73e8] hover:bg-blue-700 text-white font-medium py-3 px-4 rounded transition-colors shadow-sm mt-4"
          >
            Confirmar Asistencia
          </button>
        </form>
      </div>
    </div>
  );
}