export function getAttendanceStatus(value: number): {
  label: 'Excellent' | 'Eligible' | 'Shortage' | 'Critical';
  tone: 'success' | 'warning' | 'orange' | 'critical';
} {
  if (value > 80) return { label: 'Excellent', tone: 'success' };
  if (value >= 75) return { label: 'Eligible', tone: 'warning' };
  if (value >= 70) return { label: 'Shortage', tone: 'orange' };
  return { label: 'Critical', tone: 'critical' };
}
