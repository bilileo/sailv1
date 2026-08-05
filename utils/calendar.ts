export function getWeekNumber(date: Date, periodStart: string): number {
  const start = new Date(periodStart + 'T00:00:00');
  // Normalize both dates to midnight to avoid daylight saving time issues
  const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startNorm = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  
  const diffTime = dateNorm.getTime() - startNorm.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 1; // Or handle as needed
  
  return Math.floor(diffDays / 7) + 1;
}

export function getTotalWeeks(periodStart: string, periodEnd: string): number {
  const start = new Date(periodStart + 'T00:00:00');
  const end = new Date(periodEnd + 'T23:59:59');
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.ceil(diffDays / 7);
}

export function getDatesOfWeek(periodStart: string, weekNumber: number): Date[] {
  const start = new Date(periodStart + 'T00:00:00');
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}
