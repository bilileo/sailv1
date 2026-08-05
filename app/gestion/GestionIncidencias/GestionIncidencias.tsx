"use client";

import React, { useMemo, useState } from 'react';
import { Plus, Wrench, CheckCircle, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { FormularioIncidencias } from '@/app/formulario/alta/FormularioIncidencias';

interface Incidencias {
  incidencias: Array<{ id: string; status?: string; message?: string; laboratorio?: string; clase?: string; reportador?: string; classSessionId?: string; reportedById?: string; respuesta?: string; resolvedBy?: string; createdAt?: string; fecha?: string; reportedAt?: string; }>;
  clases: Array<{ id: string; laboratorio?: string; nombre?: string; maestroId?: string | number }>;
  usuarioActivo: { id?: string; role?: string; name?: string } | null;
  onIncidenciaActualizada: () => void;
}

type Incidencia = {
  id: string;
  status?: string;
  message?: string;
  laboratorio?: string;
  clase?: string;
  reportador?: string;
  classSessionId?: string;
  reportedById?: string;
  respuesta?: string;
  resolvedBy?: string;
  createdAt?: string;
  fecha?: string;
  reportedAt?: string;
  profesor?: string;
  maestro?: string;
  teacher?: string;
};

type FiltroEstado = 'TODAS' | 'PENDING' | 'RESOLVED';

const obtenerFechaISO = (valor?: string) => {
  if (!valor) return '';

  if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
    return valor.slice(0, 10);
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';

  return fecha.toISOString().slice(0, 10);
};

const formatearFecha = (valor?: string) => {
  const fechaISO = obtenerFechaISO(valor);
  if (!fechaISO) return '';

  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio}`;
};

const obtenerProfesorIncidencia = (inc: Incidencia) => {
  return inc.reportador || inc.profesor || inc.maestro || inc.teacher || '';
};

export function GestionIncidencias({ incidencias, clases, usuarioActivo, onIncidenciaActualizada } : Incidencias) {
  const [modalAbierto, setModalAbierto] = useState(false);

  const [filtroLaboratorio, setFiltroLaboratorio] = useState('');
  const [filtroProfesor, setFiltroProfesor] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODAS');

  // Formulario (Sirve para Crear y Editar)
  const [editId, setEditId] = useState<string | null>(null);
  const [claseId, setClaseId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Modales de Confirmación
  const [incidenciaAResolver, setIncidenciaAResolver] = useState<string | null>(null);
  const [incidenciaAEliminar, setIncidenciaAEliminar] = useState<{ id?: string } | null>(null);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [respuestaAdmin, setRespuestaAdmin] = useState('');

  const laboratoriosDisponibles = useMemo(() => {
    return Array.from(
      new Set(
        incidencias
          .map((inc) => inc.laboratorio)
          .filter((lab): lab is string => Boolean(lab))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [incidencias]);

  const profesoresDisponibles = useMemo(() => {
    return Array.from(
      new Set(
        incidencias
          .map((inc) => obtenerProfesorIncidencia(inc))
          .filter((profesor): profesor is string => Boolean(profesor))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [incidencias]);

  const hayFiltrosActivos = Boolean(filtroLaboratorio || filtroProfesor || filtroFecha || filtroEstado !== 'TODAS');

  const incidenciasFiltradas = incidencias.filter((inc) => {
    const statusIncidencia = inc.status === 'RESOLVED' ? 'RESOLVED' : 'PENDING';
    const profesorIncidencia = obtenerProfesorIncidencia(inc);
    const fechaIncidencia = obtenerFechaISO(inc.createdAt || inc.fecha || inc.reportedAt);

    const cumpleLaboratorio = !filtroLaboratorio || inc.laboratorio === filtroLaboratorio;
    const cumpleProfesor = !filtroProfesor || profesorIncidencia === filtroProfesor;
    const cumpleFecha = !filtroFecha || fechaIncidencia === filtroFecha;
    const cumpleEstado = filtroEstado === 'TODAS' || statusIncidencia === filtroEstado;

    return cumpleLaboratorio && cumpleProfesor && cumpleFecha && cumpleEstado;
  });

  const limpiarFiltros = () => {
    setFiltroLaboratorio('');
    setFiltroProfesor('');
    setFiltroFecha('');
    setFiltroEstado('TODAS');
  };

  const estiloBotonEstado = (estado: FiltroEstado) => {
    const activo = filtroEstado === estado;

    if (activo && estado === 'PENDING') {
      return 'bg-yellow-600 text-white border-yellow-600';
    }

    if (activo && estado === 'RESOLVED') {
      return 'bg-green-600 text-white border-green-600';
    }

    if (activo) {
      return 'bg-gray-800 text-white border-gray-800';
    }

    return 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100';
  };

  const abrirModalFormulario = (inc?: { id?: string; classSessionId?: string; message?: string }) => {
    setError('');
    if (inc) {
      setEditId(inc.id || null);
      setClaseId(inc.classSessionId || '');
      setMensaje(inc.message || '');
    } else {
      setEditId(null);
      setClaseId('');
      setMensaje('');
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
  }

  const confirmarResolucion = async () => {
    if (!incidenciaAResolver) return;
    setProcesandoAccion(true);

    try {
      const res = await fetch('/api/incidencias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: incidenciaAResolver,
          status: 'RESOLVED',
          respuesta: respuestaAdmin,
          resolvedBy: usuarioActivo?.name || 'Administrador'
        })
      });

      if (res.ok) {
        toast.success('Incidencia resuelta');
        setIncidenciaAResolver(null);
        setRespuestaAdmin('');
        onIncidenciaActualizada();
      }
    } finally {
      setProcesandoAccion(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!incidenciaAEliminar) return;
    setProcesandoAccion(true);

    try {
      const res = await fetch(`/api/incidencias?id=${incidenciaAEliminar.id}`, { method: 'DELETE' });

      if (res.ok) {
        toast.success('Incidencia borrada del sistema');
        setIncidenciaAEliminar(null);
        onIncidenciaActualizada();
      }
    } finally {
      setProcesandoAccion(false);
    }
  };

  return (
    <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center text-yellow-600">
          <Wrench className="w-5 h-5 mr-2 text-yellow-600" /> Control de incidencias
        </h2>
        <button
          onClick={() => abrirModalFormulario()}
          className="bg-yellow-600 text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center hover:bg-yellow-700 transition-colors shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" /> Reportar Falla
        </button>
      </div>

      <div className="mb-6 rounded-sm border border-gray-200 bg-gray-50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
              Laboratorio
            </label>
            <select
              value={filtroLaboratorio}
              onChange={(e) => setFiltroLaboratorio(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-sm px-3 py-2 text-sm text-black outline-none focus:border-yellow-600 bg-white"
            >
              <option value="">Todos los laboratorios</option>
              {laboratoriosDisponibles.map((lab) => (
                <option key={lab} value={lab}>{lab}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
              Profesor
            </label>
            <select
              value={filtroProfesor}
              onChange={(e) => setFiltroProfesor(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-sm px-3 py-2 text-sm text-black outline-none focus:border-yellow-600 bg-white"
            >
              <option value="">Todos los profesores</option>
              {profesoresDisponibles.map((profesor) => (
                <option key={profesor} value={profesor}>{profesor}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
              Fecha
            </label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-sm px-3 py-2 text-sm text-black outline-none focus:border-yellow-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
              Estado
            </label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setFiltroEstado('TODAS')}
                className={`border px-2 py-2 rounded-sm text-xs font-bold transition-colors ${estiloBotonEstado('TODAS')}`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('PENDING')}
                className={`border px-2 py-2 rounded-sm text-xs font-bold transition-colors ${estiloBotonEstado('PENDING')}`}
              >
                Pendientes
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('RESOLVED')}
                className={`border px-2 py-2 rounded-sm text-xs font-bold transition-colors ${estiloBotonEstado('RESOLVED')}`}
              >
                Resueltas
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-gray-500 font-medium">
            Mostrando {incidenciasFiltradas.length} de {incidencias.length} incidencias
          </p>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-xs font-bold text-gray-600 hover:text-yellow-700 underline self-start sm:self-auto"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {incidenciasFiltradas.map(inc => {
          const statusIncidencia = inc.status === 'RESOLVED' ? 'RESOLVED' : 'PENDING';
          const fechaIncidencia = formatearFecha(inc.createdAt || inc.fecha || inc.reportedAt);

          return (
            <div key={inc.id} className={`p-4 border-l-4 rounded-r-md border-y border-r shadow-sm flex flex-col md:flex-row justify-between md:items-start gap-4 ${statusIncidencia === 'PENDING' ? 'border-l-yellow-500 bg-yellow-50/30' : 'border-l-green-500 bg-gray-50'}`}>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${statusIncidencia === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {statusIncidencia === 'PENDING' ? 'Pendiente' : 'Resuelta'}
                  </span>
                  <span className="text-xs text-gray-500 font-bold">{inc.laboratorio} - {inc.clase}</span>
                  {fechaIncidencia && (
                    <span className="text-xs text-gray-400 font-medium">Fecha: {fechaIncidencia}</span>
                  )}
                </div>

                {/* 1. DESCRIPCIÓN ORIGINAL DEL MAESTRO */}
                <div className="mb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Descripción del problema</span>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{inc.message}</p>
                </div>

                {/* 2. RESPUESTA DEL ADMINISTRADOR/AUXILIAR */}
                {statusIncidencia === 'RESOLVED' && inc.respuesta && (
                  <div className="mt-3 bg-green-100/50 border border-green-200 p-3 rounded-sm text-sm text-green-900">
                    <span className="font-bold flex items-center gap-1 text-green-700">
                      Respuesta {inc.resolvedBy ? `de ${inc.resolvedBy}` : ''}:
                    </span>
                    <p className="mt-1 font-medium">{inc.respuesta}</p>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-4">Reportado por: {obtenerProfesorIncidencia(inc) || 'Sin registro'}</p>
              </div>

              <div className="flex items-center space-x-2 border-t md:border-t-0 pt-3 md:pt-0 mt-auto md:mt-0">
                {/* Bloqueo por status: Si está resuelta, SOLO el ADMIN la puede editar/borrar. Si está pendiente, Admin/Auxiliar o el Creador. */}
                {((statusIncidencia === 'RESOLVED' && usuarioActivo?.role === 'ADMIN') ||
                  (statusIncidencia === 'PENDING' && (usuarioActivo?.role !== 'MAESTRO' || inc.reportedById === usuarioActivo?.id))) && (
                    <>
                      <button
                        onClick={() => abrirModalFormulario(inc)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors" title="Editar reporte"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIncidenciaAEliminar(inc)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors" title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}

                {/* Botón de Resolver (Solo Admin o Auxiliar si está pendiente) */}
                {statusIncidencia === 'PENDING' && usuarioActivo?.role !== 'MAESTRO' && (
                  <button
                    onClick={() => setIncidenciaAResolver(inc.id)}
                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition-colors active:scale-95 shadow-sm ml-2"
                    title="Marcar como resuelto"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {incidencias.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">No hay incidencias registradas.</div>
        )}

        {incidencias.length > 0 && incidenciasFiltradas.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">No se encontraron incidencias con esos filtros.</div>
        )}
      </div>

      {/* ================= MODAL FORMULARIO (CREAR/EDITAR) ================= */}
      {modalAbierto && (
        <FormularioIncidencias
          cerrarModal={cerrarModal}
          clases={clases}
          usuarioActivo={usuarioActivo}
          onIncidenciaActualizada={onIncidenciaActualizada}
          editId={editId}
          claseIdProp={claseId}
          mensajeProp={mensaje}
        />
      )}

      {/* ================= MODAL DE RESOLUCIÓN ================= */}
      {incidenciaAResolver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Resolver incidencia?</h3>
            <p className="text-sm text-gray-600 mb-4">Estás a punto de marcar esta falla como <span className="font-bold text-green-600">RESUELTA</span>.</p>

            <div className="text-left mb-6">
              <label className="block text-xs font-bold text-gray-700 mb-1">Mensaje de respuesta (Opcional):</label>
              <textarea
                value={respuestaAdmin}
                onChange={(e) => setRespuestaAdmin(e.target.value)}
                placeholder="Ej. El proyector ya fue reemplazado..."
                className="w-full border-2 border-gray-200 rounded-sm px-3 py-2 text-sm text-black outline-none focus:border-green-600 resize-none transition-colors"
                rows={3}
              />
            </div>

            <div className="flex space-x-3 w-full">
              <button
                onClick={() => {
                  setIncidenciaAResolver(null);
                  setRespuestaAdmin('');
                }}
                disabled={procesandoAccion}
                className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Cancelar
              </button>
              <button onClick={confirmarResolucion} disabled={procesandoAccion} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded flex justify-center items-center gap-2">
                {procesandoAccion ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle className="w-4 h-4" />}
                {procesandoAccion ? 'Guardando...' : 'Sí, resolver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE ELIMINACIÓN ================= */}
      {incidenciaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar registro?</h3>
            <p className="text-sm text-gray-600 mb-6">Estás a punto de eliminar esta incidencia. Esta acción limpiará la base de datos y <span className="font-bold text-red-600">no se puede deshacer</span>.</p>
            <div className="flex space-x-3 w-full">
              <button onClick={() => setIncidenciaAEliminar(null)} disabled={procesandoAccion} className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded">Cancelar</button>
              <button onClick={confirmarEliminacion} disabled={procesandoAccion} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded flex justify-center items-center gap-2">
                {procesandoAccion ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Trash2 className="w-4 h-4" />}
                {procesandoAccion ? 'Borrando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
