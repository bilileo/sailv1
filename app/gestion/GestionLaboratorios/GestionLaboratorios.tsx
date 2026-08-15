"use client";
import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, X, Building, Monitor, Users, Activity, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Laboratorio {
  id: number;
  name: string;
  building: string;
  capacity: number;
  status: string;
}

export function GestionLaboratorios() {
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados del formulario
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [building, setBuilding] = useState('');
  const [capacity, setCapacity] = useState<number>(30);
  const [status, setStatus] = useState('AVAILABLE');
  const [guardando, setGuardando] = useState(false);

  // Estados para el modal de eliminación
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [laboratorioAEliminar, setLaboratorioAEliminar] = useState<Laboratorio | null>(null);

  const cargarLaboratorios = async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/laboratorios');
      const data = await res.json();
      if (Array.isArray(data)) setLaboratorios(data);
    } catch (error) {
      toast.error('Error al cargar laboratorios');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarLaboratorios();
  }, []);

  const abrirModal = (lab?: Laboratorio) => {
    if (lab) {
      setEditId(lab.id);
      setNombre(lab.name);
      setBuilding(lab.building || '');
      setCapacity(lab.capacity || 30);
      setStatus(lab.status || 'AVAILABLE');
    } else {
      setEditId(null);
      setNombre('');
      setBuilding('Laboratorios de Sistemas Computacionales');
      setCapacity(30);
      setStatus('AVAILABLE');
    }
    setModalAbierto(true);
  };

const guardarLaboratorio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !building.trim()) {
      toast.error('Llena todos los campos obligatorios');
      return;
    }

    const nombreNormalizado = nombre.trim().toLowerCase();
    const nombreDuplicado = laboratorios.some(
      lab => lab.name.trim().toLowerCase() === nombreNormalizado && lab.id !== editId
    );

    if (nombreDuplicado) {
      toast.error('Ya existe un laboratorio con ese nombre exacto.');
      return;
    }

    setGuardando(true);
    try {
      const method = editId ? 'PUT' : 'POST';
      const body = editId 
        ? { id: editId, name: nombre.trim(), building: building.trim(), capacity, status } 
        : { name: nombre.trim(), building: building.trim(), capacity, status };

      const res = await fetch('/api/laboratorios', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editId ? 'Laboratorio actualizado' : 'Laboratorio creado');
        setModalAbierto(false);
        cargarLaboratorios();
      } else {
        toast.error(data.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error de red');
    } finally {
      setGuardando(false);
    }
  };

  // Prepara el modal de confirmación en lugar de usar confirm()
  const intentarEliminar = (lab: Laboratorio) => {
    setLaboratorioAEliminar(lab);
    setMostrarConfirmacion(true);
  };

  // Ejecuta la eliminación real
  const confirmarEliminacion = async () => {
    if (!laboratorioAEliminar) return;
    setGuardando(true);
    
    try {
      const res = await fetch(`/api/laboratorios?id=${laboratorioAEliminar.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        toast.success('Laboratorio eliminado');
        cargarLaboratorios();
        setMostrarConfirmacion(false);
        setLaboratorioAEliminar(null);
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Error de red');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-200">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Monitor className="w-5 h-5 mr-2 text-[#0b6e3f]" />
            Configuración de Laboratorios
          </h2>
          <p className="text-sm text-gray-500 mt-1">Gestiona los espacios físicos, su capacidad y estado.</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="bg-[#0b6e3f] hover:bg-green-800 text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo
        </button>
      </div>

      <div className="p-6">
        {cargando ? (
          <div className="text-center py-8 text-gray-500">Cargando laboratorios...</div>
        ) : laboratorios.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border border-dashed rounded">No hay laboratorios registrados.</div>
        ) : (
          <div className="overflow-x-auto border rounded-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 font-black text-gray-700 uppercase">Laboratorio</th>
                  <th className="px-4 py-3 font-black text-gray-700 uppercase">Edificio</th>
                  <th className="px-4 py-3 font-black text-gray-700 uppercase text-center">Capacidad</th>
                  <th className="px-4 py-3 font-black text-gray-700 uppercase text-center">Estado</th>
                  <th className="px-4 py-3 font-black text-gray-700 uppercase text-center w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {laboratorios.map(lab => (
                  <tr key={lab.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-800">{lab.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center">
                        <Building className="w-4 h-4 mr-2 text-gray-400" /> {lab.building}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-center font-medium">
                      {lab.capacity} pax
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                        lab.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {lab.status === 'AVAILABLE' ? 'Disponible' : 'Mantenimiento'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center space-x-3">
                        <button onClick={() => abrirModal(lab)} className="text-blue-600 hover:text-blue-800 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {/* Aquí llamamos a la nueva función de intentarEliminar */}
                        <button onClick={() => intentarEliminar(lab)} className="text-red-600 hover:text-red-800 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Creación/Edición */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
              <h3 className="text-lg font-bold text-gray-800">
                {editId ? 'Editar Laboratorio' : 'Nuevo Laboratorio'}
              </h3>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={guardarLaboratorio} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Laboratorio</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Laboratorio A"
                  // Se añadió text-black
                  className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black focus:border-[#0b6e3f] outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Edificio</label>
                <input
                  type="text"
                  value={building}
                  onChange={e => setBuilding(e.target.value)}
                  placeholder="Ej. Laboratorios de Sistemas Computacionales"
                  // Se añadió text-black
                  className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black focus:border-[#0b6e3f] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                    <Users className="w-4 h-4 mr-1 text-gray-500" /> Capacidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={e => setCapacity(parseInt(e.target.value) || 0)}
                    // Se añadió text-black
                    className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black focus:border-[#0b6e3f] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                    <Activity className="w-4 h-4 mr-1 text-gray-500" /> Estado
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    // Se añadió text-black
                    className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black focus:border-[#0b6e3f] outline-none bg-white"
                  >
                    <option value="AVAILABLE">Disponible</option>
                    <option value="MAINTENANCE">Mantenimiento</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 px-4 py-2 text-sm font-bold text-white bg-[#0b6e3f] hover:bg-green-800 rounded-sm transition-colors disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {mostrarConfirmacion && laboratorioAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar laboratorio?</h3>

            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de eliminar permanentemente el <span className="font-bold text-gray-800">"{laboratorioAEliminar.name}"</span>. Esta acción no se puede deshacer.
            </p>

            <div className="flex space-x-3 w-full">
              <button
                onClick={() => {
                  setMostrarConfirmacion(false);
                  setLaboratorioAEliminar(null);
                }}
                disabled={guardando}
                className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacion}
                disabled={guardando}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {guardando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {guardando ? 'Borrando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}