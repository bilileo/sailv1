"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface FormularioGruposProps {
  groupId: number;          // id of the selected group
  onClose: () => void;      // close handler
}

interface Asignatura {
  id: number;
  name: string;
  materiaCode: string;
  semestre: number;
}

// Modal para añadir asignaturas a un grupo
export function FormularioGrupos({ groupId, onClose }: FormularioGruposProps) {
  const [semestre, setSemestre] = useState<number | null>(null);
  const [allSubjects, setAllSubjects] = useState<Asignatura[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initialLoad, setInitialLoad] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar catálogo de asignaturas y relaciones existentes
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Cargar todas las asignaturas
        const resCat = await fetch('/api/catalogo');
        if (!resCat.ok) throw new Error('Error al cargar catálogo');
        const catalog: Asignatura[] = await resCat.json();
        setAllSubjects(catalog);

        // 2. Cargar asignaturas ya asignadas al grupo
        const resLlevan = await fetch(`/api/Llevan?idGrupo=${groupId}`);
        if (!resLlevan.ok) throw new Error('Error al cargar asignaciones del grupo');
        const llevanData: { idAsignatura: number }[] = await resLlevan.json();
        
        const existingIds = new Set(llevanData.map(item => item.idAsignatura));
        setSelectedIds(existingIds);

        // Si hay asignaturas asignadas, deducimos el semestre a partir de la primera
        if (existingIds.size > 0) {
          const firstSubjectId = existingIds.values().next().value;
          const subjectInfo = catalog.find(s => s.id === firstSubjectId);
          if (subjectInfo) {
            setSemestre(subjectInfo.semestre);
          }
        }
      } catch (error) {
        toast.error('Error al inicializar datos');
        console.error(error);
      } finally {
        setInitialLoad(false);
      }
    };
    
    fetchData();
  }, [groupId]);

  // Las asignaturas a mostrar son las que coinciden con el semestre seleccionado
  const subjectsToDisplay = useMemo(() => {
    if (!semestre) return [];
    return allSubjects.filter(s => s.semestre === semestre);
  }, [allSubjects, semestre]);

  const toggleSubject = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Sincroniza la relación grupo-asignatura en la base de datos
  const handleGuardar = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/Llevan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idGrupo: groupId,
          idsAsignatura: Array.from(selectedIds)
        })
      });
      
      if (response.ok) {
        toast.success('Asignaturas del grupo actualizadas');
        onClose();
      } else {
        const errorText = await response.text();
        toast.error(`Error: ${errorText}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de red al guardar');
    } finally {
      setSaving(false);
    }
  };

  // El semestre está bloqueado si hay asignaturas seleccionadas
  // Así obligamos a que solo pertenezcan a un semestre
  const isSemesterLocked = selectedIds.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            Asignaturas del grupo
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {initialLoad ? (
            <div className="text-center py-8 text-sm text-gray-500 font-bold">Cargando datos...</div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Semestre
                </label>
                <select
                  className={`w-full border-2 rounded-sm px-3 py-2 text-sm text-black font-medium outline-none transition-colors ${
                    isSemesterLocked 
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500' 
                      : 'border-gray-300 focus:border-[#0b6e3f] bg-white'
                  }`}
                  value={semestre || ''}
                  disabled={isSemesterLocked}
                  onChange={(e) => {
                    setSemestre(Number(e.target.value));
                    setSelectedIds(new Set()); // Reset selections on semester change
                  }}
                >
                  <option value="" disabled>Seleccione un semestre</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem}>Semestre {sem}</option>
                  ))}
                </select>
                {isSemesterLocked && (
                  <p className="text-xs text-gray-500 mt-1">
                    Para seleccionar otro semestre, primero desmarca todas las asignaturas.
                  </p>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-sm">
                {subjectsToDisplay.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {subjectsToDisplay.map(subject => (
                      <li key={subject.id} className="flex items-center px-4 py-3 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`subject-${subject.id}`}
                          checked={selectedIds.has(subject.id)}
                          onChange={() => toggleSubject(subject.id)}
                          className="w-4 h-4 text-[#0b6e3f] border-gray-300 rounded focus:ring-[#0b6e3f]"
                        />
                        <label htmlFor={`subject-${subject.id}`} className="ml-3 text-sm font-medium text-gray-700 cursor-pointer flex-1">
                          {subject.name} <span className="text-gray-400 ml-1">({subject.materiaCode})</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  semestre && <div className="text-center py-4 text-sm text-gray-500 font-bold">No hay asignaturas en este semestre.</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={saving}
            className="px-4 py-2 text-sm font-bold text-white bg-[#0b6e3f] hover:bg-green-800 rounded transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
