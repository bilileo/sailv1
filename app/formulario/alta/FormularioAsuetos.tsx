"use client";
import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Periodo {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

interface AsuetoFormProps {
  periodo: Periodo;
  onClose: () => void;
  refreshPeriod?: () => Promise<void>;
}

interface Asueto {
  id?: number;
  periodoID: number;
  motivo: string;
  fechaAsueto: string;
  fechaFinAsueto?: string | null;
}

export const FormularioAsuetos = ({ periodo, onClose, refreshPeriod }: AsuetoFormProps) => {
  const [asuetos, setAsuetos] = useState<Asueto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  // Estados del Formulario
  const [editId, setEditId] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [esRango, setEsRango] = useState(false);
  const [fechaAsueto, setFechaAsueto] = useState('');
  const [fechaFinAsueto, setFechaFinAsueto] = useState('');
  const [error, setError] = useState('');

  // Estados de eliminación
  const [asuetoAEliminar, setAsuetoAEliminar] = useState<Asueto | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const fetchAsuetos = async () => {
    setCargandoDatos(true);
    try {
      const res = await fetch(`/api/asuetos?periodoID=${periodo.id}`);
      const data = await res.json();

      if (res.ok) {
        setAsuetos(data || []);
      } else {
        toast.error(data.error || 'Error al cargar asuetos');
      }
    } catch (e) {
      toast.error('Error de conexión al cargar asuetos');
    } finally {
      setCargandoDatos(false);
    }
  };

  useEffect(() => {
    fetchAsuetos();
  }, [periodo.id]);

  const guardarAsueto = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación de campos
    if (!motivo.trim()) {
      setError('El motivo es obligatorio.');
      return;
    }
    if (!fechaAsueto) {
      setError('La fecha de inicio es obligatoria.');
      return;
    }
    
    const dInicio = new Date(fechaAsueto);
    const dPeriodoInicio = new Date(periodo.fechaInicio);
    const dPeriodoFin = new Date(periodo.fechaFin);

    if (dInicio < dPeriodoInicio || dInicio > dPeriodoFin) {
      setError(`La fecha del asueto debe estar dentro del periodo (${periodo.fechaInicio} a ${periodo.fechaFin}).`);
      return;
    }

    if (esRango) {
      if (!fechaFinAsueto) {
        setError('La fecha de finalización es obligatoria para un rango.');
        return;
      }
      const dFin = new Date(fechaFinAsueto);
      
      if (dFin < dInicio) {
        setError('La fecha de inicio debe ser anterior a la fecha de finalización.');
        return;
      }

      if (dFin > dPeriodoFin) {
        setError(`La fecha de fin del asueto no puede exceder el fin del periodo (${periodo.fechaFin}).`);
        return;
      }
    }

    setError('');
    setCargando(true);

    const dataAInsertar = editId ? {
      id: editId,
      motivo: motivo.trim(),
      fechaAsueto,
      fechaFinAsueto: esRango ? fechaFinAsueto : null
    } : {
      periodoID: periodo.id,
      motivo: motivo.trim(),
      fechaAsueto,
      fechaFinAsueto: esRango ? fechaFinAsueto : null
    };

    try {
      const res = await fetch('/api/asuetos', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataAInsertar),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Error al registrar el asueto en la base de datos.');
      } else {
        toast.success(editId ? 'Asueto actualizado correctamente' : 'Asueto registrado correctamente');
        // Limpiar formulario
        setEditId(null);
        setMotivo('');
        setEsRango(false);
        setFechaAsueto('');
        setFechaFinAsueto('');

        // Recargar la tabla
        fetchAsuetos();

        // Refrescar el componente padre si es necesario
        if (refreshPeriod) {
          await refreshPeriod();
        }
      }
    } catch (e) {
      setError('Error de red al registrar asueto.');
    } finally {
      setCargando(false);
    }
  };

  const editarAsueto = (asueto: Asueto) => {
    setEditId(asueto.id!);
    setMotivo(asueto.motivo);
    setFechaAsueto(asueto.fechaAsueto);
    if (asueto.fechaFinAsueto) {
      setEsRango(true);
      setFechaFinAsueto(asueto.fechaFinAsueto);
    } else {
      setEsRango(false);
      setFechaFinAsueto('');
    }
  };

  const cancelarEdicion = () => {
    setEditId(null);
    setMotivo('');
    setEsRango(false);
    setFechaAsueto('');
    setFechaFinAsueto('');
    setError('');
  };

  const confirmarEliminacion = async () => {
    if (!asuetoAEliminar) return;
    setEliminando(true);
    
    try {
      const res = await fetch(`/api/asuetos?id=${asuetoAEliminar.id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Asueto eliminado');
        setAsuetoAEliminar(null);
        fetchAsuetos();
        if (refreshPeriod) await refreshPeriod();
      } else {
        toast.error(data.error || 'Error al eliminar el asueto');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Cabecera */}
        <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b shrink-0">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-[#0b6e3f]" />
            Gestionar Asuetos - {periodo.nombre}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido (Scrollable) */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={guardarAsueto} className="p-6 space-y-4">

            {/* Mensajes de error */}
            {error && (
              <div className="flex items-start bg-red-50 text-red-600 p-3 rounded border border-red-200 text-xs font-bold">
                <AlertCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Formulario */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Motivo</label>
              <input
                type="text"
                placeholder="Ej. Día de la Independencia"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none focus:ring-[#0b6e3f]"
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="esRango"
                checked={esRango}
                onChange={(e) => setEsRango(e.target.checked)}
                className="w-4 h-4 text-[#0b6e3f] border-gray-300 rounded focus:ring-[#0b6e3f]"
              />
              <label htmlFor="esRango" className="text-sm font-bold text-gray-700 cursor-pointer">
                Es un rango de días
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  {esRango ? 'Fecha de Inicio' : 'Fecha'}
                </label>
                <input
                  type="date"
                  value={fechaAsueto}
                  onChange={(e) => setFechaAsueto(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none focus:ring-[#0b6e3f]"
                />
              </div>

              {esRango && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Fin</label>
                  <input
                    type="date"
                    value={fechaFinAsueto}
                    onChange={(e) => setFechaFinAsueto(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none focus:ring-[#0b6e3f]"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 gap-2">
              {editId && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  disabled={cargando}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={cargando}
                className="px-4 py-2 text-sm font-bold text-white bg-[#0b6e3f] hover:bg-green-800 rounded flex items-center gap-2"
              >
                {cargando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {cargando ? 'Guardando...' : (editId ? 'Actualizar Asueto' : 'Añadir Asueto')}
              </button>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Tabla de Asuetos Registrados */}
            <div className="mt-6">
              <h4 className="text-sm font-bold text-gray-700 mb-3">Asuetos Registrados</h4>
              {cargandoDatos ? (
                <div className="text-center text-sm text-gray-500 py-4">Cargando asuetos...</div>
              ) : asuetos.length > 0 ? (
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3">Motivo</th>
                        <th className="px-4 py-3">Fecha Inicio</th>
                        <th className="px-4 py-3">Fecha Fin</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asuetos.map((asueto, idx) => (
                        <tr key={asueto.id || idx} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{asueto.motivo}</td>
                          <td className="px-4 py-3 text-gray-500">{asueto.fechaAsueto}</td>
                          <td className="px-4 py-3 text-gray-500">{asueto.fechaFinAsueto || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => editarAsueto(asueto)}
                                className="text-blue-600 hover:text-blue-800 p-1"
                                title="Editar asueto"
                              >
                                {/* Usamos un ícono SVG pequeño en vez de importar Edit2 para no saturar importaciones */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => setAsuetoAEliminar(asueto)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Eliminar asueto"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 py-6 border-2 border-dashed rounded-md">
                  No hay asuetos registrados en este periodo.
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
      
      {/* Modal para Confirmar Eliminación */}
      {asuetoAEliminar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar Asueto?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de eliminar el asueto <span className="font-bold text-gray-800">"{asuetoAEliminar.motivo}"</span>. Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-3 w-full">
              <button
                onClick={() => setAsuetoAEliminar(null)}
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
                  <X className="w-4 h-4" />
                )}
                {eliminando ? 'Borrando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
