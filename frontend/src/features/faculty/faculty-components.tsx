import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Spinner } from '../../components/ui';

export function FacultyHeading({
  title,
  description,
  action,
  workspaceLabel = 'FACULTY WORKSPACE',
}: {
  title: string;
  description: string;
  action?: ReactNode;
  workspaceLabel?: string;
}) {
  return (
    <header className="faculty-heading">
      <div>
        <span className="eyebrow">RNS INSTITUTE OF TECHNOLOGY · {workspaceLabel}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function FacultyMetric({
  label,
  value,
  icon,
  to,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  to: string;
}) {
  return (
    <Card className="faculty-metric">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
      <Link to={to}>
        Open <span aria-hidden="true">→</span>
      </Link>
    </Card>
  );
}
const variants: Record<
  string,
  'neutral' | 'brand' | 'success' | 'warning' | 'critical' | 'orange' | 'outline'
> = {
  pending_proctor: 'warning',
  pending_guide: 'warning',
  approved: 'success',
  published: 'success',
  rejected: 'critical',
  draft: 'neutral',
  pending_review: 'warning',
  ongoing: 'brand',
  completed: 'neutral',
  cancelled: 'critical',
};
export function FacultyStatus({ status }: { status: string }) {
  return (
    <Badge variant={variants[status] || 'outline'} size="sm" dot>
      {status.replaceAll('_', ' ')}
    </Badge>
  );
}
export function FacultyLoading() {
  return (
    <div className="faculty-loading" role="status">
      <Spinner size="sm" label="Loading faculty information" /> Loading faculty records…
    </div>
  );
}
export function FacultyError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="faculty-error" role="alert">
      <span>{message}</span>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      )}
    </div>
  );
}
export function FacultyEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="faculty-empty">
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}
