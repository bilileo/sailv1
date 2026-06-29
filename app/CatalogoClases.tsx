"use client";
import React, { useState, useEffect } from 'react';
import { X, Trash2, Edit2, CheckCircle, AlertTriangle, Plus, UserPlus, MoreVertical } from 'lucide-react';
import { CatalogoClase } from './lib/attendance-types';
import { toast } from 'sonner';

interface Maestro {
  id: number;
  name: string;
}

const NOMBRES_SEMESTRES: Record<number, string> = {
  1: 'Primer Semestre',
  2: 'Segundo Semestre',
  3: 'Tercer Semestre',
  4: 'Cuarto Semestre',
  5: 'Quinto Semestre',
  6: 'Sexto Semestre',
  7: 'Séptimo Semestre',
  8: 'Octavo Semestre',
  9: 'Noveno Semestre'
};

const getNombreSemestre = (num?: number) => {
  if (!num) return 'Semestre No Asignado';
  return NOMBRES_SEMESTRES[num] || `Semestre ${num}`;
};

export function CatalogoClases() {

  const [modalAbierto, setModalAbierto] = useState(false);
  const [menuActivo, setMenuActivo] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoClase[]>([]);

  // Estados para el modal de profesores
  const [modalProfesoresAbierto, setModalProfesoresAbierto] = useState(false);
  const [catalogoSeleccionado, setCatalogoSeleccionado] = useState<CatalogoClase | null>(null);
  const [maestros, setMaestros] = useState<Maestro[]>([]);
  const [profesoresSeleccionados, setProfesoresSeleccionados] = useState<number[]>([]);
  const [cargandoProfesores, setCargandoProfesores] = useState(false);
  const [guardandoProfesores, setGuardandoProfesores] = useState(false);

  // Estados del formulario y validaciones
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [materiaCode, setMateriaCode] = useState('');
  const [color, setColor] = useState('bg-blue-600');
  const [semestre, setSemestre] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<{
    nombre?: string;
    materiaCode?: string;
    color?: string
  }>({});

  // Estados para el modal de Eliminación
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [catalogoAEliminar, setCatalogoAEliminar] = useState<CatalogoClase | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarCatalogo = async () => {
    try {
      const timestamp = new Date().getTime();
      const resCatalogo = await fetch(`/api/catalogo?t=${timestamp}`, { cache: 'no-store' });
      if (resCatalogo.ok) setCatalogo(await resCatalogo.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { cargarCatalogo(); }, []);

  const abrirModal = (catalogo?: CatalogoClase) => {
    setErrores({});
    if (catalogo) {
      setEditId(catalogo.id);
      setNombre(catalogo.name);
      setMateriaCode(catalogo.materiaCode);
      setColor(catalogo.color || 'bg-blue-600');
      setSemestre(catalogo.semestre || 1); 
    } else {
      setEditId(null);
      setMateriaCode('');
      setNombre('');
      setColor('bg-blue-600');
      setSemestre(1); 
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setErrores({});
  };

  // Paleta de colores
  const PALETA_COLORES = [
    { id: 'blue', clase: 'bg-blue-600', hover: 'hover:bg-blue-700' },
    { id: 'emerald', clase: 'bg-emerald-600', hover: 'hover:bg-emerald-700' },
    { id: 'purple', clase: 'bg-purple-600', hover: 'hover:bg-purple-700' },
    { id: 'rose', clase: 'bg-rose-600', hover: 'hover:bg-rose-700' },
    { id: 'orange', clase: 'bg-orange-600', hover: 'hover:bg-orange-700' },
    { id: 'teal', clase: 'bg-teal-600', hover: 'hover:bg-teal-700' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones

    setErrores({});
    const nuevosErrores: { nombre?: string; materiaCode?: string; color?: string } = {};

    // Validación de nombre
    if (!nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    } else if (nombre.trim().length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    // Validación de código de materia
    if (!materiaCode.trim()) {
      nuevosErrores.materiaCode = 'El código de materia es obligatorio';
    } else if (materiaCode.trim().length < 3) {
      nuevosErrores.materiaCode = 'El código de materia debe tener al menos 3 caracteres';
    }

    // Validación de color
    if (!color) {
      nuevosErrores.color = 'El color es obligatorio';
    }

    console.log('Errores encontrados:', nuevosErrores); // Debug: Ver errores en consola
    console.log('Datos ingresados:', nombre, materiaCode, color); // Debug: Ver datos ingresados
    // Validación final
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      toast.error('Por favor corrige los errores antes de guardar');
      return;
    }

    // Carga solo si ya pasó las validaciones
    setLoading(true);

    // Si se presionó el botón de editar, el método será PUT, si no, POST

    const esEdicion = editId !== null;

    const method = esEdicion ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/catalogo', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          name: nombre,
          materiaCode: materiaCode,
          color: color,
          semestre: semestre
        })
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(esEdicion ? 'Clase actualizada correctamente' : 'Clase registrada correctamente');
        cerrarModal();
        cargarCatalogo();
      } else {
        toast.error(JSON.stringify(data) || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error de red al comunicar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const intentarEliminar = (catalogo: CatalogoClase) => {
    setCatalogoAEliminar(catalogo);
    setMostrarConfirmacion(true);
  };

  const abrirModalProfesores = async (catalogo: CatalogoClase) => {
    setCatalogoSeleccionado(catalogo);
    setModalProfesoresAbierto(true);
    setCargandoProfesores(true);

    try {
      const [resMaestros, resImparte] = await Promise.all([
        fetch('/api/maestros'),
        fetch(`/api/imparte?asignaturaId=${catalogo.id}`)
      ]);

      if (!resMaestros.ok || !resImparte.ok) {
        toast.error('Error al cargar profesores');
        return;
      }

      const dataMaestros = await resMaestros.json();
      const dataImparte = await resImparte.json();

      setMaestros(dataMaestros);
      setProfesoresSeleccionados(dataImparte);
    } catch (error) {
      console.error(error);
      toast.error('Error de red al cargar profesores');
    } finally {
      setCargandoProfesores(false);
    }
  };

  const cerrarModalProfesores = () => {
    setModalProfesoresAbierto(false);
    setCatalogoSeleccionado(null);
    setMaestros([]);
    setProfesoresSeleccionados([]);
  };

  const toggleProfesor = (profesorId: number) => {
    setProfesoresSeleccionados((prev) =>
      prev.includes(profesorId)
        ? prev.filter((id) => id !== profesorId)
        : [...prev, profesorId]
    );
  };

  const guardarProfesores = async () => {
    if (!catalogoSeleccionado) return;

    setGuardandoProfesores(true);

    try {
      const res = await fetch('/api/imparte', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asignaturaId: catalogoSeleccionado.id,
          userIds: profesoresSeleccionados
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Profesores actualizados correctamente');
        cerrarModalProfesores();
      } else {
        toast.error(data.error || 'Error al guardar profesores');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de red al guardar profesores');
    } finally {
      setGuardandoProfesores(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!catalogoAEliminar) return;
    setEliminando(true);

    try {
      const res = await fetch(`/api/catalogo?id=${catalogoAEliminar.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        toast.success(`${catalogoAEliminar.name} eliminado correctamente`);
        setMostrarConfirmacion(false);
        setCatalogoAEliminar(null);
        cargarCatalogo();
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Error de red al comunicar con el servidor');
    } finally {
      setEliminando(false);
    }
  };

const materiasAgrupadas = React.useMemo(() => {
  return catalogo.reduce((acumulador, materia) => {
    const sem = materia.semestre || 0; 
    if (!acumulador[sem]) {
      acumulador[sem] = [];
    }
    acumulador[sem].push(materia);
    return acumulador;
  }, {} as Record<number, CatalogoClase[]>);
}, [catalogo]);

const semestresOrdenados = Object.keys(materiasAgrupadas)
  .map(Number)
  .sort((a, b) => a - b);

  return (
    <div className="space-y-6">

      <div className="bg-white p-6 border rounded shadow-sm">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold mb-6 flex items-center text-[#0b6e3f]">Catálogo de Clases</h3>
          <div className="flex gap-2">
            <button onClick={() => abrirModal()} className="bg-[#0b6e3f] text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center hover:bg-green-800 transition-colors shadow-sm active:scale-95">
              <Plus className="w-4 h-4 mr-2" />Agregar clase</button>
          </div>
        </div>

        <div className="space-y-8">
          {semestresOrdenados.map((numSemestre) => (
            <div key={numSemestre} className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
              
              {/* Título del Semestre */}
              <div className="bg-gray-100 border-b border-gray-200 px-6 py-3">
                <h3 className="text-lg font-bold text-[#0b6e3f] uppercase tracking-wider">
                  {getNombreSemestre(numSemestre)}
                </h3>
              </div>

              {/* Grid de las materias del semestre específico */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {materiasAgrupadas[numSemestre].map((item) => (
                    
                    /* --- INICIO DE LA NUEVA TARJETA MD3 --- */
                    <div 
                      key={item.id} 
                      className="relative flex flex-col h-full p-5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                    >
                      {/* Borde izquierdo de color */}
                      <div 
                        className={`absolute left-0 top-0 bottom-0 w-1.5 ${!item.color?.startsWith('#') ? item.color : ''}`} 
                        style={item.color && item.color.startsWith('#') ? { backgroundColor: item.color } : {}}
                      />

                      {/* Encabezado y Menú */}
                      <div className="flex justify-between items-start mb-2 pl-2">
                        <div>
                          <h4 className="text-base font-bold text-gray-900 leading-tight line-clamp-2 pr-2">
                            {item.name}
                          </h4>
                          <span className="text-xs font-mono font-bold text-gray-500 mt-1 inline-block bg-gray-50 px-1.5 py-0.5 rounded">
                            {item.materiaCode}
                          </span>
                        </div>

                        {/* Menú de Tres Puntos (Kebab Menu) */}
                        <div className="relative">
                          <button 
                            onClick={() => setMenuActivo(menuActivo === item.id ? null : item.id)}
                            className="text-gray-400 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors relative z-20"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          {/* Dropdown Desplegable */}
                          {menuActivo === item.id && (
                            <>
                              {/* Overlay invisible para cerrar al hacer clic afuera */}
                              <div 
                                className="fixed inset-0 z-20" 
                                onClick={() => setMenuActivo(null)}
                              />
                              
                              {/* Opciones del menú */}
                              <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 z-30 py-1 overflow-hidden">
                                <button 
                                  onClick={() => { abrirModal(item); setMenuActivo(null); }} 
                                  className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center transition-colors"
                                >
                                  <Edit2 className="w-4 h-4 mr-2" /> Editar
                                </button>
                                <button 
                                  onClick={() => { intentarEliminar(item); setMenuActivo(null); }} 
                                  className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Espaciador flexible para empujar el botón hacia abajo */}
                      <div className="flex-grow"></div>

                      {/* Botón Principal (Primary Action) */}
                      <button
                        onClick={() => abrirModalProfesores(item)}
                        className="mt-4 w-full px-4 py-2 text-xs font-bold text-[#0b6e3f] bg-green-50 hover:bg-green-100 rounded-md transition-colors flex items-center justify-center gap-2 active:scale-95"
                        title="Gestionar profesores"
                      >
                        <UserPlus className="w-4 h-4" />
                        Gestión Profesores
                      </button>
                    </div>
                    /* --- FIN DE LA NUEVA TARJETA MD3 --- */

                  ))}
                </div>
              </div>
            </div>
          ))}

          {semestresOrdenados.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-sm text-gray-500 font-medium">
              No hay asignaturas registradas en el catálogo.
            </div>
          )}
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Edit2 className="w-5 h-5 mr-2 text-[#0b6e3f]" />
                {editId ? `Editar ${nombre}` : 'Nueva asignatura'}
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

                {/* Validación Código */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Código de la asignatura</label>
                  <input
                    placeholder="Código de Asignatura"
                    type="text"
                    value={materiaCode}
                    onChange={e => {
                      setMateriaCode(e.target.value);
                      if (errores.materiaCode) setErrores({ ...errores, materiaCode: undefined });
                    }}
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors
                                            ${errores.materiaCode ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'}
                                        `}
                  />
                </div>

                {/* Selector de Semestre */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Semestre</label>
                  <select
                    value={semestre}
                    onChange={e => setSemestre(parseInt(e.target.value))} 
                    className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none focus:ring-[#0b6e3f] transition-colors"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <option key={num} value={num}>
                        {NOMBRES_SEMESTRES[num]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Validación Nombre */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de la asignatura</label>
                  <input
                    placeholder="Nombre de la asignatura"
                    type="text"
                    value={nombre}
                    onChange={e => {
                      setNombre(e.target.value);
                      if (errores.nombre) setErrores({ ...errores, nombre: undefined });
                    }}
                    className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black outline-none transition-colors
                                            ${errores.nombre ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0b6e3f]'}
                                        `}
                  />
                </div>

                <div className="flex gap-3 mt-1 items-center">
                  {/* Paleta de colores */}
                  {PALETA_COLORES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.clase)}
                      className={`w-8 h-8 rounded-full cursor-pointer transition-all ${c.clase} ${color === c.clase
                        ? 'ring-2 ring-offset-2 ring-gray-800 scale-110 shadow-md'
                        : 'border border-black/10 hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                      title="Color predefinido"
                    />
                  ))}

                  {/* Selector personalizado (Botón Arcoíris) */}
                  <label
                    className={`relative w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-all overflow-hidden ${color.startsWith('#')
                      ? 'ring-2 ring-offset-2 ring-gray-800 scale-110 shadow-md'
                      : 'border border-gray-300 hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                    style={
                      color.startsWith('#')
                        ? { backgroundColor: color } // Si ya eligió uno, mostramos el color personalizado
                        : { background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' } // Si no arcoíris
                    }
                    title="Elegir color personalizado"
                  >
                    <input
                      type="color"
                      value={color.startsWith('#') ? color : '#0b6e3f'}
                      onChange={(e) => setColor(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </label>
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

      {/* ================= MODAL DE PROFESORES ================= */}
      {modalProfesoresAbierto && catalogoSeleccionado && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-[#0b6e3f]" />
                Añadir profesor
              </h3>
              <button
                onClick={cerrarModalProfesores}
                disabled={guardandoProfesores}
                className="text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-100 rounded p-3">
                <p className="text-sm font-bold text-[#0b6e3f]">{catalogoSeleccionado.name}</p>
                <p className="text-xs text-gray-600 mt-1">Código: {catalogoSeleccionado.materiaCode}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Profesores disponibles
                </label>

                {cargandoProfesores ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#0b6e3f] border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-gray-600">Cargando profesores...</span>
                  </div>
                ) : maestros.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 border rounded p-4 text-center">
                    No hay profesores registrados.
                  </div>
                ) : (
                  <div className="border rounded max-h-64 overflow-y-auto divide-y">
                    {maestros.map((maestro) => (
                      <label
                        key={maestro.id}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={profesoresSeleccionados.includes(maestro.id)}
                          onChange={() => toggleProfesor(maestro.id)}
                          className="w-4 h-4 accent-[#0b6e3f]"
                        />
                        <span>{maestro.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={cerrarModalProfesores}
                disabled={guardandoProfesores}
                className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarProfesores}
                disabled={cargandoProfesores || guardandoProfesores}
                className={`px-4 py-2 text-sm font-bold text-white rounded transition-colors shadow-sm flex items-center justify-center gap-2 ${cargandoProfesores || guardandoProfesores ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0b6e3f] hover:bg-green-800 active:scale-95'
                  }`}
              >
                {guardandoProfesores ? (
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
          </div>
        </div>
      )}

      {/* ================= SUB-MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ================= */}
      {mostrarConfirmacion && catalogoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar a {catalogoAEliminar.name}?</h3>

            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de eliminar permanentemente a <span className="font-bold text-gray-800">"{catalogoAEliminar.name}"</span>. Esta acción no se puede deshacer.
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
  )
}