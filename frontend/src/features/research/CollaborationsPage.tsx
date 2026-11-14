import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Handshake, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getCollaborations,
  type ResearchCollaboration,
} from '../../services/research/research-api';
import {
  ResearchEmpty,
  ResearchError,
  ResearchLoading,
  ResearchNavigation,
  ResearchPageHeading,
  ResearchPagination,
  ResearchStatusBadge,
} from './research-components';
import { researchPaths } from './research-paths';
import './research.css';

export function CollaborationsPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<ResearchCollaboration[]>([]);
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCollaborations(session?.token, {
        search: search.trim() || undefined,
        skill: skill.trim() || undefined,
        status,
        page,
        limit: 12,
      });
      setItems(result.collaborations);
      setPages(result.pages || 1);
      setTotal(result.total);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Collaborations could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.token, search, skill, status, page]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="research-page">
      <ResearchNavigation active="collaborations" />
      <ResearchPageHeading
        title="Research collaborations"
        description="Find open research projects and contribute the skills you already have."
        action={
          <div className="research-heading-actions">
            <Link
              className="button button-secondary"
              to={`${researchPaths.collaborations}/requests`}
            >
              My requests
            </Link>
            <Link className="button button-primary" to={researchPaths.createCollaboration}>
              <Handshake size={15} /> Start a collaboration
            </Link>
          </div>
        }
      />
      <div className="research-filters">
        <label className="research-search">
          <span className="us-sr-only">Search collaborations</span>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            leadingIcon={<Search size={15} />}
            placeholder="Search projects, subjects, or skills"
          />
        </label>
        <label>
          Required skill
          <Input
            value={skill}
            onChange={(event) => {
              setSkill(event.target.value);
              setPage(1);
            }}
            placeholder="e.g. data analysis"
          />
        </label>
        <label>
          Project status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="All">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>
      {error ? (
        <ResearchError message={error} onRetry={() => void load()} />
      ) : loading && items.length === 0 ? (
        <ResearchLoading label="Loading collaboration projects…" />
      ) : items.length ? (
        <>
          <p className="research-result-count">{total} projects found</p>
          <div className="research-collaboration-grid">
            {items.map((item) => (
              <CollaborationCard key={item._id} item={item} />
            ))}
          </div>
          <ResearchPagination page={page} pages={pages} onChange={setPage} />
        </>
      ) : (
        <ResearchEmpty
          title="No collaborations found"
          description="Try changing the search, skill, or status filters."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setSkill('');
                setStatus('All');
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
}

function CollaborationCard({ item }: { item: ResearchCollaboration }) {
  const openings = item.openRoles.reduce(
    (sum, role) => sum + Math.max(0, role.vacancies - role.filled),
    0,
  );
  const lead = typeof item.leadResearcher === 'object' ? item.leadResearcher.name : '';
  return (
    <Card className="research-collaboration-card">
      <div className="research-publication-tags">
        <ResearchStatusBadge status={item.status} />
        <span>{item.subject}</span>
      </div>
      <h2>
        <Link to={`${researchPaths.collaborations}/${encodeURIComponent(item._id)}`}>
          {item.title}
        </Link>
      </h2>
      <p>{item.description}</p>
      <div className="research-collaboration-meta">
        <span>{item.department}</span>
        <span>{item.institution}</span>
        {lead && <span>Lead: {lead}</span>}
      </div>
      <div className="research-collaboration-tags">
        {item.requiredSkills.slice(0, 4).map((skillTag) => (
          <span key={skillTag}>{skillTag}</span>
        ))}
      </div>
      <footer>
        <small>
          {openings} available role{openings === 1 ? '' : 's'} · {item.teamMembers.length} team
          member{item.teamMembers.length === 1 ? '' : 's'}
        </small>
        <Link
          className="research-inline-link"
          to={`${researchPaths.collaborations}/${encodeURIComponent(item._id)}`}
        >
          View project <ArrowRight size={14} />
        </Link>
      </footer>
    </Card>
  );
}
