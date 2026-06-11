export type StudentStatus = 'normal' | 'tarde' | 'ausente' | 'abandono';

export interface StudentRow {
  id: string;
  name: string;
  status: StudentStatus;
}

export interface CatalogoClase {
  id: string;
  name: string;
  materiaCode: string;
  color?: string;
}

export interface Alumno {
  id?: number;
  nombre: string;
  matricula: string;
  correo?: string;
}

export interface NuevaClase {
  nombre: string;
  laboratorioId: string;
  maestroId: string;
  dia: string;
  horario: string;
  duracion: number
}
