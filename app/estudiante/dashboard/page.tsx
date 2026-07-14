"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, CheckCircle, Clock, XCircle, AlertCircle, LogIn } from 'lucide-react';
import Link from 'next/link';

interface AttendanceRecord {
  id: string;
  classSessionId: string;
  status: string;
  checkInTime: string;
  clase: string;
  laboratorio: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<{ id: string, name: string } | null>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('studentSession');
    if (!sessionData) {
      router.push('/student/login');
      return;
    }

    try {
      const user = JSON.parse(sessionData);
      setSession(user);

      fetch(`/api/asistencia?studentId=${user.id}`)
        .then(r => r.json())
        .then(data => {
          setAttendances(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } catch (e) {
      router.push('/student/login');
    }
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando...</div>;
  }

  // Calculate percentages
  const signatureStats: Record<string, { total: number; present: number; late: number; absent: number }> = {};
  attendances.forEach(a => {
    if (!a.clase) return;
    if (!signatureStats[a.clase]) {
      signatureStats[a.clase] = { total: 0, present: 0, late: 0, absent: 0 };
    }
    signatureStats[a.clase].total += 1;
    if (a.status === 'PRESENT') signatureStats[a.clase].present += 1;
    else if (a.status === 'LATE') signatureStats[a.clase].late += 1;
    else signatureStats[a.clase].absent += 1;
  });

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'PRESENT': return <span className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-1"/> Presente</span>;
      case 'LATE': return <span className="flex items-center text-yellow-600"><Clock className="w-4 h-4 mr-1"/> Tarde</span>;
      default: return <span className="flex items-center text-red-600"><XCircle className="w-4 h-4 mr-1"/> Ausente/Abandono</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 font-sans pb-10">
      <nav className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex space-x-8">
          <span className="text-xl font-bold text-[#1a73e8]">SAIL Estudiante</span>
        </div>
        <div className="flex items-center space-x-4 text-sm font-bold">
          <div className="flex items-center text-gray-700">
            <User className="w-4 h-4 mr-2" />
            {session ? session.name : 'Cargando...'}
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('studentSession');
              router.push('/student/login');
            }}
            className="text-red-500 hover:text-red-700 flex items-center space-x-1"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mi Asistencia</h1>
          <Link href="/student/join" className="bg-[#1a73e8] hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow-sm flex items-center space-x-2 transition-colors">
            <LogIn className="w-4 h-4" />
            <span>Unirse a clase (Código)</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(signatureStats).map(([clase, stats]) => {
            const val = stats.present + (stats.late * 0.5); // Peso para cuando hay asistencias tardías, las asistencias tardías valen la mitad.
            // (hay que preguntar eso, todavía no está para usar)
            const attendedCount = stats.present + stats.late;
            const percentage = stats.total > 0 ? (attendedCount / stats.total) * 100 : 0;
            const colorClass = getPercentageColor(percentage);

            return (
              <div key={clase} className="bg-white border border-gray-300 rounded p-4 shadow-sm">
                <h3 className="font-bold text-lg mb-2">{clase}</h3>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Asistencias: {attendedCount}/{stats.total}</span>
                  <span className="font-bold">{percentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1"/>
                  {percentage >= 80 ? 'Buen estado' : percentage >= 60 ? 'Riesgo' : 'Critico'}
                </p>
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-gray-300 rounded shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold">Historial de Sesiones</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-sm">
                  <th className="px-6 py-3 font-medium">Asignatura</th>
                  <th className="px-6 py-3 font-medium">Laboratorio</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 font-medium">Fecha/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendances.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors text-sm">
                    <td className="px-6 py-4">{a.clase || 'Desconocida'}</td>
                    <td className="px-6 py-4">{a.laboratorio || 'Desconocido'}</td>
                    <td className="px-6 py-4 font-medium">{getStatusDisplay(a.status)}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {a.checkInTime ? new Date(a.checkInTime).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
                {attendances.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No tienes registros de asistencia aun.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
