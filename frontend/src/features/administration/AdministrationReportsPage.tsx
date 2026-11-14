import { useCallback, useEffect, useState } from 'react';
import { Activity, Download, FileBarChart, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getAuditEntries,
  getReports,
  updateReport,
  type AuditEntry,
  type ReportRecord,
} from '../../services/administration/administration-api';
import {
  FacultyEmpty,
  FacultyError,
  FacultyHeading,
  FacultyLoading,
} from '../faculty/faculty-components';
import '../faculty/faculty.css';

export function AdministrationReportsPage() {
  const { session } = useAuth();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      getReports(session.token),
      getAuditEntries(session.token),
    ]);
    const errs: string[] = [];
    if (results[0].status === 'fulfilled') setReports(results[0].value.reports);
    else
      errs.push(
        results[0].reason instanceof ApiError
          ? results[0].reason.message
          : 'Reports could not be loaded.',
      );
    if (results[1].status === 'fulfilled') setAudit(results[1].value.entries);
    else
      errs.push(
        results[1].reason instanceof ApiError
          ? results[1].reason.message
          : 'Audit history could not be loaded.',
      );
    setError(errs.join(' '));
    setLoading(false);
  }, [session?.token]);
  useEffect(() => {
    void load();
  }, [load]);
  async function resolve(item: ReportRecord, status: 'resolved' | 'dismissed') {
    if (!session?.token) return;
    setBusy(item._id);
    setError('');
    try {
      const r = await updateReport(session.token, item._id, status);
      setReports((rows) => rows.map((row) => (row._id === item._id ? r.report : row)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Report could not be updated.');
    } finally {
      setBusy('');
    }
  }
  const visible = filter === 'all' ? reports : reports.filter((r) => r.status === filter);
  const pending = reports.filter((r) => r.status === 'pending').length;
  function exportAudit() {
    const rows = [
      ['action', 'entityType', 'entityId', 'reason', 'timestamp'],
      ...audit.map((entry) => [
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.reason || '',
        entry.timestamp || entry.createdAt || '',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'unisphere-audit.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return (
    <div className="faculty-page">
      <FacultyHeading
        title="Reports and audit"
        description="Review submitted reports and the available administrative audit trail."
        action={
          <Button variant="outline" onClick={exportAudit} leadingIcon={<Download size={15} />}>
            Export audit CSV
          </Button>
        }
      />
      {error && <FacultyError message={error} retry={() => void load()} />}
      <div className="faculty-metrics">
        <Card className="faculty-metric">
          <span>
            <FileBarChart />
          </span>
          <small>Reports returned</small>
          <strong>{loading ? '—' : reports.length}</strong>
        </Card>
        <Card className="faculty-metric">
          <span>
            <ShieldCheck />
          </span>
          <small>Pending review</small>
          <strong>{loading ? '—' : pending}</strong>
        </Card>
        <Card className="faculty-metric">
          <span>
            <Activity />
          </span>
          <small>Audit records loaded</small>
          <strong>{loading ? '—' : audit.length}</strong>
        </Card>
      </div>
      <section className="faculty-panel" aria-label="Report status chart">
        <header className="faculty-panel-head">
          <div>
            <span className="eyebrow">REPORT SUMMARY</span>
            <h2>Reports by status</h2>
          </div>
        </header>
        <div
          role="img"
          aria-label={`Report statuses: ${reports.filter((item) => item.status === 'pending').length} pending, ${reports.filter((item) => item.status === 'resolved').length} resolved, ${reports.filter((item) => item.status === 'dismissed').length} dismissed.`}
          className="admin-report-chart"
        >
          {(['pending', 'resolved', 'dismissed'] as const).map((status) => {
            const count = reports.filter((item) => item.status === status).length;
            const percent = reports.length ? (count / reports.length) * 100 : 0;
            return (
              <div className="admin-report-chart-row" key={status}>
                <span>{status}</span>
                <div className="admin-report-track">
                  <span className={`admin-report-bar ${status}`} style={{ width: `${percent}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            );
          })}
        </div>
        <p className="faculty-data-note">
          Chart values reflect the report records returned to your account.
        </p>
      </section>
      <section className="faculty-panel">
        <header className="faculty-panel-head">
          <div>
            <span className="eyebrow">REPORT QUEUE</span>
            <h2>Content and user reports</h2>
          </div>
          <select
            aria-label="Filter report status"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </header>
        {loading ? (
          <FacultyLoading />
        ) : visible.length ? (
          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Reported item</th>
                  <th>Reason</th>
                  <th>Reporter</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((report) => (
                  <tr key={report._id}>
                    <td>
                      <strong>{report.targetType}</strong>
                      <small>{report.targetId}</small>
                    </td>
                    <td>{report.reason}</td>
                    <td>
                      {report.reporter?.name || 'Reporter'}
                      <small>{report.reporter?.role}</small>
                    </td>
                    <td>
                      <Badge
                        variant={
                          report.status === 'pending'
                            ? 'warning'
                            : report.status === 'resolved'
                              ? 'success'
                              : 'neutral'
                        }
                      >
                        {report.status}
                      </Badge>
                    </td>
                    <td>{new Date(report.createdAt).toLocaleString()}</td>
                    <td>
                      {report.status === 'pending' && (
                        <div className="admin-row-actions">
                          <Button
                            size="sm"
                            loading={busy === report._id}
                            onClick={() => void resolve(report, 'resolved')}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={Boolean(busy)}
                            onClick={() => void resolve(report, 'dismissed')}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <FacultyEmpty
            title="No reports in this view"
            description="Reports returned by the administration API will appear here."
          />
        )}
      </section>
      <section className="faculty-panel">
        <header className="faculty-panel-head">
          <div>
            <span className="eyebrow">AUDIT HISTORY</span>
            <h2>Recent administrative activity</h2>
          </div>
          <Badge variant="outline">{audit.length} records</Badge>
        </header>
        {loading ? (
          <FacultyLoading />
        ) : audit.length ? (
          <div className="admin-audit-list">
            {audit.map((entry, index) => (
              <article key={entry._id || `${entry.entityId}-${index}`}>
                <span className="admin-audit-icon">
                  <Activity size={15} />
                </span>
                <div>
                  <strong>{entry.action.replaceAll('.', ' · ')}</strong>
                  <small>
                    {entry.entityType} · {entry.entityId}
                    {entry.actor?.name ? ` · ${entry.actor.name}` : ''}
                  </small>
                  {entry.reason && <p>{entry.reason}</p>}
                </div>
                <time>
                  {entry.timestamp || entry.createdAt
                    ? new Date(entry.timestamp || entry.createdAt!).toLocaleString()
                    : 'Time unavailable'}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <FacultyEmpty
            title="No audit records returned"
            description="Your role may have no visible activity records yet."
          />
        )}
      </section>
    </div>
  );
}
