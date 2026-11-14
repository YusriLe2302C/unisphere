import { useEffect, useState } from 'react';
import { Bell, Eye, LockKeyhole, Save, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, ErrorState, Switch } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { useToast } from '../../app/providers/useToast';
import { ApiError } from '../../services/api';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../../services/notifications/notification-api';
import { updateMyProfile } from '../../services/shared/shared-api';
import './shared.css';

const prefLabels: Array<[keyof NotificationPreferences, string]> = [
  ['inAppAlerts', 'In-app notifications'],
  ['opportunityAlerts', 'Career and placement opportunities'],
  ['eventAlerts', 'Events and registrations'],
  ['researchAlerts', 'Research activity'],
  ['communityAlerts', 'Community activity'],
  ['messagingAlerts', 'Messaging'],
];
const privacyLabels = [
  ['showEmail', 'Show email address'],
  ['showPhone', 'Show phone number'],
  ['showAcademicDetails', 'Show academic details'],
  ['allowDirectMessages', 'Allow direct messages'],
] as const;
const prefDefaults: NotificationPreferences = {
  inAppAlerts: true,
  opportunityAlerts: true,
  eventAlerts: true,
  researchAlerts: true,
  communityAlerts: true,
  messagingAlerts: true,
};
const privacyDefaults = {
  showEmail: false,
  showPhone: false,
  showAcademicDetails: true,
  allowDirectMessages: true,
};

export function SettingsPage() {
  const { session, user, updateUser } = useAuth();
  const privacySettings = user?.privacySettings;
  const { notify } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(prefDefaults);
  const [privacy, setPrivacy] = useState({ ...privacyDefaults });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!session?.token || !user?._id) return;
    let active = true;
    Promise.all([getNotificationPreferences(session.token), Promise.resolve(privacySettings)])
      .then(([p, privacySettings]) => {
        if (!active) return;
        setPreferences({ ...prefDefaults, ...p.preferences });
        setPrivacy({ ...privacyDefaults, ...privacySettings });
      })
      .catch((e) => {
        if (active) setError(e instanceof ApiError ? e.message : 'Settings could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.token, user?._id, privacySettings]);
  async function save() {
    if (!session?.token || !user) return;
    setSaving(true);
    setError('');
    try {
      const [p, profile] = await Promise.all([
        updateNotificationPreferences(session.token, preferences),
        updateMyProfile(session.token, { privacySettings: privacy }),
      ]);
      updateUser({ ...profile.user, notificationPreferences: p.preferences });
      notify('Settings saved.', 'success');
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Settings could not be saved.';
      setError(message);
      notify(message, 'error');
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <div className="shared-page">
        <div className="shared-heading">
          <div>
            <span className="eyebrow">Account</span>
            <h1>Settings</h1>
          </div>
        </div>
        <Card>
          <p>Loading your saved preferences…</p>
        </Card>
      </div>
    );
  return (
    <div className="shared-page">
      <header className="shared-heading">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Settings</h1>
          <p>Manage supported notification and profile privacy preferences.</p>
        </div>
        <Button loading={saving} leadingIcon={<Save size={16} />} onClick={() => void save()}>
          Save settings
        </Button>
      </header>
      {error && <ErrorState title="Settings update failed" description={error} />}
      <div className="shared-settings-grid">
        <Card className="shared-settings-card">
          <header>
            <Bell />
            <div>
              <h2>Notifications</h2>
              <p>Choose which notification categories are enabled for your account.</p>
            </div>
          </header>
          {prefLabels.map(([key, label]) => (
            <Switch
              key={key}
              checked={preferences[key]}
              onChange={(value) => setPreferences((current) => ({ ...current, [key]: value }))}
              label={label}
            />
          ))}
        </Card>
        <Card className="shared-settings-card">
          <header>
            <Eye />
            <div>
              <h2>Privacy</h2>
              <p>
                These options are stored with your profile and used by supported community features.
              </p>
            </div>
          </header>
          {privacyLabels.map(([key, label]) => (
            <Switch
              key={key}
              checked={privacy[key]}
              onChange={(value) => setPrivacy((current) => ({ ...current, [key]: value }))}
              label={label}
            />
          ))}
        </Card>
        <Card className="shared-settings-card">
          <header>
            <LockKeyhole />
            <div>
              <h2>Password and account</h2>
              <p>
                Account email, role, and password are not editable through an authenticated settings
                endpoint.
              </p>
            </div>
          </header>
          <Link className="shared-inline-link" to="/forgot-password">
            Use password recovery
          </Link>
          <p className="shared-muted">Password recovery uses the existing email reset flow.</p>
        </Card>
        <Card className="shared-settings-card">
          <header>
            <SlidersHorizontal />
            <div>
              <h2>Display preferences</h2>
              <p>
                No display preference endpoint is available, so these options are not persisted
                here.
              </p>
            </div>
          </header>
          <p className="shared-muted">
            The portal currently follows your device’s responsive layout.
          </p>
        </Card>
      </div>
    </div>
  );
}
