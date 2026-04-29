"use client";
import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Laboratorio { id: number; name: string; }
interface Maestro { id: string; name: string; }
interface Clase { id: string; nombre: string; laboratorio: string; horario: string; startTime: string; }

interface FormularioClaseProps {
  onClaseCreada: (nuevaClase: any) => void;
  laboratorios: Laboratorio[];
  clases: Clase[];
}

export const FormularioClase = ({ onClaseCreada, laboratorios, clases }: FormularioClaseProps) => {
  const [nombre, setNombre] = useState('');
  const [lab, setLab] = useState(''); 
  const [maestro, setMaestro] = useState('');
  const [dia, setDia] = useState('Lunes');
  const [duracion, setDuracion] = useState(1);
  const [maestros, setMaestros] = useState<Maestro[]>([]);
  const [errores, setErrores] = useState<{
    nombre?: string;
    lab?: string;
    maestro?: string;
    horario?: string;
  }>({});
  const [enviando, setEnviando] = useState(false);

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
  
  const horariosOcupados = clases
    .filter(c => {
      const mapaDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diaClase = mapaDias[new Date(c.startTime).getDay()];
      return c.laboratorio === labSeleccionado && diaClase === dia;
    })
    .flatMap(c => {
      // Descomponer horarios multi-hora en bloques de 1 hora
      const [inicio] = c.horario.split('-');
      const horaI = parseInt(inicio.trim());
      const horaF = parseInt(c.horario.split('-')[1].trim().split(':')[0]);
      
      // Generar bloques de 1 hora
      const bloques = [];
      for (let i = horaI; i < horaF; i++) {
        bloques.push(`${i}:00- ${i + 1}:00`);
      }
      return bloques;
    });

  // Función para verificar si un bloque está disponible (considerando la duración)
  const esDisponible = (bloqueStr: string): boolean => {
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
  };

  // 3. Inicializamos el horario
  const [horario, setHorario] = useState(() => {
    const libre = opcionesHorario.find(h => esDisponible(h));
    return libre || opcionesHorario[0];
  });

  // Efecto para asignar laboratorio inicial
  useEffect(() => {
    if (laboratorios.length > 0 && lab === '') setLab(laboratorios[0].id.toString());
  }, [laboratorios]);

  // Efecto para corregir selección si se ocupa el horario al cambiar día, lab o duración
  useEffect(() => {
    const disponibles = opcionesHorario.filter(h => esDisponible(h));
    if (!esDisponible(horario)) {
      setHorario(disponibles[0] || '');
    }
  }, [lab, dia, duracion, clases]);

 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  // Limpiar errores previos
  setErrores({});
  const nuevosErrores: typeof errores = {};

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

  // Limpiar formulario
  setNombre('');
  setErrores({});
  setEnviando(false);
};

  return (
    <div className="max-w-md bg-white border border-gray-200 p-6 rounded-sm shadow-sm text-black">
      <h2 className="text-xl font-bold mb-6 flex items-center text-[#0b6e3f]">
        <Plus className="w-5 h-5 mr-2" /> Agendar Clase
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">Asignatura</label>
          <input 
            type="text" 
            value={nombre} 
            onChange={(e) => {
              setNombre(e.target.value);
              if (errores.nombre) setErrores({ ...errores, nombre: undefined });
            }}
            className={`w-full border-2 rounded-sm px-3 py-2 text-sm outline-none focus:ring-2 text-black font-medium transition-colors ${
              errores.nombre 
                ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                : 'border-gray-300 focus:ring-[#0b6e3f]'
            }`}
            placeholder="Nombre de la clase"
          />
          {errores.nombre && (
            <div className="flex items-start mt-1 text-red-600 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
              <span>{errores.nombre}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Laboratorio</label>
            <select 
              value={lab} 
              onChange={(e) => {
                setLab(e.target.value);
                if (errores.lab) setErrores({ ...errores, lab: undefined });
              }}
              className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors ${
                errores.lab 
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
                <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                <span>{errores.lab}</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Maestro</label>
            <select 
              value={maestro} 
              onChange={(e) => {
                setMaestro(e.target.value);
                if (errores.maestro) setErrores({ ...errores, maestro: undefined });
              }}
              className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium transition-colors ${
                errores.maestro 
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
                <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                <span>{errores.maestro}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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

        <button 
          type="submit"
          disabled={enviando}
          className={`w-full text-white py-3 rounded-sm font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
            enviando 
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
};