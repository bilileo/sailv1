"use client";
import React, { useState, useEffect } from 'react';
import { BarChart2, BookOpen, User, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  email: string;
  status: string;
  checkInTime: string;
  checkOutTime?: string;
  deviceType: string;
  observaciones?: string;
  clase: string;
  laboratorio: string;
}

interface RegistroSemana {
  id: string;
  checkInTime: string;
  status: string;
  laboratorioId: string | null;
  laboratorio: string | null;
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

export function Reportes({
  clases,
  laboratorios,
  claseIdInicial,
}: {
  clases: ClaseReporte[];
  laboratorios: Laboratorio[];
  claseIdInicial?: string;
}) {
  const [subTab, setSubTab] = useState<'clase' | 'maestro' | 'semana'>('clase');
  const [busquedaResultadosClase, setBusquedaResultadosClase] = useState('');
  const [busquedaResultadosMaestro, setBusquedaResultadosMaestro] = useState('');
  const [busquedaSemana, setBusquedaSemana] = useState('');

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
    const clase = clases.find(c => c.id === claseId);
    const filas = asistenciasClaseFiltradas.map(r => ({
      'Alumno': r.alumno || '—',
      'Estado': ESTADO[r.status]?.label || r.status,
      'Fecha de Registro': formatFecha(r.checkInTime),
      'Dispositivo': r.deviceType || '—',
      'Observaciones': r.observaciones || '—',
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');
    const nombre = clase
      ? sanitizarNombreArchivo(`${clase.nombre}${clase.grupo ? `_Gpo${clase.grupo}` : ''}`)
      : 'Clase';
    XLSX.writeFile(wb, `Reporte_Clase_${nombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarMaestro = () => {
    const maestro = maestros.find(m => m.id.toString() === maestroId);
    const filas: Record<string, string | number>[] = [];

    for (const [sessionId, registros] of Object.entries(gruposAsistenciaMaestroFiltrados)) {
      const clase = clasesPorId[sessionId];
      const claseNombre = clase
        ? `${clase.nombre}${clase.grupo ? ` - Gpo. ${clase.grupo}` : ''} | ${clase.laboratorio} | ${getNombreDia(clase.dayOfWeek)} ${clase.horario}`
        : `Sesión ${sessionId}`;

      filas.push({ 'Alumno': `▸ ${claseNombre}`, 'Estado': '', 'Fecha de Registro': '', 'Dispositivo': '', 'Observaciones': '' });
      for (const r of registros) {
        filas.push({
          'Alumno': r.alumno || '—',
          'Estado': ESTADO[r.status]?.label || r.status,
          'Fecha de Registro': formatFecha(r.checkInTime),
          'Dispositivo': r.deviceType || '—',
          'Observaciones': r.observaciones || '—',
        });
      }
      filas.push({ 'Alumno': '', 'Estado': '', 'Fecha de Registro': '', 'Dispositivo': '', 'Observaciones': '' });
    }

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencias por Maestro');
    const nombre = sanitizarNombreArchivo(maestro?.name || 'Maestro');
    XLSX.writeFile(wb, `Reporte_Maestro_${nombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarSemana = () => {
    const encabezado = [
      'Laboratorio',
      ...fechas.map(f => {
        const d = new Date(f + 'T12:00:00');
        return `${DIAS[d.getDay()]} ${d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}`;
      }),
      'Total',
      'Promedio',
    ];

    const filas: (string | number)[][] = [
      encabezado,
      ...laboratorios.map((lab, i) => [
        lab.name,
        ...fechas.map(f => conteos[lab.name]?.[f] ?? 0),
        totalsPorLab[i],
        promediosPorLab[i],
      ]),
      ['Total', ...totalsPorFecha, granTotal, cornerTotalProm],
      ['Promedio', ...promediosPorFecha, cornerPromTotal, cornerPromProm],
    ];

    const ws = XLSX.utils.aoa_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Semanal');
    XLSX.writeFile(wb, `Reporte_Semana_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  // ── Helpers UI ─────────────────────────────────────────────────────────────

  const BtnExportar = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
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
    { id: 'clase'   as const, label: 'Por Clase',   Icon: BookOpen },
    { id: 'maestro' as const, label: 'Por Maestro', Icon: User },
    { id: 'semana'  as const, label: 'Por Semana',  Icon: BarChart2 },
  ];

  const TablaAsistencia = ({ registros }: { registros: RegistroAsistencia[] }) => (
    <div className="overflow-x-auto border rounded-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            {['Alumno', 'Estado', 'Fecha de Registro', 'Dispositivo', 'Observaciones'].map(h => (
              <th key={h} className="px-4 py-2 text-left text-xs font-black text-gray-700 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {registros.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
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
                  placeholder="Buscar en resultados por alumno, estado, fecha, dispositivo u observaciones..."
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
                    placeholder="Buscar en resultados por alumno, clase, laboratorio, estado, fecha, dispositivo u observaciones..."
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