"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { KeyRound, ArrowRight } from 'lucide-react';
import { toast, Toaster } from 'sonner';

function JoinMateriaPageContent() {
  const searchParams = useSearchParams();
  const urlCode = searchParams.get('code');
  const [code, setCode] = useState(urlCode || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    const session = localStorage.getItem('studentSession');
    if (!session) {
      let returnUrl = '/estudiante/join-materia';
      if (urlCode) {
        returnUrl += `?code=${urlCode}`;
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
    setError('');

    const normalizedCode = codeToSubmit.trim().toUpperCase();

    if (normalizedCode.length < 3) {
      setError('El código es demasiado corto');
      setIsLoading(false);
      return;
    }

    const sessionStr = localStorage.getItem('studentSession');
    if (!sessionStr) {
      setIsLoading(false);
      return;
    }
    
    const studentData = JSON.parse(sessionStr);

    try {
      const res = await fetch('/api/cursa/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          code: normalizedCode
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Código inválido o error al registrar materia.');
        setIsLoading(false);
        hasAutoSubmitted.current = false;
        return;
      }

      toast.success(data.message || 'Materia registrada correctamente.');
      
      // Esperar un momento para que vean el toast y regresar
      setTimeout(() => {
        router.push('/estudiante/dashboard');
      }, 1500);

    } catch (err) {
      setError('Error de conexión al servidor.');
      setIsLoading(false);
      hasAutoSubmitted.current = false;
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    submitCode(code);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <Toaster position="top-center" richColors />
      <div className="bg-white border border-gray-300 rounded shadow-md p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-purple-100 p-3 rounded-full mb-4">
            <KeyRound size={32} className="text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Unirse a Materia</h1>
          <p className="text-gray-500 text-sm mt-2">
            Ingresa el código de la materia (materiaCode) proporcionado por el profesor para inscribirte.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (error) setError('');
              }}
              placeholder="EJ: MAT123"
              className="text-black w-full text-center text-3xl tracking-widest font-bold px-4 py-4 border-2 border-dashed border-gray-300 rounded focus:outline-none focus:border-purple-600 uppercase transition-colors"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600 text-center font-medium">{error}</p>}
          <button
            type="submit"
            disabled={code.length < 3 || isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded transition-colors shadow-sm flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Registrando...' : 'Inscribirme a Materia'}</span>
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JoinMateriaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">Cargando...</div>}>
      <JoinMateriaPageContent />
    </Suspense>
  );
}
