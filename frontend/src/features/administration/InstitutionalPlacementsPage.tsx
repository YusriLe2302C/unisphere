import { useCallback, useEffect, useState } from 'react';
import { BriefcaseBusiness } from 'lucide-react';
import { Badge } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getPlacementOpportunities,
  type PlacementOpportunity,
} from '../../services/placements/placement-api';
import {
  FacultyEmpty,
  FacultyError,
  FacultyHeading,
  FacultyLoading,
} from '../faculty/faculty-components';
import '../faculty/faculty.css';

export function InstitutionalPlacementsPage() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<PlacementOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOpportunities((await getPlacementOpportunities(user?.institution || '')).opportunities);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Institution placement opportunities could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [user?.institution]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="faculty-page">
      <FacultyHeading
        title="Placement overview"
        description={`${user?.institution || 'Institution'} · placement drives currently available through the institution opportunity service.`}
      />
      {error && <FacultyError message={error} retry={() => void load()} />}
      {loading ? (
        <FacultyLoading />
      ) : opportunities.length ? (
        <section className="admin-placement-list">
          {opportunities.map((item) => (
            <article key={item._id}>
              <div>
                <Badge variant={item.isActive ? 'success' : 'neutral'}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <h2>{item.title}</h2>
                <p>
                  {item.organization}
                  {item.location ? ` · ${item.location}` : ''}
                </p>
                <p>{item.description}</p>
                <div className="admin-placement-criteria">
                  {item.eligibleBranches.length > 0 && (
                    <span>Eligible branches: {item.eligibleBranches.join(', ')}</span>
                  )}
                  {item.eligibleBatches.length > 0 && (
                    <span>Eligible batches: {item.eligibleBatches.join(', ')}</span>
                  )}
                  {item.minimumCgpa !== undefined && <span>Minimum CGPA: {item.minimumCgpa}</span>}
                  {item.package && <span>Package: {item.package}</span>}
                  {item.applicationDeadline && (
                    <span>Deadline: {new Date(item.applicationDeadline).toLocaleString()}</span>
                  )}
                </div>
                <small>
                  Company contact information and recruitment details appear only when returned by
                  the opportunity record.
                </small>
              </div>
              <BriefcaseBusiness size={20} />
            </article>
          ))}
        </section>
      ) : (
        <FacultyEmpty
          title="No placement drives returned"
          description="Available institution placement drives will appear here when published."
        />
      )}
    </div>
  );
}
