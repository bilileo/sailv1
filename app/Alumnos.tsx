"use client";
import { AlertCircle, AlertTriangle, CheckCircle, Edit2, Plus, Trash2, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface StudentMinimal { id: string; name: string; email: string }

export function Alumnos() {
  // Abrir un modal para agregar o editar alumnos
  const [modalAbierto, setModalAbierto] = useState(false);

  // Estados del formulario y validaciones
  const [alumnos, setAlumnos] = useState<StudentMinimal[]>([]);
  const [nombre, setNombre] = useState('');
  const [matricula, setMatricula] = useState('');
  const [matriculaEdit, setMatriculaEdit] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<{
    nombre?: string;
    matricula?: string;
    correo?: string;
    password?: string;
  }>({});

  // Estados apra el modal de Eliminación
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
    setErrores({}); // Limpiamos errores previos
    if (alumnos) {
      setMatricula(alumnos.id); setNombre(alumnos.name); setCorreo(alumnos.email); setPassword('');
    } else {
      setMatricula(''); setNombre(''); setCorreo(''); setPassword('');
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setErrores({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones

    setErrores({});
    const nuevosErrores: { nombre?: string; email?: string; password?: string } = {};

    // Validación de nombre
    if (!nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    } else if (nombre.trim().length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    // Validación de correo
    if (!correo.trim()) {
      nuevosErrores.email = 'El correo es obligatorio';
    } else if (!/^\S+@\S+\.\S+$/.test(correo)) {
      nuevosErrores.email = 'Ingresa un correo electrónico válido';
    }

    // La contraseña es obligatoria si es nuevo usuario. Si está editando, es opcional.
    if (!matriculaEdit && !password.trim()) {
      nuevosErrores.password = 'La contraseña es obligatoria para nuevos usuarios';
    } else if (password && password.length < 6) {
      nuevosErrores.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    // Validación final
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      toast.error('Por favor corrige los errores antes de guardar');
      return;
    }

    // Carga solo si ya pasó las validaciones
    setLoading(true);


    // Si se presionó el botón de editar, el método será PUT, si no, POST

    const method = matriculaEdit ? 'PUT' : matricula ? 'POST' : 'PUT';

    try {
      // Obtener datos del formulario y enviarlos al backend
      const res = await fetch('/api/estudiante', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: matriculaEdit || matricula, name: nombre, email: correo, password })
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(matriculaEdit ? 'Alumno actualizado correctamente' : matricula ? 'Alumno registrado correctamente' : 'Alumno actualizado correctamente');
        cerrarModal();
        cargar();
      } else {
        toast.error(data.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error de red al comunicar con el servidor');
    } finally {
      setLoading(false);
    }
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Edit2 className="w-5 h-5 mr-2 text-[#0b6e3f]" />
                {matriculaEdit ? `Editar ${nombre}` : 'Nuevo alumno'}
              </h3>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                { /* Validación Matricula */ }
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Matrícula</label>
                  <input
                    placeholder="Matrícula"
                    type="text" 
                    value={matricula} 
                    onChange={e => {
                      setMatricula(e.target.value);
                      if (errores.matricula) setErrores({ ...errores, matricula: undefined });
                    }} 
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${
                      errores.matricula ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
                    }`} 
                  />
                </div>

                {/* Validación Nombre */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                  <input
                    placeholder="Nombre"
                    type="text" 
                    value={nombre} 
                    onChange={e => {
                      setNombre(e.target.value);
                      if (errores.nombre) setErrores({ ...errores, nombre: undefined });
                    }} 
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${
                      errores.nombre ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
                    }`} 
                  />
                </div>

                {/* Validación Correo */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Correo</label>
                  <input
                    placeholder="Correo"
                    type="text" 
                    value={correo} 
                    onChange={e => {
                      setCorreo(e.target.value);
                      if (errores.correo) setErrores({ ...errores, correo: undefined });
                    }} 
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${
                      errores.correo ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
                    }`} 
                  />
                  {errores.correo && (
                    <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
                      <span>{errores.correo}</span>
                    </div>
                  )}
                </div>

                {/* Validación Contraseña */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Contraseña {matriculaEdit && <span className="text-gray-400 font-normal text-xs">(Opcional, dejar en blanco para no cambiar)</span>}
                  </label>
                  <input
                    placeholder="Contraseña"
                    type="password" 
                    value={password} 
                    onChange={e => {
                      setPassword(e.target.value);
                      if (errores.password) setErrores({ ...errores, password: undefined });
                    }} 
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${
                      errores.password ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
                    }`} 
                  />
                  {errores.password && (
                    <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
                      <span>{errores.password}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-sm font-bold text-white rounded transition-colors shadow-sm flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0b6e3f] hover:bg-green-800 active:scale-95'
                    }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
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
              Estás a punto de eliminar permanentemente a <span className="font-bold text-gray-800">&quot;{estudianteAEliminar.name}&quot;</span>. Esta acción no se puede deshacer.
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
