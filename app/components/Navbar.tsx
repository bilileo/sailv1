"use client";

import React, { useState } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

export interface NavbarProps {
  usuarioActivo: { id: string; name: string; role: string } | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  notificacionesMaestro?: number;
  notificacionesPendientes?: number;
  misResueltasTotal?: number;
  onResueltasVistasUpdate?: (total: number) => void;
}

const opcionesNavegacion = [
  { tipo: 'item', titulo: 'Inicio', items: ['Inicio'] },
  { tipo: 'grupo', titulo: 'Usuarios', items: ['Administradores', 'Maestros', 'Auxiliares', 'Alumnos'] },
  { tipo: 'grupo', titulo: 'Gestión Académica', items: ['Clases', 'Grupos', 'Periodos Escolares'] },
  { tipo: 'grupo', titulo: 'Seguimiento', items: ['Reportes', 'Incidencias'] }
];

export function Navbar({
  usuarioActivo,
  activeTab = 'Inicio',
  onTabChange,
  notificacionesMaestro = 0,
  notificacionesPendientes = 0,
  misResueltasTotal = 0,
  onResueltasVistasUpdate
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

  const isMaestro = usuarioActivo?.role === 'MAESTRO';
  const isDashboard = pathname.includes('/maestro/dashboard');

  const usuarioPuedeVerTab = (tab: string) => {
    if (usuarioActivo?.role === 'MAESTRO') {
      return tab === 'Inicio' || tab === 'Incidencias';
    }
    if (usuarioActivo?.role === 'AUXILIAR' && (tab === 'Administradores' || tab === 'Auxiliares')) {
      return false;
    }
    return true;
  };

  const obtenerNotificacionesTab = (tab: string) => {
    if (tab !== 'Incidencias') return 0;
    return isMaestro ? notificacionesMaestro : notificacionesPendientes;
  };

  const seleccionarTab = (tab: string) => {
    setMenuAbierto(null);
    if (isDashboard) {
      // If we are in the dashboard and they click a nav item, go to main page with query param
      router.push(`/?tab=${encodeURIComponent(tab)}`);
    } else {
      if (onTabChange) onTabChange(tab);
      if (tab === 'Incidencias' && isMaestro && onResueltasVistasUpdate) {
        onResueltasVistasUpdate(misResueltasTotal);
      }
    }
  };

  const tabEstaActiva = (items: string[]) => items.includes(activeTab) && !isDashboard;

  return (
    <nav className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-4">
        {opcionesNavegacion.map((grupo) => {
          const itemsVisibles = grupo.items.filter(usuarioPuedeVerTab);
          if (itemsVisibles.length === 0) return null;

          const grupoActivo = tabEstaActiva(itemsVisibles);
          const notificacionesGrupo = itemsVisibles.reduce((total, item) => total + obtenerNotificacionesTab(item), 0);

          if (grupo.tipo === 'item') {
            const item = itemsVisibles[0];
            const notificaciones = obtenerNotificacionesTab(item);

            return (
              <button
                key={grupo.titulo}
                onClick={() => seleccionarTab(item)}
                className={`text-sm font-bold transition-colors flex items-center py-4 -mb-[1px] ${
                  activeTab === item && !isDashboard
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item}
                {notificaciones > 0 && (
                  <span className="ml-2 flex items-center justify-center bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    {notificaciones}
                  </span>
                )}
              </button>
            );
          }

          return (
            <div key={grupo.titulo} className="relative">
              <button
                type="button"
                onClick={() => setMenuAbierto(menuAbierto === grupo.titulo ? null : grupo.titulo)}
                className={`text-sm font-bold transition-colors flex items-center gap-1 py-4 -mb-[1px] ${
                  grupoActivo
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {grupo.titulo}
                <ChevronDown className={`w-4 h-4 transition-transform ${menuAbierto === grupo.titulo ? 'rotate-180' : ''}`} />
                {notificacionesGrupo > 0 && (
                  <span className="ml-1 flex items-center justify-center bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    {notificacionesGrupo}
                  </span>
                )}
              </button>

              {menuAbierto === grupo.titulo && (
                <div className="absolute left-0 top-full z-50 min-w-52 bg-white border border-gray-200 rounded-sm shadow-lg py-2">
                  {itemsVisibles.map((item) => {
                    const notificaciones = obtenerNotificacionesTab(item);

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => seleccionarTab(item)}
                        className={`w-full text-left px-4 py-2 text-sm font-bold flex items-center justify-between gap-3 transition-colors ${
                          activeTab === item && !isDashboard
                            ? 'bg-gray-100 text-black'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span>{item}</span>
                        {notificaciones > 0 && (
                          <span className="flex items-center justify-center bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            {notificaciones}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center space-x-4 text-sm font-bold">
        <div className="flex items-center text-gray-700">
          <User className="w-4 h-4 mr-2" />
          {usuarioActivo ? `${usuarioActivo.name} (${usuarioActivo.role})` : 'Cargando...'}
        </div>
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.href = '/login';
          }}
          className="text-red-500 hover:text-red-700 flex items-center space-x-1"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </nav>
  );
}
