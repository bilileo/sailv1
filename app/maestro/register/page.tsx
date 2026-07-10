"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserCheck, CheckCircle2 } from 'lucide-react';
import { registerStudent } from '../dashboard/actions';

interface DeviceType {
  id: number;
  name: string;
}

type DeviceUseOption = 'propio' | 'prestado' | 'laboratorio';

export default function StudentRegisterPage() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [deviceUseOption, setDeviceUseOption] = useState<DeviceUseOption>('propio');
  const [labDeviceTypeId, setLabDeviceTypeId] = useState('');
  const [seatDeviceTypeId, setSeatDeviceTypeId] = useState('none');
  const [observaciones, setObservaciones] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = (searchParams.get('code') ?? '').toUpperCase();
  const classIdFromUrl = searchParams.get('classId') ?? '';
  const [classId, setClassId] = useState('');

  const labDeviceTypes = deviceTypes.filter((deviceType) => deviceType.id !== 0 && deviceType.id !== 1);

  useEffect(() => {
    fetch('/api/device-types')
      .then(r => r.json())
      .then(data => setDeviceTypes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Validación inicial rápida usando la sesión de la pantalla anterior
  useEffect(() => {
    const rawAccess = sessionStorage.getItem('registerAccess');
    const rawStudent = sessionStorage.getItem('studentSession');
    if (!rawAccess || !codeFromUrl || !rawStudent) {
      router.replace('/maestro/join');
      return;
    }

    try {
      const access = JSON.parse(rawAccess);
      const student = JSON.parse(rawStudent);
      if (access.code !== codeFromUrl) throw new Error('Mismatch');
      setClassId(access.classId || classIdFromUrl);
      if (student?.id) setId(student.id);
      if (student?.name) setName(student.name);
      setIsAuthorized(true);
    } catch {
      router.replace('/maestro/join');
    }
  }, [codeFromUrl, classIdFromUrl, router]);

  const getDeviceTypeId = () => {
    if (deviceUseOption === 'propio') return 1;
    if (deviceUseOption === 'prestado') return 0;

    const parsed = Number(labDeviceTypeId);

    if (Number.isNaN(parsed)) {
      return null;
    }

    return parsed;
  };

  const getSeatDeviceTypeId = () => {
    if (seatDeviceTypeId === 'none') return null;

    const parsed = Number(seatDeviceTypeId);

    if (Number.isNaN(parsed)) {
      return null;
    }

    return parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id.trim() || !name.trim()) {
      setError('Completa tu matrícula y nombre.');
      return;
    }

    if (deviceUseOption === 'laboratorio' && !labDeviceTypeId) {
      setError('Selecciona el dispositivo de laboratorio en uso.');
      return;
    }

    // Llamamos a la Server Action para escribir en el JSON
    const resolvedClassId = classId || classIdFromUrl;
    if (!resolvedClassId) {
      setError('No se pudo determinar la clase para esta asistencia.');
      return;
    }

    const deviceTypeId = getDeviceTypeId();

    if (deviceTypeId === null) {
      setError('Selecciona un tipo de dispositivo válido.');
      return;
    }

    const result = await registerStudent({
      id: id.trim(),
      name: name.trim(),
      deviceTypeId,
      seatDeviceTypeId: getSeatDeviceTypeId(),
      code: codeFromUrl,
      registeredAt: new Date().toISOString(),
      classId: resolvedClassId,
      observaciones: observaciones.trim() || undefined,
    });

    if (result.success) {
      sessionStorage.removeItem('registerAccess');
      setSubmitted(true);

      setTimeout(() => {
        router.push('/student/dashboard');
      }, 3000);
    } else {
      setError(result.error || 'Ocurrio un error al registrar asistencia.');
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dispositivo en uso
            </label>

            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center gap-3 rounded border border-gray-300 px-3 py-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deviceUseOption"
                  value="propio"
                  checked={deviceUseOption === 'propio'}
                  onChange={() => {
                    setDeviceUseOption('propio');
                    setLabDeviceTypeId('');
                  }}
                  className="accent-[#1a73e8]"
                />
                <span>Propio</span>
              </label>

              <label className="flex items-center gap-3 rounded border border-gray-300 px-3 py-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deviceUseOption"
                  value="prestado"
                  checked={deviceUseOption === 'prestado'}
                  onChange={() => {
                    setDeviceUseOption('prestado');
                    setLabDeviceTypeId('');
                  }}
                  className="accent-[#1a73e8]"
                />
                <span>Prestado</span>
              </label>

              <label className="flex items-center gap-3 rounded border border-gray-300 px-3 py-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deviceUseOption"
                  value="laboratorio"
                  checked={deviceUseOption === 'laboratorio'}
                  onChange={() => setDeviceUseOption('laboratorio')}
                  className="accent-[#1a73e8]"
                />
                <span>De Laboratorio</span>
              </label>
            </div>

            {deviceUseOption === 'laboratorio' && (
              <div className="mt-3">
                <label htmlFor="labDeviceType" className="block text-xs font-medium text-gray-600 mb-1">
                  Selecciona el dispositivo de laboratorio
                </label>
                <select
                  id="labDeviceType"
                  value={labDeviceTypeId}
                  onChange={(e) => setLabDeviceTypeId(e.target.value)}
                  className="text-black w-full px-3 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                  required={deviceUseOption === 'laboratorio'}
                >
                  <option value="">Selecciona una opción</option>
                  {labDeviceTypes.map((deviceType) => (
                    <option key={deviceType.id} value={deviceType.id.toString()}>
                      {deviceType.name}
                    </option>
                  ))}
                </select>

                {labDeviceTypes.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No hay dispositivos de laboratorio registrados.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="seatDeviceType" className="block text-sm font-medium text-gray-700 mb-1">
              ¿Dónde estuvo sentado?
            </label>
            <select
              id="seatDeviceType"
              value={seatDeviceTypeId}
              onChange={(e) => setSeatDeviceTypeId(e.target.value)}
              className="text-black w-full px-3 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
            >
              <option value="none">Ninguno</option>
              {labDeviceTypes.map((deviceType) => (
                <option key={deviceType.id} value={deviceType.id.toString()}>
                  {deviceType.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones <span className="text-gray-400 text-xs font-normal">(Opcional)</span>
            </label>
            <textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Ej. Llegué tarde porque..."
              className="text-black w-full px-3 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1a73e8] resize-none"
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