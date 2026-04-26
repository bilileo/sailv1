"use client";
import React, { useState, useEffect } from 'react';
import { LogOut, User, X, Trash2, Edit2, AlertCircle, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { getSession, signOut } from 'next-auth/react';
import { FormularioClase } from './FormularioClase';
import { Toaster } from 'sonner';
import { toast } from 'sonner';

interface Clase { id: string; nombre: string; laboratorio: string; horario: string; startTime: string; }
interface Laboratorio { id: number; name: string; }

const HORAS_24 = Array.from({ length: 24 }, (_, i) => `${i}:00- ${i + 1}:00`);
const mapaDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function SailAdminDashboard() {
  const [usuarioActivo, setUsuarioActivo] = useState<{name: string, role: string} | null>(null);

  useEffect(() => {
    getSession().then(session => {
      if (session?.user) setUsuarioActivo(session.user as any);
    });
  }, []);

  const isMaestro = usuarioActivo?.role === 'MAESTRO';// Ejemplo de cómo usar el rol para mostrar u ocultar elementos

  const [activeTab, setActiveTab] = useState('Inicio');
  const [clases, setClases] = useState<Clase[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  
  // === ESTADO DEL SELECTOR DE DÍAS ===
  // Inicializa con el día actual automáticamente
  const [diaFiltro, setDiaFiltro] = useState(() => {
    const hoy = new Date();
    return mapaDias[hoy.getDay()];
  });

  const [claseSeleccionada, setClaseSeleccionada] = useState<Clase | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editLab, setEditLab] = useState('');
  const [editHorario, setEditHorario] = useState('');
  const [erroresEdicion, setErroresEdicion] = useState<{ nombre?: string; lab?: string; horario?: string }>({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [editDuracion, setEditDuracion] = useState(1);

  // Lógica para detectar qué horas están ocupadas (excluyendo la clase que estamos editando)
  const labNombreEdicion = laboratorios.find(l => l.id.toString() === editLab)?.name;
  
  const horariosOcupadosEdicion = clases
    .filter(c => {
      // Filtramos por el mismo laboratorio y mismo día, pero ignoramos la clase actual
      const diaClase = mapaDias[new Date(c.startTime).getDay()];
      const diaDeLaClaseEditada = claseSeleccionada ? mapaDias[new Date(claseSeleccionada.startTime).getDay()] : '';
      return c.id !== claseSeleccionada?.id && c.laboratorio === labNombreEdicion && diaClase === diaDeLaClaseEditada;
    })
    .flatMap(c => {
      const horaI = parseInt(c.horario.split('-')[0]);
      const horaF = parseInt(c.horario.split('-')[1]);
      const bloques = [];
      for (let i = horaI; i < horaF; i++) {
        bloques.push(`${i}:00- ${i + 1}:00`);
      }
      return bloques;
    });

  // Función para verificar disponibilidad en el Modal
  const esDisponibleEdicion = (bloqueStr: string, duracionHoras: number): boolean => {
    const horaInicio = parseInt(bloqueStr.split(':')[0]);
    for (let i = 0; i < duracionHoras; i++) {
      const bloqueAVerificar = `${horaInicio + i}:00- ${horaInicio + i + 1}:00`;
      if (horariosOcupadosEdicion.includes(bloqueAVerificar)) return false;
    }
    return true;
  };

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
    
    // Cambiamos el calendario al día de la clase que acabamos de crear para que el usuario la vea
    setDiaFiltro(datosClase.dia);
    setActiveTab('Inicio'); 
  };

  const handleAbrirModal = (clase: Clase) => {
    setErroresEdicion({});
    setClaseSeleccionada(clase);
    setEditNombre(clase.nombre);
    const labId = laboratorios.find(l => l.name === clase.laboratorio)?.id.toString() || '';
    setEditLab(labId);
    setEditHorario(clase.horario);
    
    // Calculamos la duración original
    const hI = parseInt(clase.horario.split('-')[0]);
    const hF = parseInt(clase.horario.split('-')[1]);
    setEditDuracion(hF - hI);
  };

  const cerrarModalEdicion = () => {
    setClaseSeleccionada(null);
    setMostrarConfirmacion(false);
  };

  // Abre el modal de confirmación
  const handleIntentarEliminar = (e: React.MouseEvent) => {
    e.preventDefault();
    setMostrarConfirmacion(true);
  };

  // Va a la base de datos a destruir la clase
  const confirmarEliminacion = async () => {
    if (!claseSeleccionada) return;
    setGuardandoEdicion(true);

    try {
      const res = await fetch(`/api/clases?id=${claseSeleccionada.id}`, { method: 'DELETE' });
      
      if (res.ok) {
        toast.success('Clase eliminada permanentemente');
        cerrarModalEdicion();
        await cargarDatosBD();
      } else {
        toast.error('Error al intentar eliminar la clase');
      }
    } catch (error) {
      toast.error('Error de red al comunicar con el servidor');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleGuardarEdicion = async () => {
    if (!claseSeleccionada) return;
    
    setErroresEdicion({});
    const nuevosErrores: { nombre?: string; lab?: string; horario?: string } = {};

    if (!editNombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    } else if (editNombre.trim().length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!editLab) {
      nuevosErrores.lab = 'Selecciona un laboratorio válido';
    }

    if (!editHorario) {
      nuevosErrores.horario = 'Selecciona un horario válido';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresEdicion(nuevosErrores);
      toast.error('Por favor corrige los errores antes de guardar');
      return; 
    }

    setGuardandoEdicion(true);
    const diaClase = mapaDias[new Date(claseSeleccionada.startTime).getDay()];
    
    try {
        const res = await fetch('/api/clases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: claseSeleccionada?.id,
          nombre: editNombre,
          laboratorioId: editLab,
          horario: editHorario,
          duracion: editDuracion, 
          dia: mapaDias[new Date(claseSeleccionada!.startTime).getDay()]
        })
      });

      if (res.ok) {
        toast.success('Clase actualizada');
        setClaseSeleccionada(null);
        cargarDatosBD();
      } else {
        toast.error('Error al actualizar');
      }
    } catch (error) {
      toast.error('Error de red');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // === LÓGICA DE FILTRADO VISUAL DINÁMICO ===
  // Filtramos las clases y métricas dependiendo del día que el usuario seleccionó (diaFiltro)
  const clasesDelDia = clases.filter(c => mapaDias[new Date(c.startTime).getDay()] === diaFiltro);
  const salonesOcupados = new Set(clasesDelDia.map(c => c.laboratorio)).size;

  const renderizarCelda = (hora: string, nombreLab: string) => {
    const horaActual = parseInt(hora.split(':')[0]);
    
    const encontrada = clasesDelDia.find(c => {
      if (c.laboratorio !== nombreLab) return false;
      
      const partes = c.horario.split('-');
      const horaInicio = parseInt(partes[0].trim().split(':')[0]);
      const horaFin = partes[1].trim() === '24:00' ? 24 : parseInt(partes[1].trim().split(':')[0]);
      
      return horaActual >= horaInicio && horaActual < horaFin;
    });

    return encontrada ? (
      <button 
        // Solo abrimos el modal si NO es maestro
        onClick={() => !isMaestro && handleAbrirModal(encontrada)}
        // Quitamos la clase 'hover' si es maestro para que parezca una celda estática
        className={`w-full h-full min-h-[50px] bg-blue-600 text-white flex flex-col items-center justify-center p-2 border-b border-blue-500 shadow-sm transition-colors focus:outline-none ${!isMaestro ? 'hover:bg-blue-700 cursor-pointer focus:ring-2 focus:ring-blue-300' : 'cursor-default'}`}
      >
        <span className="text-xs font-bold leading-tight">{encontrada.nombre}</span>
        {/* Solo mostramos la palabra (Editar) si es administrador */}
        {!isMaestro && <span className="text-[9px] text-blue-200 mt-1 opacity-80">(Editar)</span>}
      </button>
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
          {['Inicio', 'Administradores', 'Maestros', 'Auxiliares', 'Clases'].map(t => {
           // Si es MAESTRO, ocultar todo excepto "Inicio"
            if (usuarioActivo?.role === 'MAESTRO' && t !== 'Inicio') return null;

            // Si es ADMIN, ocultar las pestañas de "Administradores" y "Auxiliares"
            if (usuarioActivo?.role === 'AUXILIAR' && (t === 'Administradores' || t === 'Auxiliares')) return null;

            return (
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
            );
          })}
        </div>
        <div className="flex items-center space-x-4 text-sm font-bold">
          <div className="flex items-center text-gray-700">
            <User className="w-4 h-4 mr-2"/> 
            {usuarioActivo ? `${usuarioActivo.name} (${usuarioActivo.role})` : 'Cargando...'}
          </div>
          <button onClick={() => signOut()} className="text-red-500 hover:text-red-700 flex items-center space-x-1">
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
              <h1 className="text-3xl font-bold text-gray-800">
                Hola, {usuarioActivo ? usuarioActivo.name.split(' ')[0] : 'Cargando...'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">Resúmenes de operaciones de laboratorio</p>
            </div>

            {/* Tarjetas de métricas (Ahora reaccionan al día filtrado) */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-yellow-700 text-white px-4 py-2 text-sm font-bold">
                  Clases ({diaFiltro})
                </div>
                <div className="bg-green-700 px-4 py-6 text-white">
                  <div className="text-5xl font-bold">{clasesDelDia.length}</div>
                  <div className="text-sm mt-2">Sesiones programadas</div>
                </div>
              </div>

              <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-yellow-700 text-white px-4 py-2 text-sm font-bold">
                  Salones ocupados
                </div>
                <div className="bg-green-700 px-4 py-6 text-white">
                  <div className="text-5xl font-bold">{salonesOcupados}/{laboratorios.length}</div>
                  <div className="text-sm mt-2">
                    Laboratorios {Array.from(new Set(clasesDelDia.map(c => c.laboratorio))).join(' y ')} ocupados
                  </div>
                </div>
              </div>

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
              <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-gray-200 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-[#0b6e3f]" /> 
                    Horario Visual - Laboratorios
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Disponibilidad para: <strong className="text-[#0b6e3f]">{diaFiltro}</strong></p>
                </div>

                {/* SELECTOR DE DÍAS ESTILO BOTONERA */}
                <div className="flex bg-gray-100 p-1 rounded-sm border border-gray-200 overflow-x-auto">
                  {mapaDias.map(d => (
                    <button 
                      key={d} 
                      onClick={() => setDiaFiltro(d)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-sm transition-colors whitespace-nowrap ${
                        diaFiltro === d 
                          ? 'bg-[#0b6e3f] text-white shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
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
        {(activeTab === 'Administradores' || activeTab === 'Maestros' || activeTab === 'Auxiliares') && (
          <div className="bg-white rounded-sm border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Gestión de {activeTab}</h2>
            <p className="text-gray-600 text-sm">El módulo para crear y editar {activeTab.toLowerCase()} se construirá aquí.</p>
          </div>
        )}
      </main>

      {/* ================= MODAL DE EDICIÓN ================= */}
      {claseSeleccionada && (
        <>
          {/* MODAL PRINCIPAL DE EDICIÓN */}
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <Edit2 className="w-5 h-5 mr-2 text-blue-600" /> Gestionar Clase
                </h3>
                <button 
                  onClick={cerrarModalEdicion} 
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
                  <input 
                    type="text" 
                    value={editNombre} 
                    onChange={(e) => {
                      setEditNombre(e.target.value);
                      if (erroresEdicion.nombre) setErroresEdicion({ ...erroresEdicion, nombre: undefined });
                    }} 
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium outline-none transition-colors ${
                      erroresEdicion.nombre 
                        ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {erroresEdicion.nombre && (
                    <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                      <span>{erroresEdicion.nombre}</span>
                    </div>
                  )}
                </div>

                {/* Laboratorio y Duración */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Laboratorio</label>
                    <select 
                      value={editLab} 
                      onChange={(e) => {
                        setEditLab(e.target.value);
                        if (erroresEdicion.lab) setErroresEdicion({ ...erroresEdicion, lab: undefined });
                      }} 
                      className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors ${
                        erroresEdicion.lab ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Seleccionar...</option>
                      {laboratorios.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    {erroresEdicion.lab && (
                      <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                        <span>{erroresEdicion.lab}</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Duración (horas)</label>
                    <select 
                      value={editDuracion} 
                      onChange={(e) => setEditDuracion(parseInt(e.target.value))} 
                      className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black font-medium focus:ring-blue-500 outline-none transition-colors"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                        <option key={h} value={h}>{h} {h === 1 ? 'hora' : 'horas'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Horario con lógica de bloqueo */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Bloque Horario</label>
                  <select 
                    value={editHorario} 
                    onChange={(e) => {
                      setEditHorario(e.target.value);
                      if (erroresEdicion.horario) setErroresEdicion({ ...erroresEdicion, horario: undefined });
                    }} 
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors ${
                      erroresEdicion.horario ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Seleccionar...</option>
                    {Array.from({ length: 24 - editDuracion + 1 }, (_, i) => `${i}:00- ${i + editDuracion}:00`).map(h => {
                      const disponible = esDisponibleEdicion(h, editDuracion);
                      return (
                        <option 
                          key={h} 
                          value={h} 
                          disabled={!disponible} 
                          className={!disponible ? 'text-gray-400 bg-gray-100 font-bold' : 'text-black'}
                        >
                          {h} {!disponible ? '(Ocupado)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {erroresEdicion.horario && (
                    <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                      <span>{erroresEdicion.horario}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones del Modal Principal */}
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
                <button 
                  onClick={handleIntentarEliminar} 
                  disabled={guardandoEdicion}
                  className="flex items-center text-sm font-bold text-red-600 hover:text-red-800 px-3 py-2 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                </button>
                
                <div className="flex space-x-3">
                  <button 
                    onClick={cerrarModalEdicion} 
                    disabled={guardandoEdicion}
                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleGuardarEdicion} 
                    disabled={guardandoEdicion}
                    className={`px-4 py-2 text-sm font-bold text-white rounded transition-colors shadow-sm flex items-center justify-center gap-2 ${
                      guardandoEdicion ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                    }`}
                  >
                    {guardandoEdicion ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Guardar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SUB-MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
          {mostrarConfirmacion && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar clase?</h3>
                
                <p className="text-sm text-gray-600 mb-6">
                  Estás a punto de eliminar permanentemente la clase <span className="font-bold text-gray-800">"{claseSeleccionada.nombre}"</span>. Esta acción liberará el horario y no se puede deshacer.
                </p>
                
                <div className="flex space-x-3 w-full">
                  <button 
                    onClick={() => setMostrarConfirmacion(false)}
                    disabled={guardandoEdicion}
                    className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmarEliminacion}
                    disabled={guardandoEdicion}
                    className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {guardandoEdicion ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {guardandoEdicion ? 'Borrando...' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        theme="light"
      />
    </div>
  );
}