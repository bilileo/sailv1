"use client";
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, X, Calendar, CheckCircle, AlertCircle, Edit2, Trash2, AlertTriangle, Search, CalendarPlus } from 'lucide-react';
import { FormularioPeriodos } from '@/app/formulario/alta/FormularioPeriodos';
import { FormularioAsuetos } from '@/app/formulario/alta/FormularioAsuetos';
interface Periodo {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

type FiltroEstado = 'todos' | 'activo' | 'inactivo';

export function GestionPeriodos() {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalAsuetoAbierto, setModalAsuetoAbierto] = useState(false);
  const [periodoParaAsueto, setPeriodoParaAsueto] = useState<Periodo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  // Estados de Formulario
  const [editId, setEditId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [error, setError] = useState('');

  // Estados de Eliminación
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [periodoAEliminar, setPeriodoAEliminar] = useState<Periodo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarPeriodos = async () => {
    const res = await fetch('/api/periodos');
    if (res.ok) setPeriodos(await res.json());
  };

  useEffect(() => {
    cargarPeriodos();
  }, []);

  const abrirModal = (periodo?: Periodo) => {
    setError('');
    if (periodo) {
      setEditId(periodo.id);
      setNombre(periodo.nombre);
      setFechaInicio(periodo.fechaInicio);
      setFechaFin(periodo.fechaFin);
    } else {
      setEditId(null);
      setNombre('');
      setFechaInicio('');
      setFechaFin('');
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
  };

  const abrirModalAsueto = (periodo: Periodo) => {
    setPeriodoParaAsueto(periodo);
    setModalAsuetoAbierto(true);
  };

  const cerrarModalAsueto = () => {
    setModalAsuetoAbierto(false);
    setPeriodoParaAsueto(null);
  };

  const activarPeriodo = async (item: Periodo) => {
    try {
      const res = await fetch('/api/periodos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, activo: true }),
      });

      if (res.ok) {
        toast.success(`Periodo ${item.nombre} activado como ciclo actual`);
        cargarPeriodos();
      } else {
        toast.error('No se pudo activar el periodo');
      }
    } catch {
      toast.error('Error de comunicación con el servidor');
    }
  };

  const intentarEliminar = (periodo: Periodo) => {
    setPeriodoAEliminar(periodo);
    setMostrarConfirmacion(true);
  };


  const periodosFiltrados = periodos.filter((periodo) => {
    const textoBusqueda = busqueda.toLowerCase().trim();
    const coincideNombre = periodo.nombre.toLowerCase().includes(textoBusqueda);
    const coincideEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activo' && periodo.activo) ||
      (filtroEstado === 'inactivo' && !periodo.activo);

    return coincideNombre && coincideEstado;
  });

  const confirmarEliminacion = async () => {
    if (!periodoAEliminar) return;
    setEliminando(true);

    try {
      const res = await fetch(`/api/periodos?id=${periodoAEliminar.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        toast.success('Periodo eliminado correctamente');
        setMostrarConfirmacion(false);
        setPeriodoAEliminar(null);
        cargarPeriodos();
      } else {
        toast.error(data.error || 'Error al intentar eliminar');
      }
    } catch {
      toast.error('Error de red al comunicar con el servidor');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center text-[#0b6e3f]">
            <Calendar className="w-5 h-5 mr-2" /> Gestión de Periodos Escolares
          </h2>
          <p className="text-xs text-gray-500 mt-1">Configuración de periodos escolares</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="bg-[#0b6e3f] text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center hover:bg-green-800 transition-colors shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo Periodo
        </button>
      </div>


      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre del periodo..."
            className="w-full border-2 border-gray-300 rounded-sm pl-9 pr-3 py-2 text-sm text-black outline-none focus:ring-[#0b6e3f]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            { valor: 'todos', texto: 'Todos' },
            { valor: 'activo', texto: 'Activo' },
            { valor: 'inactivo', texto: 'Inactivos' },
          ] as { valor: FiltroEstado; texto: string }[]).map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setFiltroEstado(opcion.valor)}
              className={`px-4 py-2 rounded-sm text-xs font-bold border transition-colors ${
                filtroEstado === opcion.valor
                  ? 'bg-[#0b6e3f] text-white border-[#0b6e3f]'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {opcion.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {periodosFiltrados.map((p) => (
          <div
            key={p.id}
            className={`p-5 border rounded-lg shadow-sm flex flex-col relative overflow-hidden transition-all ${
              p.activo ? 'border-green-600 bg-green-50/20 ring-1 ring-green-600' : 'border-gray-200 bg-white'
            }`}
          >
            {p.activo && (
              <div className="absolute right-0 top-0 bg-green-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                Activo
              </div>
            )}

            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-black text-gray-800">{p.nombre}</h3>
              <div className="flex gap-1 z-10">
                {/* Botón para abrir el modal de asuetos */}
                <button
                  onClick={() => abrirModalAsueto(p)}
                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                  title="Añadir asueto"
                >
                  <CalendarPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => abrirModal(p)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => intentarEliminar(p)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  disabled={p.activo}
                  title={p.activo ? "No puedes eliminar el periodo activo" : "Eliminar"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p><span className="font-bold text-gray-700">Inicio:</span> {p.fechaInicio}</p>
              <p><span className="font-bold text-gray-700">Término:</span> {p.fechaFin}</p>
            </div>

            <div className="mt-auto pt-2">
              {p.activo ? (
                <div className="text-xs font-bold text-green-700 flex items-center gap-1.5 bg-green-100/60 p-2 rounded w-full justify-center">
                  <CheckCircle className="w-4 h-4" /> Las sesiones usarán este rango
                </div>
              ) : (
                <button
                  onClick={() => activarPeriodo(p)}
                  className="w-full text-center text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded transition-colors"
                >
                  Activar como ciclo actual
                </button>
              )}
            </div>
          </div>
        ))}
        {periodosFiltrados.length === 0 && (
          <div className="col-span-full py-8 text-center text-gray-500 font-medium border-2 border-dashed rounded-lg">
            {periodos.length === 0
              ? 'No hay periodos registrados. Comienza creando uno nuevo.'
              : 'No se encontraron periodos con esos filtros.'}
          </div>
        )}
      </div>

      {/* Modal de Creación/Edición */}
      {modalAbierto && (
        <FormularioPeriodos
          cerrarModal={cerrarModal}
          cargar={cargarPeriodos}
          idProp={editId}
          nombreProp={nombre}
          fechaInicioProp={fechaInicio}
          fechaFinProp={fechaFin}
        />
      )}

      {/* Modal de Asuetos */}
      {modalAsuetoAbierto && periodoParaAsueto !== null && (
        <FormularioAsuetos
          periodo={periodoParaAsueto}
          onClose={cerrarModalAsueto}
        />
      )}

      {/* Modal Confirmar Eliminación */}
      {mostrarConfirmacion && periodoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar Periodo?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de eliminar el periodo <span className="font-bold text-gray-800">"{periodoAEliminar.nombre}"</span>. Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-3 w-full">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                disabled={eliminando}
                className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacion}
                disabled={eliminando}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded flex justify-center items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
              >
                {eliminando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {eliminando ? 'Borrando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
