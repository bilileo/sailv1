export type StudentStatus = 'normal' | 'tarde' | 'ausente' | 'abandono';

export interface StudentRow {
  id: string;
  name: string;
  status: StudentStatus;
  observaciones?: string;
  deviceTypeId?: number | null;
  deviceType?: string | null;
  seatDeviceTypeId?: number | null;
  seatDeviceType?: string | null;
}

export interface CatalogoClase {
  id: string;
  name: string;
  materiaCode: string;
  color?: string;
  semestre: number;
  grupo: string;
}

export interface Alumno {
  id?: number;
  nombre: string;
  matricula: string;
  correo?: string;
}

export interface DeviceType {
  id: number;
  name: string;
}

export interface NuevaClase {
  nombre: string;
  laboratorioId: string;
  maestroId: string;
  dia: string;
  horario: string;
  duracion: number
  grupo: string;
}