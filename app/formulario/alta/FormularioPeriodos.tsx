"use client";
import React, { useState } from 'react';
import { X, Calendar, AlertCircle, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface PeriodosProps {
  cerrarModal: () => void;
  cargar: () => void;
  idProp: number | null;
  nombreProp: string;
  fechaInicioProp: string;
  fechaFinProp: string;
}

interface Periodo {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export const FormularioPeriodos = ({ cerrarModal, cargar, idProp, nombreProp, fechaInicioProp, fechaFinProp }: PeriodosProps) => {

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Estados de Formulario
  const [editId, setEditId] = useState<number | null>(idProp);
  const [nombre, setNombre] = useState(nombreProp || '');
  const [fechaInicio, setFechaInicio] = useState(fechaInicioProp || '');
  const [fechaFin, setFechaFin] = useState(fechaFinProp || '');
  const [error, setError] = useState('');

  const guardarPeriodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !fechaInicio || !fechaFin) {
      setError('Todos los campos son estrictamente obligatorios.');
      return;
    }

    if (new Date(fechaInicio) >= new Date(fechaFin)) {
      setError('La fecha de inicio debe ser anterior a la fecha de finalización.');
      return;
    }

    setCargando(true);

    // Si estamos editando, mantenemos su estado 'activo' original
    const periodoActual = editId ? periodos.find(p => p.id === editId) : null;
    const bodyPayload = editId
      ? { id: editId, nombre, fechaInicio, fechaFin, activo: periodoActual?.activo }
      : { nombre, fechaInicio, fechaFin };

    try {
      const res = await fetch('/api/periodos', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(editId ? 'Periodo actualizado' : 'Periodo creado correctamente');
        cerrarModal();
        cargar();
      } else {
        setError(data.error || 'Error al guardar el periodo');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            {editId ? <Edit2 className="w-5 h-5 mr-2 text-[#0b6e3f]" /> : <Calendar className="w-5 h-5 mr-2 text-[#0b6e3f]" />}
            {editId ? 'Editar Periodo' : 'Registrar Nuevo Periodo'}
          </h3>
          <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={guardarPeriodo}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="flex items-start bg-red-50 text-red-600 p-3 rounded border border-red-200 text-xs font-bold">
                <AlertCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Periodo</label>
              <input
                type="text"
                placeholder="Ej. 2026-1 o 2026-2"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none focus:ring-[#0b6e3f]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none focus:ring-[#0b6e3f]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none focus:ring-[#0b6e3f]"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3">
            <button
              type="button"
              onClick={cerrarModal}
              disabled={cargando}
              className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-4 py-2 text-sm font-bold text-white bg-[#0b6e3f] hover:bg-green-800 rounded flex items-center gap-2"
            >
              {cargando && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {cargando ? 'Guardando...' : (editId ? 'Actualizar' : 'Crear Periodo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
