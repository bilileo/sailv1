"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { KeyRound, ArrowRight } from 'lucide-react';
import { validateActiveCode } from '../../maestro/dashboard/actions'; // Ajusta la ruta si moviste actions.ts

function JoinClassPageContent() {
  const searchParams = useSearchParams();
  const urlCode = searchParams.get('code');
  const urlDate = searchParams.get('date');
  const [code, setCode] = useState(urlCode || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    const session = localStorage.getItem('studentSession');
    if (!session) {
      let returnUrl = '/estudiante/join';
      if (urlCode) {
        returnUrl += `?code=${urlCode}`;
        if (urlDate) returnUrl += `&date=${urlDate}`;
      }
      router.replace(`/estudiante/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    } else if (urlCode && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      submitCode(urlCode);
    }
  }, [router, urlCode]);

  useEffect(() => {
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    }
  }, [urlCode]);

  const submitCode = async (codeToSubmit: string) => {
    setIsLoading(true);

    const normalizedCode = codeToSubmit.trim().toUpperCase();

    if (normalizedCode.length < 6) {
      setIsLoading(false);
      return;
    }

    // Consultamos el código directamente al servidor (archivo JSON)
    const classId = await validateActiveCode(normalizedCode);

    if (!classId) {
      setError('Código inválido o expirado. Espera el nuevo código del profesor.');
      setIsLoading(false);
      hasAutoSubmitted.current = false; // allow trying again
      return;
    }
    
    // Obtener detalles de la clase para mostrarlos en la siguiente pantalla
    const { getClassInfo } = await import('../../maestro/dashboard/actions');
    const classInfo = await getClassInfo(classId);

    // Guardamos en sesión solo para pasar la validación a la siguiente pantalla
    sessionStorage.setItem('registerAccess', JSON.stringify({ 
      code: normalizedCode, 
      classId,
      className: classInfo?.className || 'Clase Desconocida',
      groupName: classInfo?.groupName || 'Sin Grupo',
      classDate: urlDate || null
    }));
    setError('');

    let redirectUrl = `/estudiante/register?code=${normalizedCode}&classId=${encodeURIComponent(classId)}`;
    if (urlDate) {
      redirectUrl += `&date=${urlDate}`;
    }
    router.push(redirectUrl);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    submitCode(code);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="bg-white border border-gray-300 rounded shadow-md p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-blue-100 p-3 rounded-full mb-4">
            <KeyRound size={32} className="text-[#1a73e8]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Unirse a la clase</h1>
          <p className="text-gray-500 text-sm mt-2">
            Ingresa el código dinámico que aparece en la pantalla del profesor.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <input
              type="text"
              maxLength={7}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (error) setError('');
              }}
              placeholder="EJ: 123ABC"
              className="text-black w-full text-center text-3xl tracking-[0.5em] font-bold px-4 py-4 border-2 border-dashed border-gray-300 rounded focus:outline-none focus:border-[#1a73e8] uppercase transition-colors"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button
            type="submit"
            disabled={code.length < 6 || isLoading}
            className="w-full bg-[#1a73e8] hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded transition-colors shadow-sm flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Verificando...' : 'Continuar'}</span>
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JoinClassPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">Cargando...</div>}>
      <JoinClassPageContent />
    </Suspense>
  );
}
