"use client";
import React, { useState } from 'react';
import { Plus, X, AlertCircle, Wrench, CheckCircle, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function GestionIncidencias({ 
  incidencias, 
  clases, 
  usuarioActivo, 
  onIncidenciaActualizada 
}: { 
  incidencias: any[], 
  clases: any[], 
  usuarioActivo: any,
  onIncidenciaActualizada: () => void 
}) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  // Formulario (Sirve para Crear y Editar)
  const [editId, setEditId] = useState<string | null>(null);
  const [claseId, setClaseId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Modales de Confirmación
  const [incidenciaAResolver, setIncidenciaAResolver] = useState<string | null>(null);
  const [incidenciaAEliminar, setIncidenciaAEliminar] = useState<any | null>(null);
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const abrirModalFormulario = (inc?: any) => {
    setError('');
    if (inc) {
      setEditId(inc.id);
      setClaseId(inc.classSessionId);
      setMensaje(inc.message);
    } else {
      setEditId(null);
      setClaseId('');
      setMensaje('');
    }
    setModalAbierto(true);
  };

  const guardarIncidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claseId || !mensaje.trim()) {
      setError('Debes seleccionar una clase y describir la falla.');
      return;
    }

    setCargando(true);
    const url = '/api/incidencias';
    const method = editId ? 'PUT' : 'POST';
    const body = JSON.stringify(
      editId 
        ? { id: editId, classSessionId: claseId, message: mensaje } // Modo Edición
        : { classSessionId: claseId, reportedById: usuarioActivo.id, message: mensaje } // Modo Creación
    );

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body });
      if (res.ok) {
        toast.success(editId ? 'Incidencia actualizada' : 'Incidencia reportada correctamente');
        setModalAbierto(false);
        onIncidenciaActualizada();
      } else {
        toast.error('Error al guardar la falla');
      }
    } catch (err) {
      toast.error('Error de red');
    } finally {
      setCargando(false);
    }
  };

  const confirmarResolucion = async () => {
    if (!incidenciaAResolver) return;
    setProcesandoAccion(true);

    try {
      const res = await fetch('/api/incidencias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: incidenciaAResolver, status: 'RESOLVED' })
      });
      
      if (res.ok) {
        toast.success('Incidencia resuelta');
        setIncidenciaAResolver(null);
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
          <Wrench className="w-5 h-5 mr-2 text-yellow-600" /> Control de Hardware
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
          <div key={inc.id} className={`p-4 border-l-4 rounded-r-md border-y border-r shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 ${inc.status === 'PENDING' ? 'border-l-yellow-500 bg-yellow-50/30' : 'border-l-green-500 bg-gray-50'}`}>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${inc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {inc.status === 'PENDING' ? 'Pendiente' : 'Resuelta'}
                </span>
                <span className="text-xs text-gray-500 font-bold">{inc.laboratorio} - {inc.clase}</span>
              </div>
              <p className="text-sm font-medium text-gray-800 mt-2">{inc.message}</p>
              <p className="text-xs text-gray-500 mt-2">Reportado por: {inc.reportador}</p>
            </div>
            
            <div className="flex items-center space-x-2 border-t md:border-t-0 pt-3 md:pt-0">
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                {editId ? <Edit2 className="w-5 h-5 mr-2 text-blue-600" /> : <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />}
                {editId ? 'Editar reporte' : 'Reportar Falla'}
              </h3>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={guardarIncidencia}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex items-start bg-red-50 text-red-600 p-3 rounded-sm text-xs font-bold mb-2 border border-red-200">
                    <AlertCircle className="w-4 h-4 mr-1.5 flex-shrink-0" /><span>{error}</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Clase afectada</label>
                  <select 
                    value={claseId} 
                    onChange={e => { setClaseId(e.target.value); if (error) setError(''); }} 
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${editId ? 'focus:ring-blue-600 border-gray-300' : 'focus:ring-yellow-600 border-gray-300'}`}
                  >
                    <option value="">Selecciona la clase actual...</option>
                    {clases
                      .filter(c => usuarioActivo?.role === 'MAESTRO' ? c.maestroId === usuarioActivo.id : true)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.laboratorio} - {c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Descripción del problema</label>
                  <textarea 
                    rows={4}
                    value={mensaje} 
                    onChange={e => { setMensaje(e.target.value); if (error) setError(''); }} 
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none resize-none transition-colors ${editId ? 'focus:ring-blue-600 border-gray-300' : 'focus:ring-yellow-600 border-gray-300'}`}
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3">
                <button type="button" onClick={() => setModalAbierto(false)} disabled={cargando} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={cargando} className={`px-4 py-2 text-sm font-bold text-white rounded transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 ${editId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
                  {cargando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                  {cargando ? 'Guardando...' : (editId ? 'Actualizar' : 'Reportar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE RESOLUCIÓN ================= */}
      {incidenciaAResolver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Resolver incidencia?</h3>
            <p className="text-sm text-gray-600 mb-6">Estás a punto de marcar esta falla como <span className="font-bold text-green-600">RESUELTA</span>.</p>
            <div className="flex space-x-3 w-full">
              <button onClick={() => setIncidenciaAResolver(null)} disabled={procesandoAccion} className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded">Cancelar</button>
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