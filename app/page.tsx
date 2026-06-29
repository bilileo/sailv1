"use client";
import React, { useState, useEffect } from 'react';
import { LogOut, User, X, Trash2, Edit2, AlertCircle, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSession, signOut } from 'next-auth/react';
import { FormularioClase } from './FormularioClase';
import { CatalogoClase } from './lib/attendance-types';
import { CatalogoClases } from './CatalogoClases';
import { Alumnos } from './Alumnos';
import { GestionUsuarios } from './GestionUsuarios';
import { GestionIncidencias } from './GestionIncidencias';
import { Reportes } from './Reportes';
import { Toaster } from 'sonner';
import { toast } from 'sonner';

// 1. Actualizamos la interfaz para usar dayOfWeek
interface Clase {
  id: string;
  nombre: string;
  laboratorio: string;
  laboratorioId?: string | number;
  horario: string;
  status?: string;
  dayOfWeek: number;
  color?: string;
  grupo?: string;
  maestroId?: string | number;
  asignaturaId?: string | number;
}
interface Laboratorio { id: number; name: string; }
interface Maestro { id: number; name: string; }

const HORAS_24 = Array.from({ length: 24 }, (_, i) => `${i}:00- ${i + 1}:00`);
const mapaDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Función helper para convertir el número de PostgreSQL (1-7) a Nombre de Día
const getNombreDia = (dayOfWeek?: number) => {
  if (!dayOfWeek) return '';
  return dayOfWeek === 7 ? 'Domingo' : mapaDias[dayOfWeek];
};

export default function SailAdminDashboard() {
  const router = useRouter();
  const [usuarioActivo, setUsuarioActivo] = useState<{ id: string, name: string, role: string } | null>(null);
  const [editGrupo, setEditGrupo] = useState('');

  interface UserSession { id: string; name: string; role: string }

  useEffect(() => {
    getSession().then(session => {
      if (session?.user) setUsuarioActivo(session.user as unknown as UserSession);
    });
  }, []);

  const isMaestro = usuarioActivo?.role === 'MAESTRO';

  const [activeTab, setActiveTab] = useState('Inicio');
  const [clases, setClases] = useState<Clase[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoClase[]>([]);
  const [formModalOpen, setFormModalOpen] = useState(false);
  interface FormInitialValues { horario?: string; dia?: string; laboratorioId?: string }
  const [formInitialValues, setFormInitialValues] = useState<FormInitialValues>();

  const [diaFiltro, setDiaFiltro] = useState(() => {
    const hoy = new Date();
    return mapaDias[hoy.getDay()];
  });

  const [claseSeleccionada, setClaseSeleccionada] = useState<Clase | null>(null);
  const [claseAcciones, setClaseAcciones] = useState<Clase | null>(null);
  const [claseReporteId, setClaseReporteId] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editAsignaturaId, setEditAsignaturaId] = useState('');
  const [editMaestroId, setEditMaestroId] = useState('');
  const [maestrosEdicion, setMaestrosEdicion] = useState<Maestro[]>([]);
  const [cargandoMaestrosEdicion, setCargandoMaestrosEdicion] = useState(false);
  const [editLab, setEditLab] = useState('');
  const [editDia, setEditDia] = useState('');
  const [editHorario, setEditHorario] = useState('');
  const [erroresEdicion, setErroresEdicion] = useState<{ asignatura?: string; maestro?: string; lab?: string; dia?: string; horario?: string; grupo?: string }>({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [editDuracion, setEditDuracion] = useState(1);

  interface IncidenciaMinimal {
    id: string;
    status?: string;
    reportador?: string;
    message?: string;
    laboratorio?: string;
    clase?: string;
    classSessionId?: string;
    reportedById?: string;
    respuesta?: string;
  }

  const [incidencias, setIncidencias] = useState<IncidenciaMinimal[]>([]);
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [resueltasVistas, setResueltasVistas] = useState(0);
  const misResueltasTotal = isMaestro ? incidencias.filter(i => i.status === 'RESOLVED' && i.reportedById === usuarioActivo?.id).length : 0;
  const notificacionesMaestro = Math.max(0, misResueltasTotal - resueltasVistas);

  const labNombreEdicion = laboratorios.find(l => l.id.toString() === editLab)?.name;

  const horariosOcupadosEdicion = clases
    .filter(c => {
      // 2. Usamos nuestra función getNombreDia en lugar de new Date(startTime)
      const diaClase = getNombreDia(c.dayOfWeek);
      return c.id !== claseSeleccionada?.id && c.laboratorio === labNombreEdicion && diaClase === editDia;
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

  const esDisponibleEdicion = (bloqueStr: string, duracionHoras: number): boolean => {
    const horaInicio = parseInt(bloqueStr.split(':')[0]);
    for (let i = 0; i < duracionHoras; i++) {
      const bloqueAVerificar = `${horaInicio + i}:00- ${horaInicio + i + 1}:00`;
      if (horariosOcupadosEdicion.includes(bloqueAVerificar)) return false;
    }
    return true;
  };

  const cargarDatosBD = async () => {
    const timestamp = new Date().getTime();

    const resClases = await fetch(`/api/clases?t=${timestamp}`, { cache: 'no-store' });
    if (resClases.ok) setClases(await resClases.json());

    const resLabs = await fetch(`/api/laboratorios?t=${timestamp}`, { cache: 'no-store' });
    if (resLabs.ok) setLaboratorios(await resLabs.json());

    const resCatalogo = await fetch(`/api/catalogo?t=${timestamp}`, { cache: 'no-store' });
    if (resCatalogo.ok) setCatalogo(await resCatalogo.json());

    const resInc = await fetch(`/api/incidencias?t=${timestamp}`, { cache: 'no-store' });
    if (resInc.ok) setIncidencias(await resInc.json());
  };

  useEffect(() => {
    cargarDatosBD();
    const radar = setInterval(() => {
      cargarDatosBD();
    }, 5000);
    return () => clearInterval(radar);
  }, []);

  useEffect(() => {
    const cargarMaestrosEdicion = async () => {
      if (!claseSeleccionada || !editAsignaturaId) {
        setMaestrosEdicion([]);
        setEditMaestroId('');
        return;
      }

      setCargandoMaestrosEdicion(true);

      try {
        const res = await fetch(`/api/maestros?asignaturaId=${editAsignaturaId}`);

        if (res.ok) {
          const data: Maestro[] = await res.json();
          setMaestrosEdicion(data);

          setEditMaestroId((maestroActual) => {
            const maestroSigueDisponible = data.some((m) => m.id.toString() === maestroActual);

            if (maestroSigueDisponible) {
              return maestroActual;
            }

            return data.length > 0 ? data[0].id.toString() : '';
          });
        } else {
          setMaestrosEdicion([]);
          setEditMaestroId('');
          toast.error('Error al cargar maestros de la asignatura');
        }
      } catch (error) {
        console.error('Error cargando maestros para edición:', error);
        setMaestrosEdicion([]);
        setEditMaestroId('');
      } finally {
        setCargandoMaestrosEdicion(false);
      }
    };

    cargarMaestrosEdicion();
  }, [editAsignaturaId, claseSeleccionada]);

  const handleCrearClase = async (datosClase: import('./lib/attendance-types').NuevaClase) => {
    await fetch('/api/clases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosClase)
    });
    await cargarDatosBD();

    setDiaFiltro(datosClase.dia);
    setActiveTab('Inicio');
  };

  const handleAbrirFormModal = (horario: string, nombreLab: string) => {
    const lab = laboratorios.find(l => l.name === nombreLab);
    setFormInitialValues({ horario, dia: diaFiltro, laboratorioId: lab?.id?.toString() });
    setFormModalOpen(true);
  };

  const handleAbrirModal = (clase: Clase) => {
    setErroresEdicion({});
    setClaseSeleccionada(clase);

    const asignaturaInicial = clase.asignaturaId
      ? catalogo.find(a => a.id.toString() === clase.asignaturaId?.toString())
      : catalogo.find(a => a.name === clase.nombre);

    setEditAsignaturaId(asignaturaInicial?.id?.toString() || '');
    setEditNombre(asignaturaInicial?.name || clase.nombre);
    setEditMaestroId(clase.maestroId?.toString() || '');

    const labId = laboratorios.find(l => l.name === clase.laboratorio)?.id.toString() || '';
    setEditLab(labId);
    setEditDia(getNombreDia(clase.dayOfWeek));
    setEditStatus(clase.status || 'ACTIVE');
    setEditGrupo(clase.grupo || '');

    const hI = parseInt(clase.horario.split('-')[0]);
    const hF = parseInt(clase.horario.split('-')[1]);
    const horarioNormalizado = `${hI}:00- ${hF}:00`;

    setEditHorario(horarioNormalizado);
    setEditDuracion(hF - hI);
  };

  const handleAbrirAcciones = (clase: Clase) => {
    setClaseAcciones(clase);
  };

  const handleCerrarAcciones = () => {
    setClaseAcciones(null);
  };

  const handleEntrarClase = () => {
    if (!claseAcciones) return;
    router.push(`/maestro/dashboard?classId=${encodeURIComponent(claseAcciones.id)}`);
    setClaseAcciones(null);
  };

  const handleVerReporte = () => {
    if (!claseAcciones) return;
    setClaseReporteId(claseAcciones.id);
    setActiveTab('Reportes');
    setClaseAcciones(null);
  };

  const handleEditarDesdeAcciones = () => {
    if (!claseAcciones) return;
    handleAbrirModal(claseAcciones);
    setClaseAcciones(null);
  };

  const cerrarModalEdicion = () => {
    setClaseSeleccionada(null);
    setMostrarConfirmacion(false);
    setEditAsignaturaId('');
    setEditMaestroId('');
    setMaestrosEdicion([]);
  };

  const handleIntentarEliminar = (e: React.MouseEvent) => {
    e.preventDefault();
    setMostrarConfirmacion(true);
  };

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
    } catch {
      toast.error('Error de red al comunicar con el servidor');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleGuardarEdicion = async () => {
    if (!claseSeleccionada) return;

    setErroresEdicion({});
    const nuevosErrores: typeof erroresEdicion = {};

    if (!editAsignaturaId) {
      nuevosErrores.asignatura = 'Selecciona una asignatura válida';
    }

    if (!editMaestroId) {
      nuevosErrores.maestro = 'Selecciona un maestro válido';
    }

    if (!editLab) {
      nuevosErrores.lab = 'Selecciona un laboratorio válido';
    }

    if (!editDia) {
      nuevosErrores.dia = 'Selecciona un día válido';
    }

    if (!editHorario) {
      nuevosErrores.horario = 'Selecciona un horario válido';
    }

    if (!editGrupo.trim()) {
      nuevosErrores.grupo = 'El grupo es obligatorio';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresEdicion(nuevosErrores);
      toast.error('Por favor corrige los errores antes de guardar');
      return;
    }

    setGuardandoEdicion(true);

    try {
      const res = await fetch('/api/clases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: claseSeleccionada?.id,
          nombre: editNombre,
          asignaturaId: editAsignaturaId,
          maestroId: editMaestroId,
          laboratorioId: editLab,
          horario: editHorario,
          duracion: editDuracion,
          dia: editDia,
          status: editStatus,
          grupo: editGrupo
        })
      });

      if (res.ok) {
        toast.success('Clase actualizada');
        setClaseSeleccionada(null);
        await cargarDatosBD();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al actualizar');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // 4. Filtramos las clases comparando nuestro getNombreDia con el filtro actual
  const clasesDelDia = clases.filter(c => getNombreDia(c.dayOfWeek) === diaFiltro);
  const salonesOcupados = new Set(clasesDelDia.map(c => c.laboratorio)).size;

  const laboratoriosUnicos = Array.from(new Set(clasesDelDia.map(c => c.laboratorio)));
  const textoLaboratorios = laboratoriosUnicos.length > 1
    ? laboratoriosUnicos.slice(0, -1).join(', ') + ' y ' + laboratoriosUnicos[laboratoriosUnicos.length - 1]
    : laboratoriosUnicos[0] || 'Ninguno';

  const renderizarCelda = (hora: string, nombreLab: string) => {
    const horaActual = parseInt(hora.split(':')[0]);
    const hoyIdx = new Date().getDay();
    const diaFiltroIdx = mapaDias.indexOf(diaFiltro);
    const esDiaActual = diaFiltroIdx === hoyIdx;
    const horaSistema = new Date().getHours();

    const encontrada = clasesDelDia.find(c => {
      if (c.laboratorio !== nombreLab) return false;

      const partes = c.horario.split('-');
      const horaInicio = parseInt(partes[0].trim().split(':')[0]);
      const horaFin = partes[1].trim() === '24:00' ? 24 : parseInt(partes[1].trim().split(':')[0]);

      return horaActual >= horaInicio && horaActual < horaFin;
    });

    if (!encontrada) {
      if (isMaestro) {
        return (
          <div className="w-full h-full min-h-[64px] bg-gray-100 border-b border-gray-200 flex flex-col items-center justify-center p-2 select-none">
            <span className="text-[10px] font-medium text-gray-400 text-center uppercase tracking-wider">
              Sin clase asignada
            </span>
          </div>
        );
      }

      return (
        <button onClick={() => handleAbrirFormModal(hora, nombreLab)} className="w-full h-full min-h-[64px] bg-gray-100 text-gray-500 flex flex-col items-center justify-center p-2 text-xs border-b border-gray-200 hover:bg-gray-200 transition-colors">
          Disponible <span className="text-[10px]">(Haga click para agendar)</span>
        </button>
      );
    }

    const esMantenimiento = encontrada.status === 'MAINTENANCE';
    const esFinalizada = encontrada.status === 'ENDED';
    const esActiva = encontrada.status === 'ACTIVE';

    const partes = encontrada.horario.split('-');
    const inicioClase = parseInt(partes[0].trim().split(':')[0]);
    const finClase = partes[1].trim() === '24:00' ? 24 : parseInt(partes[1].trim().split(':')[0]);

    const esEnCurso = esActiva && esDiaActual && horaSistema >= inicioClase && horaSistema < finClase;
    const esProgramada = esActiva && !esEnCurso && (!esDiaActual || horaSistema < inicioClase);
    const colorClase = encontrada.color || 'bg-blue-600';
    const esHex = colorClase.startsWith('#');

    return (
      <button
        onClick={() => handleAbrirAcciones(encontrada)}
        style={esHex && !esMantenimiento && !esFinalizada ? { backgroundColor: colorClase } : {}}
        className={`w-full h-full min-h-[64px] text-white flex flex-col items-center justify-center p-2 border-b shadow-sm transition-all focus:outline-none
          ${esMantenimiento
            ? 'bg-gray-500 border-gray-600'
            : esFinalizada
              ? 'bg-red-600 border-red-700'
              : esProgramada
                ? `${!esHex ? colorClase : ''} opacity-80 border-black/10`
                : `${!esHex ? colorClase : ''} border-black/10`
          }
          ${esMantenimiento
            ? 'hover:bg-gray-600 cursor-pointer'
            : esFinalizada
              ? 'hover:bg-red-700 cursor-pointer'
              : 'hover:brightness-110 cursor-pointer'
          }
        `}
      >
        {esMantenimiento ? (
          <>
            <span className="text-[10px] font-bold leading-tight uppercase tracking-wider text-gray-100 text-center">
              En Mantenimiento
            </span>
          </>
        ) : esFinalizada ? (
          <>
            <span className="text-xs font-bold leading-tight text-center">
              {encontrada.nombre} {encontrada.grupo && `- Gpo. ${encontrada.grupo}`}
            </span>
            <span className="text-[9px] mt-1 uppercase tracking-wider text-white/80">Finalizada</span>
          </>
        ) : esProgramada ? (
          <>
            <span className="text-xs font-bold leading-tight text-center">
              {encontrada.nombre} {encontrada.grupo && `- Gpo. ${encontrada.grupo}`}
            </span>
            <span className="text-[9px] mt-1 uppercase tracking-wider text-white/80">Programada</span>
          </>
        ) : (
          <>
            <span className="text-xs font-bold leading-tight text-center">
              {encontrada.nombre} {encontrada.grupo && `- Gpo. ${encontrada.grupo}`}
            </span>
            {esEnCurso && (
              <span className="text-[9px] mt-1 uppercase tracking-wider text-white/80">En curso</span>
            )}
          </>
        )}

        {!isMaestro ? (
          <span className="text-[9px] mt-1 opacity-80 text-white/70">
            (Acciones)
          </span>
        ) : (
          <span className="text-[9px] mt-1 opacity-80 text-white/70">
            (Entrar)
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex space-x-8">
          {['Inicio', 'Administradores', 'Maestros', 'Auxiliares', 'Clases', 'Alumnos', 'Reportes', 'Incidencias'].map(t => {
            if (usuarioActivo?.role === 'MAESTRO' && t !== 'Inicio' && t !== 'Incidencias') return null;

            if (usuarioActivo?.role === 'AUXILIAR' && (t === 'Administradores' || t === 'Auxiliares')) return null;

            const notificaciones = t === 'Incidencias'
              ? (isMaestro
                ? notificacionesMaestro
                : incidencias.filter(i => i.status === 'PENDING').length)
              : 0;

            return (
              <button
                key={t}
                onClick={() => {
                  setActiveTab(t);
                  if (t === 'Incidencias' && isMaestro) {
                    setResueltasVistas(misResueltasTotal);
                  }
                }}
                className={`text-sm font-bold transition-colors flex items-center py-4 -mb-[1px] ${activeTab === t
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {t}

                {/* Burbuja contadora de incidencias */}
                {t === 'Incidencias' && notificaciones > 0 && (
                  <span className="ml-2 flex items-center justify-center bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    {notificaciones}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center space-x-4 text-sm font-bold">
          <div className="flex items-center text-gray-700">
            <User className="w-4 h-4 mr-2" />
            {usuarioActivo ? `${usuarioActivo.name} (${usuarioActivo.role})` : 'Cargando...'}
          </div>
          <button onClick={async () => {
            await signOut({ redirect: false });
            window.location.href = '/login';
          }} className="text-red-500 hover:text-red-700 flex items-center space-x-1">
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {activeTab === 'Inicio' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Hola, {usuarioActivo ? usuarioActivo.name.split(' ').slice(0, 2).join(' ') : 'Cargando...'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">Resúmenes de operaciones de laboratorio</p>
            </div>

            <div className={`grid gap-6 ${isMaestro ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="bg-yellow-700 text-white px-4 py-2 text-sm font-bold">
                  Clases ({diaFiltro})
                </div>
                <div className="bg-green-700 px-4 py-6 text-white flex-grow">
                  <div className="text-5xl font-bold">{clasesDelDia.length}</div>
                  <div className="text-sm mt-2">Sesiones programadas</div>
                </div>
              </div>

              {!isMaestro && (
                <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
                  <div className="bg-yellow-700 text-white px-4 py-2 text-sm font-bold">
                    Salones ocupados
                  </div>
                  <div className="bg-green-700 px-4 py-6 text-white flex-grow">
                    <div className="text-5xl font-bold">{salonesOcupados}/{laboratorios.length}</div>
                    <div className="text-sm mt-2">
                      Laboratorios {textoLaboratorios} ocupados
                    </div>
                  </div>
                </div>
              )}

              <div
                onClick={() => {
                  setActiveTab('Incidencias');
                  if (isMaestro) setResueltasVistas(misResueltasTotal);
                }}
                className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                title="Ir a Incidencias"
              >
                <div className="bg-yellow-500 text-white px-4 py-2 text-sm font-bold">
                  {isMaestro ? 'Mis fallas reportadas' : 'Notas de maestros'}
                </div>
                <div className="bg-yellow-500 px-4 py-6 text-white flex-grow group-hover:brightness-105 transition-all">
                  <div className="text-5xl font-bold">
                    {isMaestro
                      ? incidencias.filter(i => i.status === 'PENDING' && i.reportedById === usuarioActivo?.id).length
                      : incidencias.filter(i => i.status === 'PENDING').length
                    }
                  </div>
                  <div className="text-sm mt-2">
                    {isMaestro ? 'Mis reportes pendientes de solución' : 'Reportes de fallas pendientes'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-sm border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-gray-200 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-[#0b6e3f]" />
                    Horario Visual - Laboratorios
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Disponibilidad para: <strong className="text-[#0b6e3f]">{diaFiltro}</strong></p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-sm border border-gray-200 overflow-x-auto">
                  {mapaDias.map(d => (
                    <button
                      key={d}
                      onClick={() => setDiaFiltro(d)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-sm transition-colors whitespace-nowrap ${diaFiltro === d
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
                  <thead className="sticky top-0 bg-gray-100 border-b z-20 shadow-sm">
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
          <CatalogoClases />
        )}

        {activeTab === 'Alumnos' && (
          <Alumnos />
        )}

        {activeTab === 'Maestros' && (
          <GestionUsuarios rolDestino="MAESTRO" usuarioActivoId={usuarioActivo?.id} />
        )}

        {activeTab === 'Auxiliares' && (
          <GestionUsuarios rolDestino="AUXILIAR" usuarioActivoId={usuarioActivo?.id} />
        )}

        {activeTab === 'Administradores' && (
          <GestionUsuarios rolDestino="ADMIN" usuarioActivoId={usuarioActivo?.id} />
        )}

        {activeTab === 'Reportes' && (
          <Reportes clases={clases} laboratorios={laboratorios} claseIdInicial={claseReporteId} />
        )}

        {activeTab === 'Incidencias' && (
          <GestionIncidencias
            incidencias={isMaestro ? incidencias.filter(i => i.reportedById === usuarioActivo?.id) : incidencias}
            clases={clases}
            usuarioActivo={usuarioActivo}
            onIncidenciaActualizada={cargarDatosBD}
          />
        )}
      </main>

      {claseSeleccionada && (
        <>
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
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Asignatura</label>
                  <select
                    value={editAsignaturaId}
                    onChange={(e) => {
                      const nuevaAsignaturaId = e.target.value;
                      const asignaturaSeleccionada = catalogo.find(a => a.id.toString() === nuevaAsignaturaId);

                      setEditAsignaturaId(nuevaAsignaturaId);
                      setEditNombre(asignaturaSeleccionada?.name || '');
                      setEditMaestroId('');

                      if (erroresEdicion.asignatura) setErroresEdicion({ ...erroresEdicion, asignatura: undefined });
                      if (erroresEdicion.maestro) setErroresEdicion({ ...erroresEdicion, maestro: undefined });
                    }}
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors ${erroresEdicion.asignatura
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                      }`}
                  >
                    <option value="">Seleccionar...</option>
                    {catalogo.map((a) => (
                      <option key={a.id} value={a.id.toString()}>
                        {a.materiaCode + ' - ' + a.name}
                      </option>
                    ))}
                  </select>
                  {erroresEdicion.asignatura && (
                    <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                      <span>{erroresEdicion.asignatura}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Estado de la Sesión</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black"
                  >
                    <option value="ACTIVE">Activa (Clase normal)</option>
                    <option value="MAINTENANCE">Mantenimiento (Bloqueado)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Laboratorio</label>
                    <select
                      value={editLab}
                      onChange={(e) => {
                        setEditLab(e.target.value);
                        if (erroresEdicion.lab) setErroresEdicion({ ...erroresEdicion, lab: undefined });
                      }}
                      className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors ${erroresEdicion.lab ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
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
                    <label className="block text-sm font-bold text-gray-700 mb-1">Maestro</label>
                    <select
                      value={editMaestroId}
                      disabled={!editAsignaturaId || cargandoMaestrosEdicion || maestrosEdicion.length === 0}
                      onChange={(e) => {
                        setEditMaestroId(e.target.value);
                        if (erroresEdicion.maestro) setErroresEdicion({ ...erroresEdicion, maestro: undefined });
                      }}
                      className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${erroresEdicion.maestro
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-blue-500'
                        }`}
                    >
                      {!editAsignaturaId ? (
                        <option value="">Primero selecciona una asignatura</option>
                      ) : cargandoMaestrosEdicion ? (
                        <option value="">Cargando maestros...</option>
                      ) : maestrosEdicion.length === 0 ? (
                        <option value="">No hay maestros asignados</option>
                      ) : (
                        <>
                          <option value="">Seleccionar...</option>
                          {maestrosEdicion.map((m) => (
                            <option key={m.id} value={m.id.toString()}>
                              {m.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    {erroresEdicion.maestro && (
                      <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                        <span>{erroresEdicion.maestro}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Día</label>
                    <select
                      value={editDia}
                      onChange={(e) => {
                        setEditDia(e.target.value);
                        if (erroresEdicion.dia) setErroresEdicion({ ...erroresEdicion, dia: undefined });
                      }}
                      className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors ${erroresEdicion.dia ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                    >
                      <option value="">Seleccionar...</option>
                      {mapaDias.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {erroresEdicion.dia && (
                      <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                        <span>{erroresEdicion.dia}</span>
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

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Bloque Horario</label>
                  <select
                    value={editHorario}
                    onChange={(e) => {
                      setEditHorario(e.target.value);
                      if (erroresEdicion.horario) setErroresEdicion({ ...erroresEdicion, horario: undefined });
                    }}
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors ${erroresEdicion.horario ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
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

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Grupo</label>
                  <input
                    type="text"
                    value={editGrupo}
                    onChange={(e) => {
                      setEditGrupo(e.target.value);
                      if (erroresEdicion.grupo) setErroresEdicion({ ...erroresEdicion, grupo: undefined });
                    }}
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium outline-none transition-colors ${
                      erroresEdicion.grupo ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {erroresEdicion.grupo && (
                    <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                      <span>{erroresEdicion.grupo}</span>
                    </div>
                  )}
                </div>
              </div>

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
                    className={`px-4 py-2 text-sm font-bold text-white rounded transition-colors shadow-sm flex items-center justify-center gap-2 ${guardandoEdicion ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
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

      {claseAcciones && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
              <h3 className="text-lg font-bold text-gray-800">Selecciona una accion</h3>
              <button
                onClick={handleCerrarAcciones}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-700">
                <div className="font-bold text-gray-900">{claseAcciones.nombre}</div>
                <div className="text-xs text-gray-500">{claseAcciones.laboratorio}</div>
              </div>

              <div className="flex flex-col gap-3">
                {!isMaestro && (
                  <button
                    onClick={handleEditarDesdeAcciones}
                    className="w-full px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Editar clase
                  </button>
                )}
                <button
                  onClick={handleEntrarClase}
                  className="w-full px-4 py-2 text-sm font-bold text-white bg-green-700 hover:bg-green-800 rounded transition-colors"
                >
                  Entrar a clase
                </button>
                <button
                  onClick={handleVerReporte}
                  className="w-full px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  Ver Reporte de Asistencia
                </button>
                <button
                  onClick={handleCerrarAcciones}
                  className="w-full px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {formModalOpen && (
        /** Formulario modal invocado desde los espacios Disponibles */
        <FormularioClase
          initialValues={formInitialValues}
          onClaseCreada={handleCrearClase}
          laboratorios={laboratorios}
          clases={clases}
          open={formModalOpen}
          onClose={() => setFormModalOpen(false)}
        />
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