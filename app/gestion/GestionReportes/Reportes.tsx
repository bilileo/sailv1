"use client";
import React, { useState, useEffect } from 'react';
import { BarChart2, BookOpen, User, Download, Search, Calendar } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XS = require('xlsx-js-style') as typeof import('xlsx');

interface ClaseReporte {
  id: string;
  nombre: string;
  laboratorio: string;
  horario: string;
  dayOfWeek: number;
  color?: string;
  grupo?: string;
  maestroId?: string | number;
}

interface Maestro { id: number; name: string; }
interface Laboratorio { id: number; name: string; }

interface RegistroAsistencia {
  id: string;
  classSessionId: string;
  alumno: string;
  matricula?: string | number;
  studentId?: string | number;
  email: string;
  status: string;
  checkInTime: string;
  checkOutTime?: string;
  deviceType: string;
  observaciones?: string;
  clase: string;
  color?: string;
  laboratorio: string;
}

interface RegistroSemana {
  id: string;
  checkInTime: string;
  status: string;
  laboratorioId: string | null;
  laboratorio: string | null;
}

interface AsistenciaPeriodo {
  id: number;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  observaciones: string | null;
  alumno: string;
  matricula: string;
  email: string;
  deviceType: string;
  fechaClase: string | null;
}

interface ClasePeriodo {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  asignatura: string;
  materiaCode: string;
  color?: string | null;
  laboratorio: string;
  maestro: string;
  grupo: string;
  asistencias: AsistenciaPeriodo[];
}

interface Periodo {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

const ESTADO: Record<string, { label: string; cls: string }> = {
  PRESENT:    { label: 'Presente',         cls: 'bg-green-100 text-green-800' },
  LATE:       { label: 'Tarde',            cls: 'bg-yellow-100 text-yellow-800' },
  ABSENT:     { label: 'Ausente',          cls: 'bg-red-100 text-red-800' },
  LEFT_EARLY: { label: 'Salida temprana',  cls: 'bg-orange-100 text-orange-800' },
};

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const getNombreDia = (dayOfWeek?: number) => {
  if (!dayOfWeek) return '';
  return dayOfWeek === 7 ? 'Domingo' : DIAS[dayOfWeek];
};

const formatFecha = (isoStr: string) => {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const obtenerSemanaActual = () => {
  const hoy = new Date();
  const dia = hoy.getDay();
  const diffLunes = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffLunes);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const toISO = (d: Date) => d.toISOString().split('T')[0];
  return { inicio: toISO(lunes), fin: toISO(domingo) };
};

const generarFechas = (inicio: string, fin: string): string[] => {
  const fechas: string[] = [];
  const current = new Date(inicio + 'T12:00:00');
  const end = new Date(fin + 'T12:00:00');
  while (current <= end) {
    fechas.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return fechas;
};

const sanitizarNombreArchivo = (str: string) =>
  str.replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ ]/g, '').replace(/\s+/g, '_');

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

const SearchInput = ({ value, onChange, placeholder }: SearchInputProps) => (
  <div className="relative w-full">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border-2 border-gray-300 rounded-sm pl-9 pr-3 py-2 text-sm text-black outline-none focus:ring-[#0b6e3f] focus:border-[#0b6e3f] transition-colors"
    />
  </div>
);

// ── Excel export helpers ────────────────────────────────────────────────────

const THIN = {
  top:    { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  bottom: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  left:   { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  right:  { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
};

const STATUS_FILL_XS: Record<string, string> = {
  PRESENT: 'D1FAE5', LATE: 'FEF3C7', ABSENT: 'FEE2E2', LEFT_EARLY: 'FFEDD5',
};

const xs = {
  header: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    fill: { patternType: 'solid' as const, fgColor: { rgb: '0B6E3F' } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: THIN,
  },
  section: {
    font: { bold: true, color: { rgb: '064E2E' }, sz: 10 },
    fill: { patternType: 'solid' as const, fgColor: { rgb: 'DCFCE7' } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
    border: THIN,
  },
  sectionEmpty: {
    fill: { patternType: 'solid' as const, fgColor: { rgb: 'DCFCE7' } },
    border: THIN,
  },
  data: (even: boolean) => ({
    font: { sz: 10, color: { rgb: '1F2937' } },
    fill: { patternType: 'solid' as const, fgColor: { rgb: even ? 'FFFFFF' : 'F9FAFB' } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
    border: THIN,
  }),
  num: (even: boolean) => ({
    font: { sz: 10, color: { rgb: '1F2937' } },
    fill: { patternType: 'solid' as const, fgColor: { rgb: even ? 'FFFFFF' : 'F9FAFB' } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: THIN,
  }),
  status: (s: string) => ({
    font: { bold: true, sz: 10, color: { rgb: '064E2E' } },
    fill: { patternType: 'solid' as const, fgColor: { rgb: STATUS_FILL_XS[s] ?? 'F3F4F6' } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: THIN,
  }),
  totalLabel: {
    font: { bold: true, sz: 10, color: { rgb: '065F46' } },
    fill: { patternType: 'solid' as const, fgColor: { rgb: 'D1FAE5' } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
    border: THIN,
  },
  totalNum: {
    font: { bold: true, sz: 10, color: { rgb: '065F46' } },
    fill: { patternType: 'solid' as const, fgColor: { rgb: 'D1FAE5' } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: THIN,
  },
  promedioLabel: {
    font: { bold: true, sz: 10, color: { rgb: '1E40AF' } },
    fill: { patternType: 'solid' as const, fgColor: { rgb: 'DBEAFE' } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
    border: THIN,
  },
  promedioNum: {
    font: { bold: true, sz: 10, color: { rgb: '1E40AF' } },
    fill: { patternType: 'solid' as const, fgColor: { rgb: 'DBEAFE' } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: THIN,
  },
  empty: {
    fill: { patternType: 'solid' as const, fgColor: { rgb: 'FFFFFF' } },
    border: THIN,
  },
};

type XsCell = { v: string | number; t: 's' | 'n'; s: object };

function xc(value: string | number | null | undefined, style: object): XsCell {
  const v = value ?? '';
  return { v, t: typeof v === 'number' ? 'n' : 's', s: style };
}

function buildSheet(
  rows: XsCell[][],
  colWidths: number[],
  merges?: { s: { r: number; c: number }; e: { r: number; c: number } }[],
) {
  const ws: Record<string, unknown> = {};
  let maxCol = 0;
  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      ws[XS.utils.encode_cell({ r: ri, c: ci })] = cell;
      maxCol = Math.max(maxCol, ci);
    });
  });
  ws['!ref'] = XS.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: maxCol } });
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  ws['!rows'] = rows.map(() => ({ hpt: 18 }));
  if (merges?.length) ws['!merges'] = merges;
  return ws;
}

// ────────────────────────────────────────────────────────────────────────────

export function Reportes({
  clases,
  laboratorios,
  claseIdInicial,
}: {
  clases: ClaseReporte[];
  laboratorios: Laboratorio[];
  claseIdInicial?: string;
}) {
  const [subTab, setSubTab] = useState<'clase' | 'maestro' | 'semana' | 'periodo'>('clase');
  const [busquedaResultadosClase, setBusquedaResultadosClase] = useState('');
  const [busquedaResultadosMaestro, setBusquedaResultadosMaestro] = useState('');
  const [busquedaSemana, setBusquedaSemana] = useState('');

  // ── Por Periodo ────────────────────────────────────────────────────────────
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoId, setPeriodoId] = useState('');
  const [clasesPeriodo, setClasesPeriodo] = useState<ClasePeriodo[]>([]);
  const [cargandoPeriodo, setCargandoPeriodo] = useState(false);
  const [periodoCargado, setPeriodoCargado] = useState(false);
  const [expandedClases, setExpandedClases] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/periodos')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPeriodos(d); })
      .catch(() => {});
  }, []);

  const cargarPeriodo = async () => {
    if (!periodoId) return;
    setCargandoPeriodo(true);
    setPeriodoCargado(false);
    try {
      const res = await fetch(`/api/reportes/periodo?periodoId=${periodoId}`);
      const d = await res.json();
      if (Array.isArray(d)) {
        setClasesPeriodo(d);
        setExpandedClases(new Set(d.map((c: ClasePeriodo) => c.id)));
      }
      setPeriodoCargado(true);
    } catch {
      setClasesPeriodo([]);
    } finally {
      setCargandoPeriodo(false);
    }
  };

  const toggleClase = (id: number) => {
    setExpandedClases(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatHora = (t: string) => t?.slice(0, 5) ?? '—';

  const formatFechaSolo = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const exportarPeriodo = () => {
    const periodo = periodos.find(p => p.id.toString() === periodoId);
    const COLS = [18, 30, 28, 14, 16, 16, 32];
    const NUM_COLS = 7;
    const headers = ['Matrícula', 'Alumno', 'Email', 'Fecha de Clase', 'Estado', 'Dispositivo', 'Observaciones'];
    const rows: XsCell[][] = [headers.map(h => xc(h, xs.header))];
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
    let dataIdx = 0;

    for (const clase of clasesPeriodo) {
      const label = [
        clase.asignatura,
        clase.materiaCode ? `(${clase.materiaCode})` : '',
        clase.grupo ? `Gpo. ${clase.grupo}` : '',
        '|', clase.maestro,
        '|', clase.laboratorio,
        '|', getNombreDia(clase.dayOfWeek),
        `${formatHora(clase.startTime)}–${formatHora(clase.endTime)}`,
      ].filter(Boolean).join(' ');

      const secRow = rows.length;
      rows.push([xc(label, xs.section), ...Array(NUM_COLS - 1).fill(xc('', xs.sectionEmpty))]);
      merges.push({ s: { r: secRow, c: 0 }, e: { r: secRow, c: NUM_COLS - 1 } });

      if (clase.asistencias.length === 0) {
        rows.push([xc('(Sin registros)', xs.data(true)), ...Array(NUM_COLS - 1).fill(xc('', xs.data(true)))]);
      } else {
        for (const a of clase.asistencias) {
          const even = dataIdx % 2 === 0;
          rows.push([
            xc(a.matricula || '—',                            xs.data(even)),
            xc(a.alumno,                                       xs.data(even)),
            xc(a.email,                                        xs.data(even)),
            xc(formatFechaSolo(a.fechaClase ?? a.checkInTime), xs.data(even)),
            xc(ESTADO[a.status]?.label ?? a.status,            xs.status(a.status)),
            xc(a.deviceType,                                   xs.data(even)),
            xc(a.observaciones ?? '—',                         xs.data(even)),
          ]);
          dataIdx++;
        }
      }
      rows.push(Array(NUM_COLS).fill(xc('', xs.empty)));
    }

    const ws = buildSheet(rows, COLS, merges);
    const wb = XS.utils.book_new();
    XS.utils.book_append_sheet(wb, ws, 'Reporte Periodo');
    const nombre = sanitizarNombreArchivo(periodo?.nombre ?? 'Periodo');
    XS.writeFile(wb, `Reporte_Periodo_${nombre}.xlsx`);
  };

  // ── Por Clase ──────────────────────────────────────────────────────────────
  const [claseId, setClaseId] = useState('');
  const [asistenciasClase, setAsistenciasClase] = useState<RegistroAsistencia[]>([]);
  const [cargandoClase, setCargandoClase] = useState(false);

  useEffect(() => {
    if (claseIdInicial) {
      setSubTab('clase');
      setClaseId(claseIdInicial);
    }
  }, [claseIdInicial]);

  useEffect(() => {
    if (!claseId) { setAsistenciasClase([]); return; }
    setCargandoClase(true);
    fetch(`/api/asistencia?classSessionId=${claseId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAsistenciasClase(d); })
      .catch(() => {})
      .finally(() => setCargandoClase(false));
  }, [claseId]);

  // ── Por Maestro ────────────────────────────────────────────────────────────
  const [maestros, setMaestros] = useState<Maestro[]>([]);
  const [maestroId, setMaestroId] = useState('');
  const [asistenciasMaestro, setAsistenciasMaestro] = useState<RegistroAsistencia[]>([]);
  const [cargandoMaestro, setCargandoMaestro] = useState(false);

  useEffect(() => {
    fetch('/api/maestros')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setMaestros(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!maestroId) { setAsistenciasMaestro([]); return; }
    setCargandoMaestro(true);
    fetch(`/api/asistencia?teacherId=${maestroId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAsistenciasMaestro(d); })
      .catch(() => {})
      .finally(() => setCargandoMaestro(false));
  }, [maestroId]);

  // ── Por Semana ─────────────────────────────────────────────────────────────
  const semana = obtenerSemanaActual();
  const [fechaInicio, setFechaInicio] = useState(semana.inicio);
  const [fechaFin, setFechaFin]       = useState(semana.fin);
  const [registrosSemana, setRegistrosSemana] = useState<RegistroSemana[]>([]);
  const [cargandoSemana, setCargandoSemana]   = useState(false);
  const [semanaConsultada, setSemanaConsultada] = useState(false);

  const cargarSemana = async () => {
    if (!fechaInicio || !fechaFin) return;
    setCargandoSemana(true);
    try {
      const res = await fetch(`/api/reportes?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
      const d = await res.json();
      setRegistrosSemana(Array.isArray(d) ? d : []);
      setSemanaConsultada(true);
    } catch {
      setRegistrosSemana([]);
    } finally {
      setCargandoSemana(false);
    }
  };

  // Cálculos de la tabla semanal
  const fechas = semanaConsultada ? generarFechas(fechaInicio, fechaFin) : [];

  const conteos: Record<string, Record<string, number>> = {};
  for (const lab of laboratorios) {
    conteos[lab.name] = {};
    for (const f of fechas) conteos[lab.name][f] = 0;
  }
  for (const r of registrosSemana) {
    if (!r.laboratorio || r.status === 'ABSENT') continue;
    const fecha = r.checkInTime?.split('T')[0];
    if (!fecha || conteos[r.laboratorio] === undefined || conteos[r.laboratorio][fecha] === undefined) continue;
    conteos[r.laboratorio][fecha]++;
  }

  const totalsPorFecha  = fechas.map(f => laboratorios.reduce((s, lab) => s + (conteos[lab.name]?.[f] ?? 0), 0));
  const totalsPorLab    = laboratorios.map(lab => fechas.reduce((s, f) => s + (conteos[lab.name]?.[f] ?? 0), 0));
  const granTotal       = totalsPorLab.reduce((s, t) => s + t, 0);
  const numLabs         = laboratorios.length;
  const numDias         = fechas.length;

  const promediosPorFecha = totalsPorFecha.map(t => numLabs > 0 ? +(t / numLabs).toFixed(1) : 0);
  const promediosPorLab   = totalsPorLab.map(t => numDias > 0 ? +(t / numDias).toFixed(1) : 0);

  const cornerTotalProm   = numDias > 0 ? +(granTotal / numDias).toFixed(1) : 0;
  const cornerPromTotal   = numLabs > 0 ? +(granTotal / numLabs).toFixed(1) : 0;
  const cornerPromProm    = numLabs > 0 && numDias > 0 ? +(granTotal / (numLabs * numDias)).toFixed(1) : 0;

  const normalizarTexto = (valor?: string | number | null) =>
    String(valor ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const coincideBusqueda = (busqueda: string, campos: Array<string | number | null | undefined>) => {
    const textoBusqueda = normalizarTexto(busqueda.trim());
    if (!textoBusqueda) return true;
    return campos.some((campo) => normalizarTexto(campo).includes(textoBusqueda));
  };

  const filtrarRegistroAsistencia = (busqueda: string, registro: RegistroAsistencia) =>
    coincideBusqueda(busqueda, [
      registro.alumno,
      registro.matricula,
      registro.studentId,
      registro.email,
      ESTADO[registro.status]?.label,
      registro.status,
      formatFecha(registro.checkInTime),
      registro.deviceType,
      registro.observaciones,
      registro.clase,
      registro.laboratorio,
    ]);

  const asistenciasClaseFiltradas = asistenciasClase.filter((registro) =>
    filtrarRegistroAsistencia(busquedaResultadosClase, registro)
  );

  const asistenciasMaestroFiltradas = asistenciasMaestro.filter((registro) =>
    filtrarRegistroAsistencia(busquedaResultadosMaestro, registro)
  );

  const laboratoriosFiltradosSemana = laboratorios.filter(lab =>
    coincideBusqueda(busquedaSemana, [lab.name, lab.id])
  );

  // Agrupar asistencias del maestro por sesión
  const clasesPorId = Object.fromEntries(clases.map(c => [c.id, c as ClaseReporte]));
  const gruposAsistenciaMaestroFiltrados = asistenciasMaestroFiltradas.reduce<Record<string, RegistroAsistencia[]>>((acc, r) => {
    const key = r.classSessionId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  // ── Exportaciones Excel ────────────────────────────────────────────────────

  const exportarClase = () => {
    const clase = clases.find(c => String(c.id) === String(claseId));
    const COLS = [18, 30, 18, 22, 18, 38];
    const NUM_COLS = 6;
    const titulo = clase
      ? `${clase.nombre}${clase.grupo ? ` - Gpo. ${clase.grupo}` : ''} | ${clase.laboratorio} | ${getNombreDia(clase.dayOfWeek)} ${clase.horario}`
      : 'Clase';
    const headers = ['Matrícula', 'Alumno', 'Estado', 'Fecha de Registro', 'Dispositivo', 'Observaciones'];
    const rows: XsCell[][] = [
      [xc(titulo, xs.section), ...Array(NUM_COLS - 1).fill(xc('', xs.sectionEmpty))],
      headers.map(h => xc(h, xs.header)),
      ...asistenciasClaseFiltradas.map((r, i) => [
        xc(r.matricula ?? r.studentId ?? '—', xs.data(i % 2 === 0)),
        xc(r.alumno || '—',            xs.data(i % 2 === 0)),
        xc(ESTADO[r.status]?.label || r.status, xs.status(r.status)),
        xc(formatFecha(r.checkInTime), xs.data(i % 2 === 0)),
        xc(r.deviceType || '—',        xs.data(i % 2 === 0)),
        xc(r.observaciones || '—',     xs.data(i % 2 === 0)),
      ]),
    ];
    const ws = buildSheet(rows, COLS, [{ s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } }]);
    const wb = XS.utils.book_new();
    XS.utils.book_append_sheet(wb, ws, 'Asistencias');
    const nombre = clase
      ? sanitizarNombreArchivo(`${clase.nombre}${clase.grupo ? `_Gpo${clase.grupo}` : ''}`)
      : 'Clase';
    XS.writeFile(wb, `Reporte_Clase_${nombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarMaestro = () => {
    const maestro = maestros.find(m => String(m.id) === String(maestroId));
    const COLS = [18, 30, 18, 22, 18, 38];
    const NUM_COLS = 6;
    const headers = ['Matrícula', 'Alumno', 'Estado', 'Fecha de Registro', 'Dispositivo', 'Observaciones'];
    const rows: XsCell[][] = [headers.map(h => xc(h, xs.header))];
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
    let dataIdx = 0;

    for (const [sessionId, registros] of Object.entries(gruposAsistenciaMaestroFiltrados)) {
      const clase = clasesPorId[sessionId];
      const label = clase
        ? `${clase.nombre}${clase.grupo ? ` - Gpo. ${clase.grupo}` : ''} | ${clase.laboratorio} | ${getNombreDia(clase.dayOfWeek)} ${clase.horario}`
        : `${registros[0]?.clase ?? 'Clase'} | ${registros[0]?.laboratorio ?? '—'}`;
      const secRow = rows.length;
      rows.push([xc(label, xs.section), ...Array(NUM_COLS - 1).fill(xc('', xs.sectionEmpty))]);
      merges.push({ s: { r: secRow, c: 0 }, e: { r: secRow, c: NUM_COLS - 1 } });

      for (const r of registros) {
        const even = dataIdx % 2 === 0;
        rows.push([
          xc(r.matricula ?? r.studentId ?? '—', xs.data(even)),
          xc(r.alumno || '—',            xs.data(even)),
          xc(ESTADO[r.status]?.label || r.status, xs.status(r.status)),
          xc(formatFecha(r.checkInTime), xs.data(even)),
          xc(r.deviceType || '—',        xs.data(even)),
          xc(r.observaciones || '—',     xs.data(even)),
        ]);
        dataIdx++;
      }
      rows.push(Array(NUM_COLS).fill(xc('', xs.empty)));
    }

    const ws = buildSheet(rows, COLS, merges);
    const wb = XS.utils.book_new();
    XS.utils.book_append_sheet(wb, ws, 'Asistencias por Maestro');
    const nombre = sanitizarNombreArchivo(maestro?.name || 'Maestro');
    XS.writeFile(wb, `Reporte_Maestro_${nombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarSemana = async () => {
    // ── Hoja 1: Resumen por laboratorio ──────────────────────────────────────
    const dateLabels = fechas.map(f => {
      const d = new Date(f + 'T12:00:00');
      return `${DIAS[d.getDay()]} ${d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}`;
    });
    const headers = ['Laboratorio', ...dateLabels, 'Total', 'Promedio'];
    const COLS = [22, ...fechas.map(() => 12), 10, 10];

    const rowsResumen: XsCell[][] = [
      headers.map(h => xc(h, xs.header)),
      ...laboratorios.map((lab, i) => {
        const even = i % 2 === 0;
        return [
          xc(lab.name,           xs.data(even)),
          ...fechas.map(f => xc(conteos[lab.name]?.[f] ?? 0, xs.num(even))),
          xc(totalsPorLab[i],    xs.totalNum),
          xc(promediosPorLab[i], xs.promedioNum),
        ];
      }),
      [
        xc('Total',         xs.totalLabel),
        ...totalsPorFecha.map(t => xc(t, xs.totalNum)),
        xc(granTotal,       xs.totalNum),
        xc(cornerTotalProm, xs.promedioNum),
      ],
      [
        xc('Promedio',        xs.promedioLabel),
        ...promediosPorFecha.map(p => xc(p, xs.promedioNum)),
        xc(cornerPromTotal,   xs.promedioNum),
        xc(cornerPromProm,    xs.promedioNum),
      ],
    ];

    const wb = XS.utils.book_new();
    XS.utils.book_append_sheet(wb, buildSheet(rowsResumen, COLS), 'Resumen Semanal');

    // ── Hoja 2: Detalle de clases y asistencias ───────────────────────────────
    try {
      const res = await fetch(`/api/reportes?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&detalle=true`);
      const clases: {
        asignatura: string; maestro: string; laboratorio: string;
        dayOfWeek: number; startTime: string; endTime: string; grupo: string;
        asistencias: { alumno: string; matricula: string; email: string; fechaClase: string | null;
          status: string; deviceType: string; observaciones: string | null }[];
      }[] = await res.json();

      if (Array.isArray(clases) && clases.length > 0) {
        const NUM_COLS = 7;
        const headersDetalle = ['Matrícula', 'Alumno', 'Email', 'Fecha de Clase', 'Estado', 'Dispositivo', 'Observaciones'];
        const COLS_D = [18, 30, 28, 14, 16, 16, 32];
        const rows: XsCell[][] = [headersDetalle.map(h => xc(h, xs.header))];
        const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
        let dataIdx = 0;

        for (const clase of clases) {
          const label = [
            clase.asignatura,
            clase.grupo ? `Gpo. ${clase.grupo}` : '',
            '|', clase.maestro,
            '|', clase.laboratorio,
            '|', getNombreDia(clase.dayOfWeek),
            `${clase.startTime?.slice(0, 5) ?? ''}–${clase.endTime?.slice(0, 5) ?? ''}`,
          ].filter(Boolean).join(' ');

          const secRow = rows.length;
          rows.push([xc(label, xs.section), ...Array(NUM_COLS - 1).fill(xc('', xs.sectionEmpty))]);
          merges.push({ s: { r: secRow, c: 0 }, e: { r: secRow, c: NUM_COLS - 1 } });

          if (clase.asistencias.length === 0) {
            rows.push([xc('(Sin registros)', xs.data(true)), ...Array(NUM_COLS - 1).fill(xc('', xs.data(true)))]);
          } else {
            for (const a of clase.asistencias) {
              const even = dataIdx % 2 === 0;
              const fecha = a.fechaClase
                ? new Date(a.fechaClase + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : a.fechaClase ?? '—';
              rows.push([
                xc(a.matricula || '—',               xs.data(even)),
                xc(a.alumno,                          xs.data(even)),
                xc(a.email,                           xs.data(even)),
                xc(fecha,                             xs.data(even)),
                xc(ESTADO[a.status]?.label ?? a.status, xs.status(a.status)),
                xc(a.deviceType,                      xs.data(even)),
                xc(a.observaciones ?? '—',            xs.data(even)),
              ]);
              dataIdx++;
            }
          }
          rows.push(Array(NUM_COLS).fill(xc('', xs.empty)));
        }

        XS.utils.book_append_sheet(wb, buildSheet(rows, COLS_D, merges), 'Detalle por Clase');
      }
    } catch { /* si el detalle falla, se exporta solo el resumen */ }

    XS.writeFile(wb, `Reporte_Semana_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  // ── Helpers UI ─────────────────────────────────────────────────────────────

  const BtnExportar = ({ onClick, disabled }: { onClick: () => void | Promise<void>; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-sm transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
    >
      <Download className="w-3.5 h-3.5" />
      Exportar Excel
    </button>
  );

  const SUB_TABS = [
    { id: 'clase'   as const, label: 'Por Clase',    Icon: BookOpen },
    { id: 'maestro' as const, label: 'Por Maestro',  Icon: User },
    { id: 'semana'  as const, label: 'Por Semana',   Icon: BarChart2 },
    { id: 'periodo' as const, label: 'Por Periodo',  Icon: Calendar },
  ];

  const TablaAsistencia = ({ registros }: { registros: RegistroAsistencia[] }) => (
    <div className="overflow-x-auto border rounded-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            {['Matrícula', 'Alumno', 'Estado', 'Fecha de Registro', 'Dispositivo', 'Observaciones'].map(h => (
              <th key={h} className="px-4 py-2 text-left text-xs font-black text-gray-700 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {registros.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{r.matricula ?? r.studentId ?? '—'}</td>
              <td className="px-4 py-2 font-medium text-gray-800">{r.alumno || '—'}</td>
              <td className="px-4 py-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${ESTADO[r.status]?.cls ?? 'bg-gray-100 text-gray-800'}`}>
                  {ESTADO[r.status]?.label ?? r.status}
                </span>
              </td>
              <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{formatFecha(r.checkInTime)}</td>
              <td className="px-4 py-2 text-gray-600">{r.deviceType || '—'}</td>
              <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{r.observaciones || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-bold flex items-center text-[#0b6e3f] mb-6">
          <BarChart2 className="w-5 h-5 mr-2" /> Reportes de Asistencia
        </h2>

        {/* Sub-tabs */}
        <div className="flex bg-gray-100 p-1 rounded-sm border border-gray-200 mb-6 w-fit">
          {SUB_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSubTab(id)}
              className={`px-4 py-2 text-sm font-bold rounded-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                subTab === id
                  ? 'bg-[#0b6e3f] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Por Clase ── */}
        {subTab === 'clase' && (
          <div className="space-y-4">
            <div className="max-w-xl space-y-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Selecciona una clase</label>
              <select
                value={claseId}
                onChange={e => {
                  setClaseId(e.target.value);
                  setBusquedaResultadosClase('');
                }}
                className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none"
              >
                <option value="">-- Seleccionar clase --</option>
                {clases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}{c.grupo ? ` - Gpo. ${c.grupo}` : ''} | {c.laboratorio} | {getNombreDia(c.dayOfWeek)} {c.horario}
                  </option>
                ))}
              </select>
            </div>

            {cargandoClase && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <div className="w-4 h-4 border-2 border-[#0b6e3f] border-t-transparent rounded-full animate-spin" />
                Cargando asistencias...
              </div>
            )}

            {!cargandoClase && claseId && asistenciasClase.length === 0 && (
              <p className="text-sm text-gray-500 py-4">No hay registros de asistencia para esta clase.</p>
            )}

            {!cargandoClase && asistenciasClase.length > 0 && (
              <div className="space-y-3">
                <SearchInput
                  value={busquedaResultadosClase}
                  onChange={setBusquedaResultadosClase}
                  placeholder="Buscar en resultados por matrícula, alumno, estado, fecha, dispositivo u observaciones..."
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 font-medium">
                    {asistenciasClaseFiltradas.length} de {asistenciasClase.length} registro(s) encontrados
                  </p>
                  <BtnExportar onClick={exportarClase} disabled={asistenciasClaseFiltradas.length === 0} />
                </div>
                {asistenciasClaseFiltradas.length > 0 ? (
                  <TablaAsistencia registros={asistenciasClaseFiltradas} />
                ) : (
                  <p className="text-sm text-gray-500 py-4 border border-dashed border-gray-300 rounded-sm text-center">
                    No hay registros que coincidan con la búsqueda.
                  </p>
                )}
              </div>
            )}

            {!claseId && (
              <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-300 rounded-sm">
                Selecciona una clase para ver sus registros de asistencia.
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Por Maestro ── */}
        {subTab === 'maestro' && (
          <div className="space-y-4">
            <div className="max-w-xl space-y-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Selecciona un maestro</label>
              <select
                value={maestroId}
                onChange={e => {
                  setMaestroId(e.target.value);
                  setBusquedaResultadosMaestro('');
                }}
                className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none"
              >
                <option value="">-- Seleccionar maestro --</option>
                {maestros.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {cargandoMaestro && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <div className="w-4 h-4 border-2 border-[#0b6e3f] border-t-transparent rounded-full animate-spin" />
                Cargando asistencias...
              </div>
            )}

            {!cargandoMaestro && maestroId && asistenciasMaestro.length === 0 && (
              <p className="text-sm text-gray-500 py-4">No hay registros de asistencia para este maestro.</p>
            )}

            {!cargandoMaestro && asistenciasMaestro.length > 0 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <SearchInput
                    value={busquedaResultadosMaestro}
                    onChange={setBusquedaResultadosMaestro}
                    placeholder="Buscar en resultados por matrícula, alumno, clase, laboratorio, estado, fecha, dispositivo u observaciones..."
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 font-medium">
                      {asistenciasMaestroFiltradas.length} de {asistenciasMaestro.length} registro(s) en total
                    </p>
                    <BtnExportar onClick={exportarMaestro} disabled={asistenciasMaestroFiltradas.length === 0} />
                  </div>
                </div>

                {Object.keys(gruposAsistenciaMaestroFiltrados).length > 0 ? (
                  Object.entries(gruposAsistenciaMaestroFiltrados).map(([sessionId, registros]) => {
                    const clase: ClaseReporte | undefined = clasesPorId[sessionId];
                    return (
                      <div key={sessionId} className="border rounded-sm overflow-hidden">
                        <div className="bg-[#0b6e3f] text-white px-4 py-2 text-sm font-bold">
                          {clase
                            ? `${clase.nombre}${clase.grupo ? ` - Gpo. ${clase.grupo}` : ''} | ${clase.laboratorio} | ${getNombreDia(clase.dayOfWeek)} ${clase.horario}`
                            : `Sesión ${sessionId}`}
                          <span className="ml-3 text-white/70 font-medium">({registros.length} registros)</span>
                        </div>
                        <TablaAsistencia registros={registros} />
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 py-4 border border-dashed border-gray-300 rounded-sm text-center">
                    No hay registros que coincidan con la búsqueda.
                  </p>
                )}
              </div>
            )}

            {!maestroId && (
              <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-300 rounded-sm">
                Selecciona un maestro para ver todos sus registros de asistencia.
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Por Periodo ── */}
        {subTab === 'periodo' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="max-w-sm w-full">
                <label className="block text-sm font-bold text-gray-700 mb-1">Selecciona un periodo escolar</label>
                <select
                  value={periodoId}
                  onChange={e => {
                    setPeriodoId(e.target.value);
                    setPeriodoCargado(false);
                    setClasesPeriodo([]);
                  }}
                  className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none"
                >
                  <option value="">-- Seleccionar periodo --</option>
                  {periodos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}{p.activo ? ' (activo)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={cargarPeriodo}
                disabled={cargandoPeriodo || !periodoId}
                className="px-4 py-2 text-sm font-bold text-white bg-[#0b6e3f] hover:bg-green-800 rounded-sm transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {cargandoPeriodo
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Calendar className="w-4 h-4" />}
                {cargandoPeriodo ? 'Cargando...' : 'Generar reporte'}
              </button>
              {periodoCargado && clasesPeriodo.length > 0 && (
                <BtnExportar onClick={exportarPeriodo} />
              )}
            </div>

            {!periodoId && !cargandoPeriodo && (
              <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-300 rounded-sm">
                Selecciona un periodo para ver todas sus clases y asistencias.
              </div>
            )}

            {periodoCargado && clasesPeriodo.length === 0 && (
              <p className="text-sm text-gray-500 py-4">No hay clases registradas en este periodo.</p>
            )}

            {periodoCargado && clasesPeriodo.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 font-medium">
                  {clasesPeriodo.length} clase(s) —{' '}
                  {clasesPeriodo.reduce((s, c) => s + c.asistencias.length, 0)} registros de asistencia en total
                </p>
                {clasesPeriodo.map(clase => {
                  const isExpanded = expandedClases.has(clase.id);
                  return (
                    <div key={clase.id} className="border rounded-sm overflow-hidden">
                      <button
                        onClick={() => toggleClase(clase.id)}
                        className="w-full flex items-center justify-between bg-[#0b6e3f] text-white px-4 py-2.5 text-sm font-bold text-left hover:bg-green-800 transition-colors"
                      >
                        <span>
                          {clase.asignatura}
                          {clase.materiaCode ? ` (${clase.materiaCode})` : ''}
                          {clase.grupo ? ` — Gpo. ${clase.grupo}` : ''}
                          {' | '}{clase.maestro}
                          {' | '}{clase.laboratorio}
                          {' | '}{getNombreDia(clase.dayOfWeek)} {formatHora(clase.startTime)}–{formatHora(clase.endTime)}
                        </span>
                        <span className="ml-4 text-white/70 text-xs font-medium whitespace-nowrap">
                          {clase.asistencias.length} registros {isExpanded ? '▲' : '▼'}
                        </span>
                      </button>

                      {isExpanded && (
                        clase.asistencias.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-400">Sin registros de asistencia.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100 border-b">
                                <tr>
                                  {['Matrícula', 'Alumno', 'Email', 'Fecha de Clase', 'Estado', 'Dispositivo', 'Observaciones'].map(h => (
                                    <th key={h} className="px-4 py-2 text-left text-xs font-black text-gray-700 uppercase whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {clase.asistencias.map(a => (
                                  <tr key={a.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{a.matricula || '—'}</td>
                                    <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{a.alumno}</td>
                                    <td className="px-4 py-2 text-gray-500 text-xs">{a.email}</td>
                                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                                      {formatFechaSolo(a.fechaClase ?? a.checkInTime)}
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${ESTADO[a.status]?.cls ?? 'bg-gray-100 text-gray-800'}`}>
                                        {ESTADO[a.status]?.label ?? a.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-600">{a.deviceType}</td>
                                    <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{a.observaciones ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Por Semana ── */}
        {subTab === 'semana' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={e => { setFechaInicio(e.target.value); setSemanaConsultada(false); }}
                  className="border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={e => { setFechaFin(e.target.value); setSemanaConsultada(false); }}
                  className="border-2 border-gray-300 rounded-sm px-3 py-2 text-sm text-black outline-none"
                />
              </div>
              <button
                onClick={cargarSemana}
                disabled={cargandoSemana || !fechaInicio || !fechaFin}
                className="px-4 py-2 text-sm font-bold text-white bg-[#0b6e3f] hover:bg-green-800 rounded-sm transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {cargandoSemana
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <BarChart2 className="w-4 h-4" />}
                {cargandoSemana ? 'Generando...' : 'Generar reporte'}
              </button>
              {semanaConsultada && (
                <BtnExportar onClick={exportarSemana} />
              )}
            </div>

            {semanaConsultada && (
              <div className="max-w-xl">
                <SearchInput
                  value={busquedaSemana}
                  onChange={setBusquedaSemana}
                  placeholder="Buscar laboratorio en el reporte semanal..."
                />
              </div>
            )}

            {!semanaConsultada && !cargandoSemana && (
              <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-300 rounded-sm">
                Selecciona un rango de fechas y haz clic en "Generar reporte" para ver el resumen.
              </div>
            )}

            {semanaConsultada && (
              <>
                <div className="text-sm text-gray-600">
                  Semana del{' '}
                  <span className="font-bold text-gray-800">
                    {new Date(fechaInicio + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long' })}
                  </span>
                  {' '}al{' '}
                  <span className="font-bold text-gray-800">
                    {new Date(fechaFin + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                  {' '}—{' '}
                  <span className="font-bold text-[#0b6e3f]">{granTotal}</span> asistencias totales
                </div>

                <div className="overflow-x-auto border rounded-sm">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase border-r sticky left-0 bg-gray-100 z-10 min-w-[120px]">
                          Laboratorio
                        </th>
                        {fechas.map(f => {
                          const d = new Date(f + 'T12:00:00');
                          return (
                            <th key={f} className="px-4 py-3 text-center text-xs font-black text-gray-700 uppercase border-r min-w-[110px]">
                              <div>{DIAS[d.getDay()]}</div>
                              <div className="text-gray-500 font-medium normal-case">
                                {d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                              </div>
                            </th>
                          );
                        })}
                        <th className="px-4 py-3 text-center text-xs font-black text-[#0b6e3f] uppercase border-r bg-green-50 min-w-[80px]">
                          Total
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-black text-blue-700 uppercase bg-blue-50 min-w-[90px]">
                          Promedio
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {laboratoriosFiltradosSemana.map((lab) => {
                        const labIdx = laboratorios.findIndex((item) => item.id === lab.id);
                        return (
                          <tr key={lab.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-bold text-gray-800 border-r sticky left-0 bg-white">
                              {lab.name}
                            </td>
                            {fechas.map(f => {
                              const val = conteos[lab.name]?.[f] ?? 0;
                              return (
                                <td key={f} className={`px-4 py-3 text-center border-r ${val === 0 ? 'text-gray-300' : 'text-gray-800 font-medium'}`}>
                                  {val}
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 text-center font-bold text-[#0b6e3f] border-r bg-green-50">
                              {totalsPorLab[labIdx]}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-blue-700 bg-blue-50">
                              {promediosPorLab[labIdx]}
                            </td>
                          </tr>
                        );
                      })}

                      {laboratoriosFiltradosSemana.length === 0 && (
                        <tr>
                          <td colSpan={fechas.length + 3} className="px-4 py-6 text-center text-gray-400 text-sm">
                            No hay laboratorios que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}

                      {/* Fila Total */}
                      <tr className="border-b border-t-2 border-t-gray-300 bg-green-50/60 font-bold">
                        <td className="px-4 py-3 text-[#0b6e3f] border-r sticky left-0 bg-green-50/60 text-xs uppercase tracking-wide">
                          Total
                        </td>
                        {totalsPorFecha.map((t, i) => (
                          <td key={fechas[i]} className="px-4 py-3 text-center text-[#0b6e3f] border-r">
                            {t}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center text-[#0b6e3f] border-r bg-green-100 text-base">
                          {granTotal}
                        </td>
                        <td className="px-4 py-3 text-center text-blue-700 bg-blue-100">
                          {cornerTotalProm}
                        </td>
                      </tr>

                      {/* Fila Promedio */}
                      <tr className="bg-blue-50/60">
                        <td className="px-4 py-3 font-bold text-blue-700 border-r sticky left-0 bg-blue-50/60 text-xs uppercase tracking-wide">
                          Promedio
                        </td>
                        {promediosPorFecha.map((p, i) => (
                          <td key={fechas[i]} className="px-4 py-3 text-center font-bold text-blue-700 border-r">
                            {p}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-bold text-blue-700 border-r bg-blue-100">
                          {cornerPromTotal}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-blue-700 bg-blue-100">
                          {cornerPromProm}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}