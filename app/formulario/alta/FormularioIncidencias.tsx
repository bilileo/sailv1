"use client";
import React, { useState } from 'react';
import { X, AlertCircle, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface IncidenciasProps {
  cerrarModal: () => void
  clases: Array<{ id: string; laboratorio?: string; nombre?: string; maestroId?: string }>;
  usuarioActivo: { id?: string; role?: string; name?: string } | null;
  onIncidenciaActualizada: () => void;
  editId: string | null;
  claseIdProp: string;
  mensajeProp: string;
}

export const FormularioIncidencias = ({ cerrarModal, clases, usuarioActivo, onIncidenciaActualizada, editId, claseIdProp, mensajeProp }: IncidenciasProps) => {
  const [cargando, setCargando] = useState(false);

  // Formulario (Sirve para Crear y Editar)
  const [claseId, setClaseId] = useState(claseIdProp || '');
  const [mensaje, setMensaje] = useState(mensajeProp || '');
  const [error, setError] = useState('');

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
        : { classSessionId: claseId, reportedById: usuarioActivo?.id, message: mensaje } // Modo Creación
    );

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body });
      if (res.ok) {
        toast.success(editId ? 'Incidencia actualizada' : 'Incidencia reportada correctamente');
        cerrarModal();
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            {editId ? <Edit2 className="w-5 h-5 mr-2 text-blue-600" /> : <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />}
            {editId ? 'Editar reporte' : 'Reportar Falla'}
          </h3>
          <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
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
            <button type="button" onClick={cerrarModal} disabled={cargando} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={cargando} className={`px-4 py-2 text-sm font-bold text-white rounded transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 ${editId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
              {cargando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
              {cargando ? 'Guardando...' : (editId ? 'Actualizar' : 'Reportar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
