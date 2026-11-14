import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input, Select } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getPlacementOpportunities,
  type PlacementOpportunity,
} from '../../services/placements/placement-api';
import {
  PlacementEmpty,
  PlacementError,
  PlacementHeading,
  PlacementLoading,
  PlacementOpportunityCard,
} from './placement-components';
import './placements.css';

const PAGE_SIZE = 9;
export function PlacementOpportunitiesPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<PlacementOpportunity[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!user?.institution) return;
    setLoading(true);
    setError('');
    try {
      const result = await getPlacementOpportunities(user.institution, {
        search: search || undefined,
        type: type === 'All' ? undefined : type,
        location: location || undefined,
      });
      setRecords(result.opportunities);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Placement opportunities could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [user?.institution, search, type, location]);
  useEffect(() => {
    void load();
  }, [load]);
  const sorted = useMemo(
    () =>
      [...records].sort((a, b) =>
        sort === 'company'
          ? a.organization.localeCompare(b.organization)
          : sort === 'deadline'
            ? new Date(a.applicationDeadline || a.deadline || '9999-12-31').getTime() -
              new Date(b.applicationDeadline || b.deadline || '9999-12-31').getTime()
            : new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      ),
    [records, sort],
  );
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <div className="placement-page">
      <PlacementHeading
        title="Placement opportunities"
        description="Browse active placement drives made available to your institution. Eligibility and application decisions are verified by the placement backend."
      />
      <section className="placement-filters">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search company, role, or description"
          aria-label="Search placement drives"
          leadingIcon={<Search size={16} />}
        />
        <Input
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setPage(1);
          }}
          placeholder="Location"
          aria-label="Filter by location"
        />
        <Select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by opportunity type"
        >
          <option value="All">All drive types</option>
          {[...new Set(records.map((r) => r.type))].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort placement drives"
        >
          <option value="recent">Recently posted</option>
          <option value="deadline">Closest deadline</option>
          <option value="company">Company name</option>
        </Select>
      </section>
      {error && <PlacementError message={error} onRetry={() => void load()} />}
      <p className="placement-results">
        {loading ? 'Loading drives…' : `${sorted.length} placement drives`}
      </p>
      {loading ? (
        <PlacementLoading />
      ) : pageItems.length ? (
        <>
          <div className="placement-opportunity-grid placement-list-grid">
            {pageItems.map((o) => (
              <PlacementOpportunityCard key={o._id} opportunity={o} />
            ))}
          </div>
          {pages > 1 && (
            <nav className="placement-pagination" aria-label="Placement result pages">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </nav>
          )}
        </>
      ) : (
        <PlacementEmpty
          title="No placement drives found"
          description="Try a broader search or remove one of the filters."
        />
      )}
    </div>
  );
}
