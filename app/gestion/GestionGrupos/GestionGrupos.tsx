"use client";

import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Edit2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { FormularioGrupos } from '@/app/formulario/alta/FormularioGrupos';

interface Grupo {
  id: number;
  nombre: string;
  createdAt?: string;
}

interface GestionGruposProps {
  onGruposActualizados?: () => void;
}

export function GestionGrupos({ onGruposActualizados }: GestionGruposProps) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalAsignaturasAbierto, setModalAsignaturasAbierto] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [grupoAEliminar, setGrupoAEliminar] = useState<Grupo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarGrupos = async () => {
    setCargando(true);

    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/grupos?t=${timestamp}`, { cache: 'no-store' });

      if (res.ok) {
        setGrupos(await res.json());
      } else {
        toast.error('Error al cargar grupos');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al cargar grupos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarGrupos();
  }, []);

  const abrirModal = (grupo?: Grupo) => {
    setError('');

    if (grupo) {
      setEditId(grupo.id);
      setNombre(grupo.nombre);
    } else {
      setEditId(null);
      setNombre('');
    }

    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setError('');
    setEditId(null);
    setNombre('');
  };

  const guardarGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setError('El nombre del grupo es obligatorio');
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch('/api/grupos', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, nombre: nombreLimpio } : { nombre: nombreLimpio })
      });

      if (res.ok) {
        toast.success(editId ? 'Grupo actualizado' : 'Grupo creado correctamente');
        cerrarModal();
        await cargarGrupos();
        onGruposActualizados?.();
      } else {
        const data = await res.json();
        setError(data.error || 'No se pudo guardar el grupo');
        toast.error(data.error || 'No se pudo guardar el grupo');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al guardar grupo');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!grupoAEliminar) return;

    setEliminando(true);

    try {
      const res = await fetch(`/api/grupos?id=${grupoAEliminar.id}`, { method: 'DELETE' });

      if (res.ok) {
        toast.success('Grupo eliminado');
        setGrupoAEliminar(null);
        await cargarGrupos();
        onGruposActualizados?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'No se pudo eliminar el grupo');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al eliminar grupo');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Gestión de grupos</h2>
          <p className="text-sm text-gray-500 mt-1">Crea y administra los grupos que se asignan a las clases.</p>
        </div>

        <button
          onClick={() => abrirModal()}
          className="bg-[#0b6e3f] text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center hover:bg-green-800 transition-colors shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo Grupo
        </button>
      </div>

      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-black text-gray-600 uppercase tracking-wider">Grupo</th>
              <th className="px-4 py-3 text-xs font-black text-gray-600 uppercase tracking-wider w-40 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500 font-medium">Cargando grupos...</td>
              </tr>
            ) : grupos.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500 font-medium">No hay grupos registrados.</td>
              </tr>
            ) : (
              grupos.map((grupo) => (
                <tr key={grupo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800 font-bold">{grupo.nombre}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setSelectedGroupId(grupo.id); setModalAsignaturasAbierto(true); }}
                        className="px-3 py-1.5 text-xs font-bold text-[#0b6e3f] bg-green-50 hover:bg-green-100 rounded transition-colors flex items-center gap-1 border border-green-200"
                        title="Añadir asignaturas"
                      >
                        <Plus className="w-3 h-3" /> Asignaturas
                      </button>
                      <button
                        onClick={() => abrirModal(grupo)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="Editar grupo"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setGrupoAEliminar(grupo)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Eliminar grupo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                {editId ? <Edit2 className="w-5 h-5 mr-2 text-blue-600" /> : <Plus className="w-5 h-5 mr-2 text-[#0b6e3f]" />}
                {editId ? 'Editar grupo' : 'Nuevo grupo'}
              </h3>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={guardarGrupo}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex items-start bg-red-50 text-red-600 p-3 rounded-sm text-xs font-bold border border-red-200">
                    <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del grupo</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => {
                      setNombre(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Ej. 501, 502, A, B..."
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium outline-none transition-colors ${
                      error ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#0b6e3f]'
                    }`}
                  />
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className={`px-4 py-2 text-sm font-bold text-white rounded transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 ${editId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#0b6e3f] hover:bg-green-800'}`}
                >
                  {guardando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle className="w-4 h-4" />}
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {grupoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar grupo?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de eliminar el grupo <span className="font-bold text-gray-800">{grupoAEliminar.nombre}</span>.
              Si alguna clase lo usa, quedará sin grupo asignado.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setGrupoAEliminar(null)}
                disabled={eliminando}
                className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacion}
                disabled={eliminando}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {eliminando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Trash2 className="w-4 h-4" />}
                {eliminando ? 'Borrando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAsignaturasAbierto && selectedGroupId && (
        <FormularioGrupos groupId={selectedGroupId} onClose={() => setModalAsignaturasAbierto(false)} />
      )}
    </div>
  );
}
