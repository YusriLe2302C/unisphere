import { ArrowRight, BookOpen, CalendarDays, FileText, Microscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Badge, Button, EmptyState, Spinner } from '../../components/ui';
import type { ResearchPaper } from '../../services/research/research-api';
import { researchPaths } from './research-paths';

export function ResearchNavigation({ active }: { active: string }) {
  const links = [
    ['overview', 'Overview', researchPaths.overview],
    ['publications', 'Publications', researchPaths.publications],
    ['mine', 'My research', researchPaths.mine],
    ['collaborations', 'Collaborations', researchPaths.collaborations],
    ['reviews', 'Reviews', researchPaths.reviews],
  ] as const;
  return (
    <nav className="research-subnav" aria-label="Research and development">
      {links.map(([key, label, href]) => (
        <Link
          className={active === key ? 'active' : ''}
          aria-current={active === key ? 'page' : undefined}
          to={href}
          key={key}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ResearchPageHeading({
  eyebrow = 'RESEARCH & DEVELOPMENT',
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="research-page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

const statusVariant: Record<
  string,
  'neutral' | 'brand' | 'success' | 'warning' | 'critical' | 'orange'
> = {
  draft: 'neutral',
  submitted: 'brand',
  pending_proctor: 'warning',
  pending_guide: 'warning',
  approved: 'success',
  rejected: 'critical',
  published: 'success',
  archived: 'neutral',
  open: 'success',
  in_progress: 'brand',
  completed: 'neutral',
  closed: 'neutral',
  pending: 'warning',
  applied: 'brand',
  shortlisted: 'success',
  accepted: 'success',
  declined: 'critical',
  withdrawn: 'neutral',
};

export function ResearchStatusBadge({ status }: { status?: string }) {
  const label = status?.replaceAll('_', ' ') ?? 'Status unavailable';
  return (
    <Badge variant={statusVariant[status ?? ''] ?? 'outline'} size="sm" dot>
      {label}
    </Badge>
  );
}

export function ResearchLoading({ label = 'Loading research records…' }: { label?: string }) {
  return (
    <div className="research-loading" role="status">
      <Spinner size="md" label={label} />
      {label}
    </div>
  );
}

export function ResearchError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="research-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function ResearchEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <EmptyState
      icon={<Microscope size={21} />}
      title={title}
      description={description}
      action={action}
    />
  );
}

export function PublicationCard({
  paper,
  dataset = false,
}: {
  paper: ResearchPaper;
  dataset?: boolean;
}) {
  const authors =
    paper.authors
      ?.map((author) => author.name)
      .filter(Boolean)
      .join(', ') || 'Author information unavailable';
  return (
    <article className="research-publication-card">
      <div className="research-publication-icon">
        {dataset ? <BookOpen size={19} /> : <FileText size={19} />}
      </div>
      <div className="research-publication-main">
        <div className="research-publication-tags">
          <Badge variant="brand" size="sm">
            {paper.publicationType}
          </Badge>
          {paper.lifecycleStatus && <ResearchStatusBadge status={paper.lifecycleStatus} />}
          {paper.subject && (
            <Badge variant="outline" size="sm">
              {paper.subject}
            </Badge>
          )}
        </div>
        <h2>
          <Link to={`/app/research/papers/${encodeURIComponent(paper._id)}`}>{paper.title}</Link>
        </h2>
        <p className="research-publication-authors">{authors}</p>
        <p className="research-publication-abstract">{paper.abstract}</p>
        <div className="research-publication-meta">
          <span>
            <CalendarDays size={13} />
            {paper.publicationDate
              ? new Date(paper.publicationDate).toLocaleDateString()
              : 'Date unavailable'}
          </span>
          {paper.doi && <span>DOI: {paper.doi}</span>}
          {paper.institution && <span>{paper.institution}</span>}
        </div>
      </div>
      <Link
        className="research-card-arrow"
        to={`/app/research/papers/${encodeURIComponent(paper._id)}`}
        aria-label={`Open ${paper.title}`}
      >
        <ArrowRight size={17} />
      </Link>
    </article>
  );
}

export function ResearchPagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (nextPage: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="research-pagination" aria-label="Research result pages">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {pages}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
