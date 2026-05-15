export type StudentStatus = 'normal' | 'tarde' | 'ausente' | 'abandono';

export interface StudentRow {
  id: string;
  name: string;
  status: StudentStatus;
}
