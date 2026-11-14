import { ArrowRight, Compass, MessageCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Avatar, Badge, Button, Card, EmptyState, Spinner } from '../../components/ui';
import type { CareerPerson } from '../../services/career/career-api';
import { careerPaths } from './career-paths';

export function CareerNav({ active }: { active: string }) {
  const items = [
    ['home', 'Overview', careerPaths.home],
    ['alumni', 'Alumni directory', careerPaths.alumni],
    ['questions', 'Career questions', careerPaths.questions],
    ['mentorship', 'Mentorship', careerPaths.mentorship],
    ['connections', 'Connections', careerPaths.connections],
    ['conversations', 'Messages', careerPaths.conversations],
  ] as const;
  return (
    <nav className="career-subnav" aria-label="Career Connect">
      {items.map(([id, label, to]) => (
        <Link
          key={id}
          to={to}
          className={active === id ? 'active' : ''}
          aria-current={active === id ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function CareerHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="career-heading">
      <div>
        <span className="eyebrow">CAREER CONNECT</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function CareerLoading() {
  return (
    <div className="career-loading" role="status">
      <Spinner /> Loading Career Connect…
    </div>
  );
}
export function CareerError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="career-error" role="alert">
      <span>{message}</span>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function CareerEmpty({
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
      icon={<Compass size={20} />}
      title={title}
      description={description}
      action={action}
    />
  );
}
export function PersonCard({ person, actions }: { person: CareerPerson; actions?: ReactNode }) {
  return (
    <Card className="career-person-card">
      <div className="career-person-top">
        <Avatar name={person.name} src={person.avatar} size="lg" />
        <div>
          <h2>{person.name}</h2>
          <p>
            {person.alumniProfile?.designation}
            {person.alumniProfile?.company ? ` · ${person.alumniProfile.company}` : ''}
          </p>
        </div>
      </div>
      {person.headline && <p className="career-person-headline">{person.headline}</p>}
      <div className="career-person-meta">
        {person.alumniProfile?.industry && (
          <Badge variant="brand" size="sm">
            {person.alumniProfile.industry}
          </Badge>
        )}
        {person.alumniProfile?.yearsExperience !== undefined && (
          <span>{person.alumniProfile.yearsExperience} years experience</span>
        )}
      </div>
      {person.skills?.length ? (
        <div className="career-skills">
          {person.skills.slice(0, 5).map((skill) => (
            <Badge key={skill} variant="outline" size="sm">
              {skill}
            </Badge>
          ))}
        </div>
      ) : null}
      {actions && <div className="career-person-actions">{actions}</div>}
    </Card>
  );
}
export function CareerMetric({
  label,
  value,
  to,
  icon,
}: {
  label: string;
  value: number | string;
  to: string;
  icon: ReactNode;
}) {
  return (
    <Card className="career-metric">
      <span className="career-metric-icon">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
      <Link to={to}>
        Explore <ArrowRight size={14} />
      </Link>
    </Card>
  );
}
export function ConversationLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="career-message-link" to={to}>
      <MessageCircle size={15} />
      {children}
    </Link>
  );
}
export function ConnectionPerson({ person, note }: { person: CareerPerson; note?: string }) {
  return (
    <div className="career-connection-person">
      <Avatar name={person.name} src={person.avatar} size="sm" />
      <div>
        <strong>{person.name}</strong>
        <small>{note || person.headline || person.role}</small>
      </div>
      <Users size={15} />
    </div>
  );
}
