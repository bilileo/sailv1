"use client";
import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle, CheckCircle, X } from 'lucide-react';
import { NuevaClase } from './lib/attendance-types';
import { toast } from 'sonner';

interface Laboratorio { id: number; name: string; }
interface Maestro { id: string; name: string; }
interface Clase { id: string; nombre: string; laboratorio: string; horario: string; dayOfWeek: number; }
interface Asignaturas { id: number; name: string; materiaCode: string; color?: string; }

interface FormularioClaseProps {
  onClaseCreada: (nuevaClase: NuevaClase) => void;
  laboratorios: Laboratorio[];
  clases: Clase[];
  open?: boolean;
  onClose?: () => void;
  initialValues?: Partial<{
    nombre: string;
    horario: string;
    dia: string;
    duracion: number;
    laboratorioId: string;
    maestroId: string;
    color: string;
  }>;
}

export const FormularioClase = ({ initialValues, onClaseCreada, laboratorios, clases, open, onClose }: FormularioClaseProps) => {
  const [nombre, setNombre] = useState('');
  const [lab, setLab] = useState(initialValues?.laboratorioId || '');
  const [maestro, setMaestro] = useState('');
  const [dia, setDia] = useState(initialValues?.dia || 'Lunes');
  const [duracion, setDuracion] = useState(initialValues?.duracion || 1);
  const [maestros, setMaestros] = useState<Maestro[]>([]);
  const [errores, setErrores] = useState<{
    nombre?: string;
    lab?: string;
    maestro?: string;
    horario?: string;
  }>({});
  const [enviando, setEnviando] = useState(false);

  // Para encontrar asignaturas
  const [asignaturas, setAsignaturas] = useState<Asignaturas[]>([]);

  // Cargar maestros
  useEffect(() => {
    const cargarMaestros = async () => {
      try {
        const res = await fetch('/api/maestros');
        if (res.ok) {
          const data = await res.json();
          setMaestros(data);
          if (data.length > 0) setMaestro(data[0].id);
        }
      } catch (error) {
        console.error('Error cargando maestros:', error);
      }
    };
    cargarMaestros();
  }, []);


  // Obtenemos las asignaturas disponibles para seleccionarlas en el formulario
  const cargarAsignaturas = async () => {
    try {
      const timestamp = new Date().getTime();
      const resAsignaturas = await fetch(`/api/catalogo?t=${timestamp}`, { cache: 'no-store' });
      if (resAsignaturas.ok) setAsignaturas(await resAsignaturas.json());
    } catch (e) {
      console.error(e);
    }
  };


  useEffect(() => { cargarAsignaturas(); }, []);

  // 1. Generamos opciones de horario basadas en la duración
  const generarOpcionesHorario = (duracionHoras: number) => {
    const maxInicio = 24 - duracionHoras;
    return Array.from({ length: maxInicio + 1 }, (_, i) =>
      `${i}:00- ${i + duracionHoras}:00`
    );
  };

  const opcionesHorario = generarOpcionesHorario(duracion);

  // 2. LÓGICA DE BLOQUEO: Descomponer horarios multi-hora en bloques de 1 hora
  const labSeleccionado = laboratorios.find(l => l.id.toString() === lab)?.name;

  const horariosOcupados = React.useMemo(() => {
    return clases
      .filter(c => {
        const mapaDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const diaClase = mapaDias[c.dayOfWeek === 7 ? 0 : c.dayOfWeek];
        return c.laboratorio === labSeleccionado && diaClase === dia;
      })
      .flatMap(c => {
        // Descomponer horarios multi-hora en bloques de 1 hora
        const [inicio] = c.horario.split('-');
        const horaI = parseInt(inicio.trim());
        const horaF = parseInt(c.horario.split('-')[1].trim().split(':')[0]);

        // Generar bloques de 1 hora
        const bloques: string[] = [];
        for (let i = horaI; i < horaF; i++) {
          bloques.push(`${i}:00- ${i + 1}:00`);
        }
        return bloques;
      });
  }, [clases, labSeleccionado, dia]);


  // Función para verificar si un bloque está disponible (considerando la duración)
  const esDisponible = React.useCallback((bloqueStr: string): boolean => {
    const [inicio] = bloqueStr.split('-');
    const horaInicio = parseInt(inicio.trim());

    // Verificar que cada hora del bloque esté libre
    for (let i = 0; i < duracion; i++) {
      const bloqueAVerificar = `${horaInicio + i}:00- ${horaInicio + i + 1}:00`;
      if (horariosOcupados.includes(bloqueAVerificar)) {
        return false;
      }
    }
    return true;
  }, [duracion, horariosOcupados]);

  // 3. Inicializamos el horario
  const [horario, setHorario] = useState(() => {
    if (initialValues?.horario) return initialValues.horario;
    const libre = opcionesHorario.find(h => esDisponible(h));
    return libre || opcionesHorario[0];
  });

  // If no lab selected but labs load, set default lab
  useEffect(() => {
    if (laboratorios.length > 0 && !lab) {
      // Setting default lab once when labs load. Disable rule because this
      // intentionally initializes state from async-loaded data.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLab(laboratorios[0].id.toString());
    }
  }, [laboratorios, lab]);

  // Efecto para corregir selección si se ocupa el horario al cambiar día, lab o duración
  useEffect(() => {
    const disponibles = opcionesHorario.filter(h => esDisponible(h));
    if (!esDisponible(horario)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHorario(disponibles[0] || '');
    }
  }, [lab, dia, duracion, clases, opcionesHorario, horario, esDisponible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Limpiar errores previos
    setErrores({});
    const nuevosErrores: typeof errores = {};

    console.log('Validando clase con datos:', { nombre, lab, maestro, dia, horario, duracion });

    // Validaciones
    if (!nombre.trim()) {
      nuevosErrores.nombre = 'Por favor, ingresa el nombre de la asignatura';
    } else if (nombre.trim().length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!lab || lab === '') {
      nuevosErrores.lab = 'Debes seleccionar un laboratorio';
    }

    if (!maestro || maestro === '') {
      nuevosErrores.maestro = 'Debes seleccionar un maestro';
    }

    if (!horario) {
      nuevosErrores.horario = 'Debes seleccionar un bloque horario disponible';
    }

    // Si hay errores, mostrarlos y retornar
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      toast.error('Por favor completa todos los campos correctamente');
      return;
    }

    setEnviando(true);

    const datosClase = {
      nombre,
      laboratorioId: lab,
      maestroId: maestro,
      dia,
      horario,
      duracion
    };

    onClaseCreada(datosClase);

    // Mostrar notificación de éxito
    toast.success('Clase agregada exitosamente al calendario', {
      description: `${nombre} - ${dia} ${horario}`,
      duration: 3000,
    });

    if (onClose) onClose();

    // Limpiar formulario
    setNombre('');
    setErrores({});
    setEnviando(false);
  };

  const card = (
    <div className="max-w bg-white border border-gray-200 p-6 rounded-sm shadow-sm text-black">

      {/** Formulario de creación de clase */}

      {/* Nombre de la Asignatura */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">Asignatura</label>
          <select
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (errores.nombre) setErrores({ ...errores, nombre: undefined });
            }}
            className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors ${errores.nombre
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300'
              }`}
          >
            <option value="">Seleccionar...</option>
            {asignaturas.map((a) => (
              <option key={a.id} value={a.name}>
                {a.materiaCode + ' - ' + a.name}
              </option>
            ))}
          </select>
          {errores.nombre && (
            <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
              <span>{errores.nombre}</span>
            </div>
          )}
        </div>

        {/* Bloque de columnas para mejor visualización */}
        <div className="grid grid-cols-2 gap-4">
          {/* Laboratorio donde se impartirá */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Laboratorio</label>
            <select
              value={lab}
              onChange={(e) => {
                setLab(e.target.value);
                if (errores.lab) setErrores({ ...errores, lab: undefined });
              }}
              className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors ${errores.lab
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
                }`}
            >
              <option value="">Seleccionar...</option>
              {laboratorios.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            {errores.lab && (
              <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
                <span>{errores.lab}</span>
              </div>
            )}
          </div>

          {/* Maestro que impartirá la clase */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Maestro</label>
            <select
              value={maestro}
              onChange={(e) => {
                setMaestro(e.target.value);
                if (errores.maestro) setErrores({ ...errores, maestro: undefined });
              }}
              className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors ${errores.maestro
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
                }`}
            >
              <option value="">Seleccionar...</option>
              {maestros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {errores.maestro && (
              <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
                <span>{errores.maestro}</span>
              </div>
            )}
          </div>
        </div>


        <div className="grid grid-cols-2 gap-4">
          {/* Día de la semana */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Día</label>
            <select
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black font-medium"
            >
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Duración en horas de la clase */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Duración (horas)</label>
            <select
              value={duracion}
              onChange={(e) => setDuracion(parseInt(e.target.value))}
              className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black font-medium"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                <option key={h} value={h}>{h} {h === 1 ? 'hora' : 'horas'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* De que hora a que hora será la clase */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">Bloque Horario</label>
          <select
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black font-medium"
          >
            {opcionesHorario.map(h => (
              <option
                key={h}
                value={h}
                disabled={!esDisponible(h)}
                className={!esDisponible(h) ? 'text-gray-400 bg-gray-100' : 'text-black'}
              >
                {h} {!esDisponible(h) ? '(Ocupado)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Antes aquí se seleccionaba el color, pero como ahora el color es parte de la asignatura
            ps ya no tiene caso
        <div className="flex gap-3 mt-1 items-center">
          {// Paleta de colores }
          {PALETA_COLORES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColorFondo(c.clase)}
              className={`w-8 h-8 rounded-full cursor-pointer transition-all ${c.clase} ${colorFondo === c.clase
                ? 'ring-2 ring-offset-2 ring-gray-800 scale-110 shadow-md'
                : 'border border-black/10 hover:scale-105 opacity-80 hover:opacity-100'
                }`}
              title="Color predefinido"
            />
          ))}

          {// Selector personalizado (Botón Arcoíris)}
          <label
            className={`relative w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-all overflow-hidden ${colorFondo.startsWith('#')
              ? 'ring-2 ring-offset-2 ring-gray-800 scale-110 shadow-md'
              : 'border border-gray-300 hover:scale-105 opacity-80 hover:opacity-100'
              }`}
            style={
              colorFondo.startsWith('#')
                ? { backgroundColor: colorFondo } // Si ya eligió uno, mostramos el color personalizado
                : { background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' } // Si no arcoíris
            }
            title="Elegir color personalizado"
          >
            <input
              type="color"
              value={colorFondo.startsWith('#') ? colorFondo : '#0b6e3f'}
              onChange={(e) => setColorFondo(e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>
        */}

        <button
          type="submit"
          disabled={enviando}
          className={`w-full text-white py-3 rounded-sm font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${enviando
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-[#0b6e3f] hover:bg-green-800'
            }`}
        >
          {enviando ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              GUARDAR EN CALENDARIO
            </>
          )}
        </button>
      </form>
    </div>
  );

  // Cargar asignaturas al abrir el formulario para asegurar datos frescos
  useEffect(() => {
    if (open) cargarAsignaturas();
  }, [open]);

  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-md shadow-2xl overflow-hidden">

            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
              <h3 className="text-lg font-bold text-[#0b6e3f] flex items-center">
                <Plus className="w-5 h-5 mr-2 text-[#0b6e3f]" />
                Agendar Nueva Clase
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">{card}</div>
          </div>
        </div>
      </div>
    );
  }

  return card;
};
