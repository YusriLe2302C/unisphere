import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Search, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getAlumni,
  openDirectConversation,
  requestCareerConnection,
  type CareerPerson,
} from '../../services/career/career-api';
import {
  CareerEmpty,
  CareerError,
  CareerHeading,
  CareerLoading,
  CareerNav,
  PersonCard,
} from './career-components';
import { careerPaths } from './career-paths';
import './career.css';

export function AlumniDirectoryPage() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState<CareerPerson[]>([]);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [company, setCompany] = useState('');
  const [skill, setSkill] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      const r = await getAlumni(session.token, {
        industry: industry || undefined,
        company: company || undefined,
        skill: skill || undefined,
        limit: 100,
      });
      setPeople(r.alumni.filter((person) => person._id !== user?._id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The alumni directory could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.token, industry, company, skill, user?._id]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = people.filter((p) =>
    `${p.name} ${p.headline || ''} ${p.alumniProfile?.company || ''} ${p.alumniProfile?.designation || ''} ${p.alumniProfile?.industry || ''} ${(p.skills || []).join(' ')}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function connect(person: CareerPerson) {
    if (!session?.token) return;
    setBusy(person._id);
    setError('');
    setNotice('');
    try {
      await requestCareerConnection(session.token, person._id);
      setNotice(`Connection request sent to ${person.name}.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connection request could not be sent.');
    } finally {
      setBusy('');
    }
  }
  async function message(person: CareerPerson) {
    if (!session?.token) return;
    setBusy(person._id);
    setError('');
    try {
      const r = await openDirectConversation(session.token, person._id);
      navigate(`/app/conversations/${r.conversation._id}`);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'A conversation could not be opened for this profile.',
      );
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="career-page">
      <CareerNav active="alumni" />
      <CareerHeading
        title="Alumni directory"
        description="Discover RNS alumni and their professional experience. Search and filters use the institution alumni directory."
      />
      <div className="career-directory-filters">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search names, roles, companies, skills…"
          aria-label="Search alumni"
          leadingIcon={<Search size={16} />}
        />
        <Input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="Filter by industry"
          aria-label="Filter by industry"
        />
        <Input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Filter by company"
          aria-label="Filter by company"
        />
        <Input
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          placeholder="Filter by skill"
          aria-label="Filter by skill"
        />
      </div>
      {notice && (
        <p className="career-success" role="status">
          {notice} <Link to={careerPaths.connections}>View connections</Link>
        </p>
      )}
      {error && <CareerError message={error} retry={() => void load()} />}
      <p className="career-results-count">
        {loading ? 'Loading alumni…' : `${filtered.length} alumni found`}
      </p>
      {loading ? (
        <CareerLoading />
      ) : filtered.length ? (
        <div className="career-people-grid">
          {filtered.map((person) => (
            <PersonCard
              key={person._id}
              person={person}
              actions={
                <>
                  {(user?.role === 'student' || user?.role === 'alumni') && (
                    <Button
                      size="sm"
                      loading={busy === person._id}
                      onClick={() => void connect(person)}
                      leadingIcon={<UserPlus size={14} />}
                    >
                      {user?.role === 'alumni' ? 'Connect with alum' : 'Connect'}
                    </Button>
                  )}
                  {user?.role === 'student' && (
                    <Link
                      className="button button-secondary button-sm"
                      to={`${careerPaths.mentorship}?mentor=${encodeURIComponent(person._id)}`}
                    >
                      Mentorship
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    loading={busy === person._id}
                    onClick={() => void message(person)}
                    leadingIcon={<MessageCircle size={14} />}
                  >
                    Message
                  </Button>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <CareerEmpty
          title="No alumni found"
          description="Try a broader search or clear one or more filters."
        />
      )}
    </div>
  );
}
