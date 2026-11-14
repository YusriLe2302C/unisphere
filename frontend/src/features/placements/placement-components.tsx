import { ArrowRight, BriefcaseBusiness, Building2, CalendarClock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Badge, Button, Card } from '../../components/ui';
import type {
  PlacementApplication,
  PlacementOpportunity,
} from '../../services/placements/placement-api';

import { placementPaths } from './placement-paths';

const statusVariants: Record<
  string,
  'neutral' | 'brand' | 'success' | 'warning' | 'critical' | 'orange' | 'outline'
> = {
  applied: 'brand',
  under_review: 'warning',
  shortlisted: 'success',
  accepted: 'success',
  rejected: 'critical',
  withdrawn: 'neutral',
  selected: 'success',
  not_selected: 'critical',
  waitlisted: 'warning',
  scheduled: 'brand',
  completed: 'neutral',
  cancelled: 'neutral',
};
export function PlacementStatus({ status }: { status: string }) {
  return (
    <Badge variant={statusVariants[status] || 'outline'} size="sm" dot>
      {status.replaceAll('_', ' ')}
    </Badge>
  );
}
export function PlacementHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="placement-heading">
      <div>
        <span className="eyebrow">RNS INSTITUTE OF TECHNOLOGY · PLACEMENT CELL</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function PlacementOpportunityCard({
  opportunity,
  application,
}: {
  opportunity: PlacementOpportunity;
  application?: PlacementApplication;
}) {
  const deadline = opportunity.applicationDeadline || opportunity.deadline;
  return (
    <Card className="placement-opportunity-card">
      <div className="placement-card-top">
        <span className="placement-company-icon">
          <Building2 size={19} />
        </span>
        <div>
          <h2>{opportunity.organization}</h2>
          <p>{opportunity.title}</p>
        </div>
        {application && <PlacementStatus status={application.status} />}
      </div>
      <p className="placement-card-description">{opportunity.description}</p>
      <div className="placement-card-meta">
        <span>
          <MapPin size={14} />
          {opportunity.location || 'Location not listed'}
        </span>
        {deadline && (
          <span>
            <CalendarClock size={14} />
            Deadline {new Date(deadline).toLocaleDateString()}
          </span>
        )}
        {opportunity.package && <span>{opportunity.package}</span>}
      </div>
      <div className="placement-card-tags">
        {opportunity.minimumCgpa !== undefined && (
          <Badge variant="outline" size="sm">
            Minimum CGPA {opportunity.minimumCgpa}
          </Badge>
        )}
        {opportunity.eligibleBranches?.length > 0 && (
          <Badge variant="outline" size="sm">
            {opportunity.eligibleBranches.includes('all')
              ? 'All listed branches'
              : opportunity.eligibleBranches.join(', ')}
          </Badge>
        )}
      </div>
      <Link
        className="placement-card-link"
        to={`${placementPaths.opportunities}/${encodeURIComponent(opportunity._id)}`}
      >
        {application ? 'View application & drive' : 'View opportunity'}
        <ArrowRight size={15} />
      </Link>
    </Card>
  );
}
export function PlacementEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="placement-empty">
      <span>
        <BriefcaseBusiness size={21} />
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function PlacementError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="placement-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function PlacementLoading() {
  return (
    <div className="placement-loading" role="status">
      Loading placement records…
    </div>
  );
}
