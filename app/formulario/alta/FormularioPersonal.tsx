"use client";
import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, X, AlertCircle, AlertTriangle, CheckCircle, List } from 'lucide-react';
import { toast } from 'sonner';

interface Usuario { id: string; name: string; email: string; role: string; }
interface Personal {
  cerrarModal: () => void;
  cargar: () => void;
  editIdProp: string | null;
  nombreProp: string;
  emailProp: string;
  passwordProp: string;
  rolDestino: string,
  usuarioActivoId: string | undefined;
}

export function FormularioPersonal({ cerrarModal, cargar, editIdProp, nombreProp, emailProp, passwordProp, rolDestino, usuarioActivoId}: Personal) {

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Estados del formulario y validaciones
  const [editId, setEditId] = useState<string | null>(editIdProp);
  const [nombre, setNombre] = useState(nombreProp || '');
  const [email, setEmail] = useState(emailProp ||'');
  const [password, setPassword] = useState(passwordProp || '');
  const [errores, setErrores] = useState<{ nombre?: string; email?: string; password?: string }>({});

  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();

    // === VALIDACIONES ESTILO FormularioClase ===
    setErrores({});
    const nuevosErrores: { nombre?: string; email?: string; password?: string } = {};

    if (!nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    } else if (nombre.trim().length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!email.trim()) {
      nuevosErrores.email = 'El correo es obligatorio';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nuevosErrores.email = 'Ingresa un correo electrónico válido';
    }

    // La contraseña es obligatoria si es nuevo usuario. Si está editando, es opcional.
    if (!editId && !password.trim()) {
      nuevosErrores.password = 'La contraseña es obligatoria para nuevos usuarios';
    } else if (password && password.length < 6) {
      nuevosErrores.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      toast.error('Por favor corrige los errores antes de guardar');
      return;
    }

    // === SI PASA VALIDACIÓN, GUARDAMOS ===
    setCargando(true);
    const url = '/api/usuarios';
    const method = editId ? 'PUT' : 'POST';
    const body = JSON.stringify({ id: editId, name: nombre, email, password, role: rolDestino });

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(editId ? 'Actualizado correctamente' : 'Creado correctamente');
        cerrarModal();
        cargar();
      } else {
        toast.error(data.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error de red al comunicar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <Edit2 className="w-5 h-5 mr-2 text-[#0b6e3f]" />
            {editId ? 'Editar' : 'Nuevo'} {rolDestino.toLowerCase()}
          </h3>
          <button
            onClick={cerrarModal}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={guardarUsuario}>
          <div className="p-6 space-y-4">

            {/* Validación Nombre */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                value={nombre}
                onChange={e => {
                  setNombre(e.target.value);
                  if (errores.nombre) setErrores({ ...errores, nombre: undefined });
                }}
                className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${errores.nombre ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
                  }`}
              />
              {errores.nombre && (
                <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                  <span>{errores.nombre}</span>
                </div>
              )}
            </div>

            {/* Validación Correo */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
              <input
                type="text"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errores.email) setErrores({ ...errores, email: undefined });
                }}
                className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${errores.email ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
                  }`}
              />
              {errores.email && (
                <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                  <span>{errores.email}</span>
                </div>
              )}
            </div>

            {/* Validación Contraseña */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Contraseña {editId && <span className="text-gray-400 font-normal text-xs">(Opcional, dejar en blanco para no cambiar)</span>}
              </label>
              <input
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
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                  <span>{errores.password}</span>
                </div>
              )}
            </div>

          </div>

          {/* Botones */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3">
            <button
              type="button"
              onClick={cerrarModal}
              disabled={cargando}
              className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className={`px-4 py-2 text-sm font-bold text-white rounded transition-colors shadow-sm flex items-center justify-center gap-2 ${cargando ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0b6e3f] hover:bg-green-800 active:scale-95'
                }`}
            >
              {cargando ? (
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
  )
}
