export function formatCareerDeadline(deadline?: string): string {
  if (!deadline) return 'Deadline not listed';
  const date = new Date(deadline);
  return Number.isNaN(date.getTime())
    ? `Deadline ${deadline}`
    : `Deadline ${date.toLocaleDateString()}`;
}
