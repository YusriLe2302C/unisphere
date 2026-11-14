import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, UserCog, UserRoundCheck, UserRoundX } from 'lucide-react';
import { Avatar, Badge, Button, Input, Select } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getManagedUsers,
  setUserDisciplinaryStatus,
  setUserRole,
  setUserStatus,
  setUserVerification,
  setUserResponsibilities,
  type ManagedUser,
} from '../../services/administration/administration-api';
import {
  FacultyEmpty,
  FacultyError,
  FacultyHeading,
  FacultyLoading,
} from '../faculty/faculty-components';
import '../faculty/faculty.css';

const roles = ['student', 'alumni', 'faculty', 'dean', 'principal', 'admin'];
export function AdministrationUsersPage() {
  const { session, user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const limit = 20;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      const result = await getManagedUsers(session.token, {
        role: role || undefined,
        isActive: active || undefined,
        page,
        limit,
      });
      setUsers(result.users);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Users could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.token, role, active, page]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      users.filter((record) =>
        `${record.name} ${record.email} ${record.department || ''} ${record.institution} ${record.role}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [users, search],
  );
  async function act(id: string, action: () => Promise<{ user: ManagedUser }>) {
    setBusy(id);
    setError('');
    setNotice('');
    try {
      const response = await action();
      setUsers((rows) => rows.map((row) => (row._id === id ? response.user : row)));
      setNotice('User record updated.');
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'User action was rejected by the administration API.',
      );
    } finally {
      setBusy('');
    }
  }
  function reasonFor(action: string) {
    return window.prompt(`${action} reason (leave blank only if the backend allows it):`) ?? null;
  }
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="faculty-page">
      <FacultyHeading
        title="User management"
        description={`${user?.role === 'dean' || user?.role === 'principal' ? 'Institution-scoped' : 'Administrative'} user records, paginated by the backend.`}
      />
      {notice && (
        <p className="faculty-success" role="status">
          {notice}
        </p>
      )}
      {error && <FacultyError message={error} retry={() => void load()} />}
      <section className="faculty-panel">
        <header className="faculty-panel-head">
          <div>
            <span className="eyebrow">DIRECTORY</span>
            <h2>
              Users <Badge variant="outline">{total} total</Badge>
            </h2>
          </div>
          <span className="admin-page-info">
            Page {page} of {pages}
          </span>
        </header>
        <div className="admin-user-filters">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search current page by name or email"
            aria-label="Search loaded users"
            leadingIcon={<Search size={15} />}
          />
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            aria-label="Filter users by role"
          >
            <option value="">All roles</option>
            {roles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by account status"
          >
            <option value="">All account states</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
        {loading ? (
          <FacultyLoading />
        ) : filtered.length ? (
          <div className="faculty-table-wrap">
            <table className="faculty-table admin-users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Institution / department</th>
                  <th>Account</th>
                  <th>Responsibilities</th>
                  <th>Management</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr key={record._id}>
                    <td>
                      <div className="admin-user-identity">
                        <Avatar name={record.name} src={record.avatar} size="xs" />
                        <div>
                          <strong>{record.name}</strong>
                          <small>{record.email}</small>
                          <small>
                            {record.role}
                            {record.graduationYear ? ` · Class of ${record.graduationYear}` : ''}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {record.institution}
                      <small>{record.department || 'Department not listed'}</small>
                    </td>
                    <td>
                      <div className="admin-badges">
                        <Badge variant={record.isActive ? 'success' : 'critical'}>
                          {record.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant={record.isVerified ? 'brand' : 'warning'}>
                          {record.isVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                        {record.disciplinaryStatus && (
                          <Badge
                            variant={
                              record.disciplinaryStatus === 'good_standing' ? 'neutral' : 'warning'
                            }
                          >
                            {record.disciplinaryStatus.replaceAll('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td>
                      {record.responsibilities?.length ? record.responsibilities.join(', ') : '—'}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={busy === record._id}
                          leadingIcon={<ShieldCheck size={13} />}
                          onClick={() =>
                            void act(record._id, () =>
                              setUserVerification(session!.token, record._id, !record.isVerified),
                            )
                          }
                        >
                          {record.isVerified ? 'Unverify' : 'Verify'}
                        </Button>
                        <Button
                          size="sm"
                          variant={record.isActive ? 'danger' : 'secondary'}
                          disabled={Boolean(busy)}
                          leadingIcon={
                            record.isActive ? (
                              <UserRoundX size={13} />
                            ) : (
                              <UserRoundCheck size={13} />
                            )
                          }
                          onClick={() => {
                            const reason = record.isActive ? reasonFor('Suspending user') : '';
                            if (reason !== null)
                              void act(record._id, () =>
                                setUserStatus(session!.token, record._id, !record.isActive, reason),
                              );
                          }}
                        >
                          {record.isActive ? 'Suspend' : 'Reactivate'}
                        </Button>
                        {isAdmin && (
                          <Select
                            aria-label={`Change role for ${record.name}`}
                            value={record.role}
                            disabled={Boolean(busy)}
                            onChange={(e) => {
                              const next = e.target.value;
                              const reason = reasonFor('Changing user role');
                              if (reason !== null)
                                void act(record._id, () =>
                                  setUserRole(session!.token, record._id, next, reason),
                                );
                            }}
                          >
                            {roles.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </Select>
                        )}
                        <Select
                          aria-label={`Set disciplinary status for ${record.name}`}
                          value={record.disciplinaryStatus || 'good_standing'}
                          disabled={Boolean(busy)}
                          onChange={(event) => {
                            const reason = reasonFor('Changing disciplinary status');
                            if (reason?.trim())
                              void act(record._id, () =>
                                setUserDisciplinaryStatus(
                                  session!.token,
                                  record._id,
                                  event.target.value,
                                  reason,
                                ),
                              );
                          }}
                        >
                          {['good_standing', 'warning', 'probation', 'suspended'].map((status) => (
                            <option key={status} value={status}>
                              {status.replaceAll('_', ' ')}
                            </option>
                          ))}
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={Boolean(busy)}
                          onClick={() => {
                            const value = window.prompt(
                              'Responsibilities (comma-separated backend values):',
                              record.responsibilities?.join(', ') || '',
                            );
                            if (value !== null) {
                              const responsibilities = value
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean);
                              const reason = reasonFor('Updating responsibilities');
                              if (reason !== null)
                                void act(record._id, () =>
                                  setUserResponsibilities(
                                    session!.token,
                                    record._id,
                                    responsibilities,
                                    reason,
                                  ),
                                );
                            }
                          }}
                        >
                          Responsibilities
                        </Button>
                      </div>
                      {!isAdmin && (
                        <small>
                          Role, profile, and status changes follow institution API permissions.
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <FacultyEmpty
            title="No matching users on this page"
            description="Try another role or account filter, or search the loaded page."
          />
        )}
        <footer className="admin-pagination">
          <span>
            Showing {total ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total}
          </span>
          <div>
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((v) => Math.max(1, v - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages || loading}
              onClick={() => setPage((v) => Math.min(pages, v + 1))}
            >
              Next
            </Button>
          </div>
        </footer>
      </section>
      <p className="faculty-data-note">
        <UserCog size={14} />
        Account creation and general profile editing are not exposed by the existing administrative
        API. Administrative controls shown here call only supported user management endpoints.
      </p>
    </div>
  );
}
