"use client";
import { AlertTriangle, Edit2, Plus, Trash2, Search, RefreshCcw } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FormularioAlumnos } from '@/app/formulario/alta/FormularioAlumnos';

interface StudentMinimal { 
  id: string; 
  name: string; 
  lastName: string; 
  email: string;
  activo?: boolean; 
}

export function Alumnos() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [idSeleccionado, setIdSeleccionado] = useState<string | null>(null);

  const [alumnos, setAlumnos] = useState<StudentMinimal[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [matricula, setMatricula] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<{
    nombre?: string;
    matricula?: string;
    correo?: string;
    password?: string;
  }>({});

  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [estudianteAEliminar, setEstudianteAEliminar] = useState<StudentMinimal | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const [mostrarConfirmacionReactivar, setMostrarConfirmacionReactivar] = useState(false);
  const [estudianteAReactivar, setEstudianteAReactivar] = useState<StudentMinimal | null>(null);
  const [reactivando, setReactivando] = useState(false);

  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const cargar = async () => {
    try {
      const res = await fetch(`/api/estudiante?showAll=${mostrarInactivos}`);
      if (res.ok) setAlumnos(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { 
    cargar(); 
  }, [mostrarInactivos]);

  const alumnosFiltrados = alumnos.filter((alumno) => {
    const textoBusqueda = busqueda.toLowerCase().trim();

    if (!textoBusqueda) return true;

    return (
      alumno.id?.toLowerCase().includes(textoBusqueda) ||
      alumno.name?.toLowerCase().includes(textoBusqueda) ||
      alumno.lastName?.toLowerCase().includes(textoBusqueda) ||
      alumno.email?.toLowerCase().includes(textoBusqueda)
    );
  });

  const abrirModal = (alumnos?: StudentMinimal) => {
    setErrores({});
    if (alumnos) {
      setIdSeleccionado(alumnos.id); setMatricula(alumnos.id); setNombre(alumnos.name); setApellidos(alumnos.lastName || ''); setCorreo(alumnos.email); setPassword('');
    } else {
      setIdSeleccionado(null); setMatricula(''); setNombre(''); setApellidos(''); setCorreo(''); setPassword('');
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
        toast.success(`${estudianteAEliminar.name} dado de baja correctamente`);
        setMostrarConfirmacion(false);
        setEstudianteAEliminar(null);
        cargar();
      } else {
        toast.error(data.error || 'Error al dar de baja');
      }
    } catch (error) {
      toast.error('Error de red al comunicar con el servidor');
    } finally {
      setEliminando(false);
    }
  };

  const intentarReactivar = (estudiante: StudentMinimal) => {
    setEstudianteAReactivar(estudiante);
    setMostrarConfirmacionReactivar(true);
  };

  const confirmarReactivacion = async () => {
    if (!estudianteAReactivar) return;
    setReactivando(true);

    try {
      const res = await fetch('/api/estudiante', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: estudianteAReactivar.id, activo: true })
      });
      
      if (res.ok) {
        toast.success(`Alumno ${estudianteAReactivar.name} reactivado exitosamente`);
        setMostrarConfirmacionReactivar(false);
        setEstudianteAReactivar(null);
        cargar();
      } else {
        toast.error('Error al reactivar alumno');
      }
    } catch (error) {
      toast.error('Error de red al comunicar con el servidor');
    } finally {
      setReactivando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border rounded shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center text-[#0b6e3f]">
            Listado de Alumnos
          </h3>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="verInactivos" 
                checked={mostrarInactivos} 
                onChange={(e) => setMostrarInactivos(e.target.checked)}
                className="w-4 h-4 text-[#0b6e3f] focus:ring-[#0b6e3f] rounded border-gray-300"
              />
              <label htmlFor="verInactivos" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                Mostrar dados de baja
              </label>
            </div>
            <button
              onClick={() => abrirModal()}
              className="bg-[#0b6e3f] text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center hover:bg-green-800 transition-colors shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" /> Agregar alumno
            </button>
          </div>
        </div>

        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por matrícula, nombre o correo..."
            className="w-full border-2 border-gray-300 rounded-sm pl-10 pr-3 py-2 text-sm text-black outline-none focus:ring-[#0b6e3f] transition-colors"
          />
        </div>

        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase">Matricula</th>
              <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase">Nombre(s)</th>
              <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase">Apellido(s)</th>
              <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase">Correo</th>
              <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-sm text-gray-500">No hay alumnos registrados</td></tr>}
            {alumnos.length > 0 && alumnosFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-sm text-gray-500">No se encontraron alumnos con esa búsqueda</td>
              </tr>
            )}
            {alumnosFiltrados.map(a => (
              <tr key={a.id || a.email} className={`border-b border-gray-100 transition-colors ${a.activo === false ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-3 text-sm text-gray-600">{a.id}</td>
                <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                  {a.name}
                  {a.activo === false && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                      BAJA
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{a.lastName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{a.email}</td>
                <td className="px-4 py-3 text-right">
                  {a.activo === false ? (
                    <button
                      onClick={() => intentarReactivar(a)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                      title="Reactivar Alumno"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
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
                        title="Dar de Baja"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
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
          lastNameProp={apellidos}
          correoProp={correo}
          passwordProp={password}
        />
      )}

      {/* ================= SUB-MODAL DE CONFIRMACIÓN DE BAJA ================= */}
      {mostrarConfirmacion && estudianteAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Dar de baja a {estudianteAEliminar.name}?</h3>

            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de dar de baja a <span className="font-bold text-gray-800">"{estudianteAEliminar.name}"</span>. Sus datos se conservarán para fines de reporte, pero no podrá iniciar sesión.
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
                {eliminando ? 'Procesando...' : 'Sí, dar de baja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-MODAL DE CONFIRMACIÓN DE REACTIVACIÓN ================= */}
      {mostrarConfirmacionReactivar && estudianteAReactivar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCcw className="w-8 h-8 text-green-600" />
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Reactivar a {estudianteAReactivar.name}?</h3>

            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de reactivar la cuenta de <span className="font-bold text-gray-800">"{estudianteAReactivar.name}"</span>. El alumno podrá volver a iniciar sesión y registrar su asistencia.
            </p>

            <div className="flex space-x-3 w-full">
              <button
                onClick={() => setMostrarConfirmacionReactivar(false)}
                disabled={reactivando}
                className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarReactivacion}
                disabled={reactivando}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-[#0b6e3f] hover:bg-green-800 rounded transition-colors shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {reactivando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                {reactivando ? 'Procesando...' : 'Sí, reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
