"use client";
import React, { useState, useEffect } from 'react';
import { LogOut, User } from 'lucide-react'; 
import { FormularioClase } from './FormularioClase';
import { Toaster } from 'sonner';

interface Clase { id: string; nombre: string; laboratorio: string; horario: string; startTime: string; }
interface Laboratorio { id: number; name: string; }

const HORAS_24 = Array.from({ length: 24 }, (_, i) => `${i}:00- ${i + 1}:00`);

export default function SailAdminDashboard() {
  const [activeTab, setActiveTab] = useState('Inicio');
  const [clases, setClases] = useState<Clase[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);

  // Función para descargar toda la info
  const cargarDatosBD = async () => {
    const resClases = await fetch('/api/clases');
    if (resClases.ok) setClases(await resClases.json());

    const resLabs = await fetch('/api/laboratorios');
    if (resLabs.ok) setLaboratorios(await resLabs.json());
  };

  useEffect(() => { cargarDatosBD(); }, []);

  const handleCrearClase = async (datosClase: any) => {
    await fetch('/api/clases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosClase)
    });
    await cargarDatosBD(); 
    setActiveTab('Inicio'); 
  };

  // Obtener la fecha de hoy
  const hoy = new Date();
  const mapaDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaHoy = mapaDias[hoy.getDay()];

  // Clases de hoy
  const clasesHoy = clases.filter(c => mapaDias[new Date(c.startTime).getDay()] === diaHoy);

  // Salones ocupados hoy
  const salonesOcupados = new Set(clasesHoy.map(c => c.laboratorio)).size;

  // Renderizar celda del horario
  const renderizarCelda = (hora: string, nombreLab: string) => {
    const horaActual = parseInt(hora.split(':')[0]);
    
    const encontrada = clasesHoy.find(c => {
      if (c.laboratorio !== nombreLab) return false;
      
      const partes = c.horario.split('-');
      const horaInicio = parseInt(partes[0].trim().split(':')[0]);
      const horaFin = partes[1].trim() === '24:00' ? 24 : parseInt(partes[1].trim().split(':')[0]);
      
      return horaActual >= horaInicio && horaActual < horaFin;
    });

    return encontrada ? (
      <div className="w-full h-full min-h-[50px] bg-blue-600 text-white flex items-center justify-center p-2 text-xs font-bold text-center border-b border-blue-500">
        {encontrada.nombre}
      </div>
    ) : (
      <div className="w-full h-full min-h-[50px] bg-green-700 text-white/60 flex items-center justify-center text-xs border-b border-green-800/50">
        Disponible
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex space-x-8">
          {['Inicio', 'Administradores', 'Maestros', 'Clases'].map(t => (
            <button 
              key={t} 
              onClick={() => setActiveTab(t)} 
              className={`text-sm font-bold transition-colors ${
                activeTab === t 
                  ? 'text-black border-b-2 border-black' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-4 text-sm font-bold">
          <div className="flex items-center text-gray-700">
            <User className="w-4 h-4 mr-2"/> Oscar López (Administrador)
          </div>
          <button className="text-red-500 hover:text-red-700 flex items-center space-x-1">
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {activeTab === 'Inicio' && (
          <div className="space-y-8">
            {/* Saludo */}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Hola, Oscar</h1>
              <p className="text-sm text-gray-600 mt-1">Resúmenes de operaciones de laboratorio</p>
            </div>

            {/* Tarjetas de métricas */}
            <div className="grid grid-cols-3 gap-6">
              {/* Clases hoy */}
              <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-yellow-700 text-white px-4 py-2 text-sm font-bold">
                  Clases hoy
                </div>
                <div className="bg-green-700 px-4 py-6 text-white">
                  <div className="text-5xl font-bold">{clasesHoy.length}</div>
                  <div className="text-sm mt-2">Sesiones programadas</div>
                </div>
              </div>

              {/* Salones ocupados */}
              <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-yellow-700 text-white px-4 py-2 text-sm font-bold">
                  Salones ocupados
                </div>
                <div className="bg-green-700 px-4 py-6 text-white">
                  <div className="text-5xl font-bold">{salonesOcupados}/{laboratorios.length}</div>
                  <div className="text-sm mt-2">
                    Laboratorios {Array.from(new Set(clasesHoy.map(c => c.laboratorio))).join(' y ')} ocupados
                  </div>
                </div>
              </div>

              {/* Notas de maestros */}
              <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-yellow-500 text-white px-4 py-2 text-sm font-bold">
                  Notas de maestros
                </div>
                <div className="bg-yellow-500 px-4 py-6 text-white">
                  <div className="text-5xl font-bold">2</div>
                  <div className="text-sm mt-2">Reportes de fallas pendientes</div>
                </div>
              </div>
            </div>

            {/* Horario Visual */}
            <div className="bg-white rounded-sm border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">Horario Visual - Laboratorios</h2>
                <p className="text-xs text-gray-500 mt-1">Disponibilidad de {diaHoy}</p>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase border-r w-24 text-center">Hora</th>
                      
                      {laboratorios.map(lab => (
                        <th 
                          key={lab.id} 
                          className="px-4 py-3 text-xs font-black text-gray-700 uppercase border-r text-center"
                        >
                          {lab.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HORAS_24.map((hora) => (
                      <tr key={hora} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-[9px] font-bold text-gray-600 bg-gray-50 border-r text-center">
                          {hora}
                        </td>
                        
                        {laboratorios.map(lab => (
                           <td key={lab.id} className="p-0 border-r">
                             {renderizarCelda(hora, lab.name)}
                           </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Clases' && (
          <FormularioClase 
            onClaseCreada={handleCrearClase} 
            laboratorios={laboratorios} 
            clases={clases} 
          />
        )}

        {/* Tabs no implementadas */}
        {(activeTab === 'Administradores' || activeTab === 'Maestros') && (
          <div className="bg-white rounded-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600 text-sm">Esta sección aún no está implementada</p>
          </div>
        )}
      </main>

      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        theme="light"
      />
    </div>
  );
}