import { useCallback, useEffect, useState } from 'react';
import { Database, Search, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import { getResearchPapers, type ResearchPaper } from '../../services/research/research-api';
import {
  PublicationCard,
  ResearchEmpty,
  ResearchError,
  ResearchLoading,
  ResearchNavigation,
  ResearchPageHeading,
  ResearchPagination,
} from './research-components';
import { researchPaths } from './research-paths';
import './research.css';

const types = [
  'Journal Paper',
  'Conference Proceeding',
  'Conference Paper',
  'Preprint',
  'Patent',
  'Dataset',
  'Technical Report',
];

export function PublicationsPage() {
  const location = useLocation();
  const datasetsOnly = location.pathname.endsWith('/datasets');
  const { session } = useAuth();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All');
  const [type, setType] = useState(datasetsOnly ? 'Dataset' : 'All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getResearchPapers(session?.token, {
        search: search.trim() || undefined,
        subject,
        publicationType: type,
        page,
        limit: 12,
      });
      setPapers(result.papers);
      setTotal(result.total);
      setPages(result.pages || 1);
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : 'Research records could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token, search, subject, type, page]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setType(datasetsOnly ? 'Dataset' : 'All');
    setPage(1);
  }, [datasetsOnly]);

  return (
    <div className="research-page">
      <ResearchNavigation active="publications" />
      <ResearchPageHeading
        eyebrow={datasetsOnly ? 'RESEARCH DATA' : 'RESEARCH LIBRARY'}
        title={datasetsOnly ? 'Datasets' : 'Publications'}
        description={
          datasetsOnly
            ? 'Explore datasets shared through research publication records.'
            : 'Discover peer research, institutional publications, and scholarly work.'
        }
        action={
          !datasetsOnly ? (
            <Link className="button button-primary" to={researchPaths.submit}>
              Submit research
            </Link>
          ) : undefined
        }
      />
      <div className="research-filters">
        <label className="research-search">
          <span className="us-sr-only">Search research</span>
          <Input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            leadingIcon={<Search size={16} />}
            placeholder="Search title, abstract, author, DOI, or subject"
          />
        </label>
        <label>
          Subject
          <select
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setPage(1);
            }}
          >
            <option value="All">All subjects</option>
            {[...new Set(papers.map((paper) => paper.subject).filter(Boolean))]
              .sort()
              .map((item) => (
                <option key={item}>{item}</option>
              ))}
          </select>
        </label>
        <label>
          Publication type
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          >
            <option value="All">All types</option>
            {types.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        {datasetsOnly && (
          <Link className="research-filter-link" to={researchPaths.publications}>
            All publications
          </Link>
        )}
        {!datasetsOnly && (
          <Link className="research-filter-link" to="/app/research/datasets">
            <Database size={14} /> Datasets
          </Link>
        )}
      </div>
      {error ? (
        <ResearchError message={error} onRetry={() => void load()} />
      ) : loading && papers.length === 0 ? (
        <ResearchLoading label="Loading publications…" />
      ) : papers.length ? (
        <>
          <p className="research-result-count">
            {total} {datasetsOnly ? 'datasets' : 'records'} found
          </p>
          <div className="research-publication-list">
            {papers.map((paper) => (
              <PublicationCard
                key={paper._id}
                paper={paper}
                dataset={paper.publicationType === 'Dataset'}
              />
            ))}
          </div>
          <ResearchPagination page={page} pages={pages} onChange={setPage} />
        </>
      ) : (
        <ResearchEmpty
          title={datasetsOnly ? 'No datasets found' : 'No publications found'}
          description={
            search || subject !== 'All' || type !== 'All'
              ? 'Try changing the search or filters.'
              : 'No matching research records are currently available.'
          }
          action={
            (search || subject !== 'All' || (type !== 'All' && !datasetsOnly)) && (
              <Button
                variant="outline"
                leadingIcon={<X size={14} />}
                onClick={() => {
                  setSearch('');
                  setSubject('All');
                  setType(datasetsOnly ? 'Dataset' : 'All');
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      )}
    </div>
  );
}
