"use client";
import { AlertTriangle, Edit2, Plus, Trash2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FormularioAlumnos } from '@/app/formulario/alta/FormularioAlumnos';

interface StudentMinimal { id: string; name: string; email: string }

export function Alumnos() {
  // Abrir un modal para agregar o editar alumnos
  const [modalAbierto, setModalAbierto] = useState(false);
  const [idSeleccionado, setIdSeleccionado] = useState<string | null>(null);

  const [alumnos, setAlumnos] = useState<StudentMinimal[]>([]);
  const [nombre, setNombre] = useState('');
  const [matricula, setMatricula] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<{
    nombre?: string;
    matricula?: string;
    correo?: string;
    password?: string;
  }>({});

  // Estados para el modal de Eliminación
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [estudianteAEliminar, setEstudianteAEliminar] = useState<StudentMinimal | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = async () => {
    try {
      const res = await fetch('/api/estudiante');
      if (res.ok) setAlumnos(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirModal = (alumnos?: StudentMinimal) => {
    setErrores({});
    if (alumnos) {
      setIdSeleccionado(alumnos.id); setMatricula(alumnos.id); setNombre(alumnos.name); setCorreo(alumnos.email); setPassword('');
    } else {
      setIdSeleccionado(null); setMatricula(''); setNombre(''); setCorreo(''); setPassword('');
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setErrores({});
  };

  const intentarEliminar = (estudiante: StudentMinimal) => {
    setEstudianteAEliminar(estudiante);
    setMostrarConfirmacion(true);
  };

  const confirmarEliminacion = async () => {
    if (!estudianteAEliminar) return;
    setEliminando(true);

    try {
      const res = await fetch(`/api/estudiante?id=${estudianteAEliminar.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        toast.success(`${estudianteAEliminar.name} eliminado correctamente`);
        setMostrarConfirmacion(false);
        setEstudianteAEliminar(null);
        cargar();
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Error de red al comunicar con el servidor');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border rounded shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold mb-6 flex items-center text-[#0b6e3f]">Listado de Alumnos</h3>
          <button
            onClick={() => abrirModal()}
            className="bg-[#0b6e3f] text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center hover:bg-green-800 transition-colors shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" /> Agregar alumno
          </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase">Matricula</th>
              <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase">Nombre</th>
              <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase">Correo</th>
              <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.length === 0 && <div className="text-sm text-gray-500">No hay alumnos registrados</div>}
            {alumnos.map(a => (
              <tr key={a.id || a.email} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-600">{a.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{a.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{a.email}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => abrirModal(a)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => intentarEliminar(a)}
                    className={`p-2 rounded transition-colors ${eliminando && estudianteAEliminar?.id === a.id ?
                      'bg-red-100 text-red-600 cursor-not-allowed' :
                      'text-red-600 hover:bg-red-100'}`}
                    title={"Eliminar"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <FormularioAlumnos
          cerrarModal={cerrarModal}
          cargar={cargar}
          idSeleccionado={idSeleccionado}
          matriculaProp={matricula}
          nombreProp={nombre}
          correoProp={correo}
          passwordProp={password}
          />
      )}

      {/* ================= SUB-MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ================= */}
      {mostrarConfirmacion && estudianteAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar a {estudianteAEliminar.name}?</h3>

            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de eliminar permanentemente a <span className="font-bold text-gray-800">"{estudianteAEliminar.name}"</span>. Esta acción no se puede deshacer.
            </p>

            <div className="flex space-x-3 w-full">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                disabled={eliminando}
                className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacion}
                disabled={eliminando}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
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
