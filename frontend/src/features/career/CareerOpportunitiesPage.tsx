import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, BriefcaseBusiness } from 'lucide-react';
import { Badge } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import { getCareerOpportunities, type CareerOpportunity } from '../../services/career/career-api';
import { CareerEmpty, CareerError, CareerHeading, CareerLoading } from './career-components';
import { formatCareerDeadline } from './career-format';
import './career.css';

export function CareerOpportunitiesPage() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<CareerOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOpportunities((await getCareerOpportunities(user?.institution || '')).opportunities);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Opportunities could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [user?.institution]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="career-page">
      <CareerHeading
        title="Career opportunities"
        description="Opportunities shared with your institution community."
      />
      <div className="career-opportunities-page-header">
        <BriefcaseBusiness size={18} />
        <span>Opportunity records are provided by the institution opportunity service.</span>
      </div>
      {error && <CareerError message={error} retry={() => void load()} />}
      {loading ? (
        <CareerLoading />
      ) : opportunities.length ? (
        <div className="career-opportunity-list">
          {opportunities.map((item) => (
            <article key={item._id}>
              <div>
                <Badge variant="brand" size="sm">
                  {item.type}
                </Badge>
                <h3>{item.title}</h3>
                <p>
                  {item.organization}
                  {item.location ? ` · ${item.location}` : ''}
                </p>
                <p>{item.description}</p>
                <small>{formatCareerDeadline(item.deadline)}</small>
              </div>
              {item.applyUrl && (
                <a
                  className="button button-secondary button-sm"
                  href={item.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit opportunity <ArrowUpRight size={14} />
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <CareerEmpty
          title="No opportunities available"
          description="Institution opportunities will appear here when the service returns them."
        />
      )}
    </div>
  );
}
