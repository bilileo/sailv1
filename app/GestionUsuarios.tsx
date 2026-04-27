"use client";
import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, X, AlertCircle, AlertTriangle, CheckCircle, List } from 'lucide-react';
import { toast } from 'sonner';

interface Usuario { id: string; name: string; email: string; role: string; }

export function GestionUsuarios({ rolDestino, usuarioActivoId }: { rolDestino: string, usuarioActivoId?: string }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Estados del formulario y validaciones
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<{ nombre?: string; email?: string; password?: string }>({});

  // Estados para el Modal de Eliminación
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarUsuarios = async () => {
    const res = await fetch(`/api/usuarios?role=${rolDestino}`);
    if (res.ok) setUsuarios(await res.json());
  };

  useEffect(() => { cargarUsuarios(); }, [rolDestino]);

  const abrirModal = (user?: Usuario) => {
    setErrores({}); // Limpiamos errores previos
    if (user) {
      setEditId(user.id); setNombre(user.name); setEmail(user.email); setPassword('');
    } else {
      setEditId(null); setNombre(''); setEmail(''); setPassword('');
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setErrores({});
  };

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
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body });
      const data = await res.json();

      if (res.ok) {
        toast.success(editId ? 'Actualizado correctamente' : 'Creado correctamente');
        cerrarModal();
        cargarUsuarios();
      } else {
        toast.error(data.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error de red al comunicar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  // === LÓGICA DE ELIMINACIÓN CON MODAL ===
  const intentarEliminar = (usuario: Usuario) => {
    setUsuarioAEliminar(usuario);
    setMostrarConfirmacion(true);
  };

  const confirmarEliminacion = async () => {
    if (!usuarioAEliminar) return;
    setEliminando(true);

    try {
      const res = await fetch(`/api/usuarios?id=${usuarioAEliminar.id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`${rolDestino} eliminado correctamente`);
        setMostrarConfirmacion(false);
        setUsuarioAEliminar(null);
        cargarUsuarios();
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
    <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold mb-6 flex items-center text-[#0b6e3f]"> <List className="w-5 h-5 mr-2" /> Catálogo de {rolDestino}S</h2>
        <button 
          onClick={() => abrirModal()} 
          className="bg-[#0b6e3f] text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center hover:bg-green-800 transition-colors shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" /> Agregar {rolDestino.toLowerCase()}
        </button>
      </div>

      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-100 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase">Nombre</th>
            <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase">Correo</th>
            <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm text-gray-800 font-medium flex items-center">
                {u.name}
                {/* Etiqueta visual para identificar su propia cuenta */}
                {u.id === usuarioActivoId && (
                  <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase">
                    Tú
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
              <td className="px-4 py-3 text-sm text-right flex justify-end space-x-2">
                <button 
                  onClick={() => abrirModal(u)} 
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => intentarEliminar(u)} 
                  disabled={u.id === usuarioActivoId}
                  className={`p-2 rounded transition-colors ${
                    u.id === usuarioActivoId 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-red-600 hover:bg-red-100'
                  }`}
                  title={u.id === usuarioActivoId ? "No puedes eliminar tu propia sesión activa" : "Eliminar"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {usuarios.length === 0 && (
            <tr><td colSpan={3} className="text-center py-8 text-gray-500 text-sm">No hay registros encontrados</td></tr>
          )}
        </tbody>
      </table>

      {/* ================= MODAL PRINCIPAL DE EDICIÓN ================= */}
      {modalAbierto && (
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
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${
                      errores.nombre ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
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
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${
                      errores.email ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
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
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors ${
                      errores.password ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'
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
                  className={`px-4 py-2 text-sm font-bold text-white rounded transition-colors shadow-sm flex items-center justify-center gap-2 ${
                    cargando ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0b6e3f] hover:bg-green-800 active:scale-95'
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
      )}

      {/* ================= SUB-MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ================= */}
      {mostrarConfirmacion && usuarioAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar {rolDestino.toLowerCase()}?</h3>
            
            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de eliminar permanentemente a <span className="font-bold text-gray-800">"{usuarioAEliminar.name}"</span>. Esta acción no se puede deshacer.
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