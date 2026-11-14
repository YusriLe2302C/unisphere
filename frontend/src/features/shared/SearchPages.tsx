import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  Skeleton,
} from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import { useToast } from '../../app/providers/useToast';
import { openDirectConversation } from '../../services/career/career-api';
import {
  getPublicProfile,
  searchPeople,
  type SearchPerson,
} from '../../services/shared/shared-api';
import './shared.css';

function PersonCard({ person }: { person: SearchPerson }) {
  const privacy = person.privacySettings;
  return (
    <Link to={`/app/people/${encodeURIComponent(person._id)}`} className="shared-person-link">
      <Card className="shared-person-card">
        <Avatar src={person.avatar} name={person.name} />
        <div>
          <strong>{person.name}</strong>
          <p>
            {person.headline || person.role.replaceAll('_', ' ')}
            {person.department && privacy?.showAcademicDetails ? ` · ${person.department}` : ''}
          </p>
          {person.skills?.length ? <small>{person.skills.slice(0, 4).join(' · ')}</small> : null}
        </div>
        <Badge variant="outline">{person.role.replaceAll('_', ' ')}</Badge>
      </Card>
    </Link>
  );
}

export function SearchResultsPage() {
  const { session, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const [entry, setEntry] = useState(query);
  const [page, setPage] = useState(1);
  const [people, setPeople] = useState<SearchPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token || !query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await searchPeople(session.token, {
        q: query.trim(),
        institution: user?.institution,
        page,
        limit: 20,
      });
      setPeople(result.users);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Search is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [session?.token, user?.institution, query, page]);
  useEffect(() => {
    void load();
  }, [load]);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setParams(entry.trim() ? { q: entry.trim() } : {});
  }
  return (
    <div className="shared-page">
      <header className="shared-heading">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Search</h1>
          <p>Find people in your institution using the directory search.</p>
        </div>
      </header>
      <form className="shared-search-form" onSubmit={submit}>
        <Input
          aria-label="Search people"
          placeholder="Search by name, role, department, or skill"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          leadingIcon={<Search size={17} />}
        />
        <Button type="submit">Search</Button>
      </form>
      {query && (
        <p className="shared-muted">
          Results for <strong>{query}</strong> · {total} matches
        </p>
      )}
      {error ? (
        <ErrorState description={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="shared-skeleton-list">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} height={78} />
          ))}
        </div>
      ) : !people.length ? (
        <EmptyState
          icon={<Search />}
          title={query ? 'No people found' : 'Search your institution'}
          description={
            query
              ? 'Try another name, role, department, or skill.'
              : 'Enter a search term to discover directory profiles.'
          }
        />
      ) : (
        <div className="shared-person-list">
          {people.map((person) => (
            <PersonCard key={person._id} person={person} />
          ))}
        </div>
      )}
      {!loading && total > 20 && (
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} />
      )}
    </div>
  );
}

export function PublicProfilePage() {
  const { id } = useParams();
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [person, setPerson] = useState<SearchPerson | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!id || !session?.token) return;
    setLoading(true);
    try {
      const result = await getPublicProfile(session.token, id);
      setPerson(result.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'This profile could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [id, session?.token]);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading)
    return (
      <div className="shared-page">
        <Skeleton height={180} />
      </div>
    );
  if (error || !person)
    return (
      <ErrorState
        title="Profile unavailable"
        description={error || 'This profile is unavailable.'}
        onRetry={() => void load()}
      />
    );
  const profile = person;
  const privacy = profile.privacySettings;
  const own = profile._id === user?._id;
  async function message() {
    if (!session?.token) return;
    setSending(true);
    try {
      const result = await openDirectConversation(session.token, profile._id);
      navigate(`/app/conversations/${encodeURIComponent(result.conversation._id)}`);
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'A conversation could not be opened.', 'error');
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="shared-page">
      <Card className="shared-public-profile">
        <Avatar name={profile.name} src={profile.avatar} size="xl" />
        <div>
          <span className="eyebrow">{profile.institution}</span>
          <h1>{profile.name}</h1>
          <p>{profile.headline || profile.role.replaceAll('_', ' ')}</p>
          {profile.department && privacy?.showAcademicDetails && <p>{profile.department}</p>}
          {privacy?.showEmail && profile.email && (
            <p>
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
            </p>
          )}
          {privacy?.showPhone && profile.phone && <p>{profile.phone}</p>}
          <Badge>{profile.role.replaceAll('_', ' ')}</Badge>
        </div>
        {!own && privacy?.allowDirectMessages !== false && (
          <Button loading={sending} onClick={() => void message()}>
            Message
          </Button>
        )}
      </Card>
      <p className="shared-muted">
        Profile details are shown according to this person’s privacy settings.
      </p>
      <Link to="/app/search">Back to search</Link>
    </div>
  );
}
