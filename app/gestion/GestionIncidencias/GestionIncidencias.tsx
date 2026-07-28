"use client";
import React, { useState } from 'react';
import { Plus, Wrench, CheckCircle, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { FormularioIncidencias } from '@/app/formulario/alta/FormularioIncidencias';

interface Incidencias {
  incidencias: Array<{ id: string; status?: string; message?: string; laboratorio?: string; clase?: string; reportador?: string; classSessionId?: string; reportedById?: string; respuesta?: string; resolvedBy?: string }>;
  clases: Array<{ id: string; laboratorio?: string; nombre?: string; maestroId?: string }>;
  usuarioActivo: { id?: string; role?: string; name?: string } | null;
  onIncidenciaActualizada: () => void;
}

export function GestionIncidencias({ incidencias, clases, usuarioActivo, onIncidenciaActualizada } : Incidencias) {
  const [modalAbierto, setModalAbierto] = useState(false);


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

      <div className="space-y-4">
        {incidencias.map(inc => (
          <div key={inc.id} className={`p-4 border-l-4 rounded-r-md border-y border-r shadow-sm flex flex-col md:flex-row justify-between md:items-start gap-4 ${inc.status === 'PENDING' ? 'border-l-yellow-500 bg-yellow-50/30' : 'border-l-green-500 bg-gray-50'}`}>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${inc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {inc.status === 'PENDING' ? 'Pendiente' : 'Resuelta'}
                </span>
                <span className="text-xs text-gray-500 font-bold">{inc.laboratorio} - {inc.clase}</span>
              </div>

              {/* 1. DESCRIPCIÓN ORIGINAL DEL MAESTRO */}
              <div className="mb-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Descripción del problema</span>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{inc.message}</p>
              </div>

              {/* 2. RESPUESTA DEL ADMINISTRADOR/AUXILIAR */}
              {inc.status === 'RESOLVED' && inc.respuesta && (
                <div className="mt-3 bg-green-100/50 border border-green-200 p-3 rounded-sm text-sm text-green-900">
                  <span className="font-bold flex items-center gap-1 text-green-700">
                    Respuesta {inc.resolvedBy ? `de ${inc.resolvedBy}` : ''}:
                  </span>
                  <p className="mt-1 font-medium">{inc.respuesta}</p>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4">Reportado por: {inc.reportador}</p>
            </div>

            <div className="flex items-center space-x-2 border-t md:border-t-0 pt-3 md:pt-0 mt-auto md:mt-0">
              {/* Bloqueo por status: Si está resuelta, SOLO el ADMIN la puede editar/borrar. Si está pendiente, Admin/Auxiliar o el Creador. */}
              {((inc.status === 'RESOLVED' && usuarioActivo?.role === 'ADMIN') ||
                (inc.status === 'PENDING' && (usuarioActivo?.role !== 'MAESTRO' || inc.reportedById === usuarioActivo?.id))) && (
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
              {inc.status === 'PENDING' && usuarioActivo?.role !== 'MAESTRO' && (
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
        ))}
        {incidencias.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">No hay incidencias registradas.</div>
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
