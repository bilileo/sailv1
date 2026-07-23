"use client";
import { AlertCircle, CheckCircle, Edit2, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface AlumnosProps {
  cerrarModal: () => void;
  cargar: () => void;
  idSeleccionado: string | null;
  matriculaProp: string;
  nombreProp: string;
  correoProp: string;
  passwordProp: string;
}

export const FormularioAlumnos = ({ cerrarModal, cargar, idSeleccionado, matriculaProp, nombreProp, correoProp, passwordProp }: AlumnosProps) => {
  // Abrir un modal para agregar o editar alumnos
  const [nombre, setNombre] = useState(nombreProp || '');
  const [matricula, setMatricula] = useState(matriculaProp || '');
  const [correo, setCorreo] = useState(correoProp || '');
  const [password, setPassword] = useState(passwordProp ||'');
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<{
    nombre?: string;
    matricula?: string;
    correo?: string;
    password?: string;
  }>({});

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
    if (idSeleccionado === null && !password.trim()) {
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

    const esEdicion = idSeleccionado !== null;

    const method = esEdicion ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/estudiante', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: esEdicion ? idSeleccionado : matricula,
          name: nombre,
          email: correo,
          password
        })
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(esEdicion ? 'Alumno actualizado correctamente' : 'Alumno registrado correctamente');
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <Edit2 className="w-5 h-5 mr-2 text-[#0b6e3f]" />
            {idSeleccionado ? `Editar ${nombre}` : 'Nuevo alumno'}
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

            { /* Validación Matricula */}
            {!idSeleccionado && (
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
                  className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${errores.matricula ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
                    }`}
                />
              </div>)
            }

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
                className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${errores.nombre ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
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
                className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${errores.correo ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
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
                Contraseña {idSeleccionado && <span className="text-gray-400 font-normal text-xs">(Opcional, dejar en blanco para no cambiar)</span>}
              </label>
              <input
                placeholder="Contraseña"
                type="password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errores.password) setErrores({ ...errores, password: undefined });
                }}
                className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${errores.password ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
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
  );
}
