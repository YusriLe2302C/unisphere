import { useState, type FormEvent } from 'react';
import { Save, UserRound } from 'lucide-react';
import { Avatar, Button, Card, Input, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import { updateMyAlumniProfile } from '../../services/career/career-api';
import { CareerError, CareerHeading } from './career-components';
import './career.css';

const list = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function AlumniProfilePage() {
  const { session, user, updateUser } = useAuth();
  const profile = user?.alumniProfile;
  const [company, setCompany] = useState(profile?.company || '');
  const [designation, setDesignation] = useState(profile?.designation || '');
  const [industry, setIndustry] = useState(profile?.industry || '');
  const [yearsExperience, setYearsExperience] = useState(
    profile?.yearsExperience?.toString() || '',
  );
  const [skills, setSkills] = useState(user?.skills?.join(', ') || '');
  const [mentorshipInterests, setMentorshipInterests] = useState(
    profile?.mentorshipInterests?.join(', ') || '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await updateMyAlumniProfile(session.token, {
        company: company.trim(),
        designation: designation.trim(),
        industry: industry.trim(),
        ...(yearsExperience ? { yearsExperience: Number(yearsExperience) } : {}),
        skills: list(skills),
        mentorshipInterests: list(mentorshipInterests),
      });
      updateUser({
        skills: result.profile.skills,
        alumniProfile: result.profile.alumniProfile,
      });
      setSuccess('Your professional profile was updated.');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Your profile could not be updated.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="career-page alumni-profile-page">
      <CareerHeading
        title="Professional profile"
        description="Manage the alumni career details available to the RNS community."
      />
      <Card className="alumni-profile-preview">
        <Avatar name={user?.name || 'Alumni'} src={user?.avatar} size="lg" />
        <div>
          <span className="eyebrow">{user?.institution || 'Institution'}</span>
          <h2>{user?.name}</h2>
          <p>
            {user?.department || 'Department not listed'}
            {user?.graduationYear ? ` · Class of ${user.graduationYear}` : ''}
          </p>
          <small>
            {user?.headline || 'Your account headline is managed through the account profile.'}
          </small>
        </div>
      </Card>
      <Card className="career-ask-card alumni-profile-form-card">
        <header>
          <UserRound size={18} />
          <div>
            <h2>Career information</h2>
            <p>These fields are saved through the existing alumni profile endpoint.</p>
          </div>
        </header>
        <form onSubmit={submit} className="alumni-profile-form">
          <div className="alumni-profile-fields">
            <label>
              Current company
              <Input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                maxLength={160}
              />
            </label>
            <label>
              Job title
              <Input
                value={designation}
                onChange={(event) => setDesignation(event.target.value)}
                maxLength={160}
              />
            </label>
            <label>
              Industry
              <Input
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                maxLength={120}
              />
            </label>
            <label>
              Years of experience
              <Input
                type="number"
                min="0"
                max="80"
                value={yearsExperience}
                onChange={(event) => setYearsExperience(event.target.value)}
              />
            </label>
          </div>
          <label>
            Skills
            <Input
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              placeholder="Comma-separated skills"
            />
            <small>Separate skills with commas.</small>
          </label>
          <label>
            Mentorship interests
            <Textarea
              value={mentorshipInterests}
              onChange={(event) => setMentorshipInterests(event.target.value)}
              rows={3}
              placeholder="Comma-separated areas where you can mentor"
            />
            <small>Separate areas with commas.</small>
          </label>
          {error && <CareerError message={error} />}{' '}
          {success && (
            <p role="status" className="career-success">
              {success}
            </p>
          )}
          <Button type="submit" loading={busy} leadingIcon={<Save size={15} />}>
            Save professional profile
          </Button>
        </form>
      </Card>
      <p className="alumni-profile-limitation">
        Graduation year and department are displayed from your authenticated account. The alumni
        profile API does not expose editing for those fields.
      </p>
    </div>
  );
}
