import { useState, type FormEvent } from 'react';
import { Save, UserRound } from 'lucide-react';
import { Avatar, Button, Card, FileUpload, Input, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { useToast } from '../../app/providers/useToast';
import { ApiError, API_BASE_URL } from '../../services/api';
import { uploadFile } from '../../services/api/upload';
import { updateMyProfile } from '../../services/shared/shared-api';
import { updateMyAlumniProfile } from '../../services/career/career-api';
import './shared.css';

const split = (value: string) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
type Uploaded = { file: { _id: string } };

export function ProfilePage() {
  const { session, user, updateUser } = useAuth();
  const { notify } = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [headline, setHeadline] = useState(user?.headline ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [degree, setDegree] = useState(user?.degree ?? '');
  const [batch, setBatch] = useState(user?.batch ?? '');
  const [semester, setSemester] = useState(user?.semester?.toString() ?? '');
  const [section, setSection] = useState(user?.section ?? '');
  const [cgpa, setCgpa] = useState(user?.cgpa?.toString() ?? '');
  const [graduationYear, setGraduationYear] = useState(user?.graduationYear?.toString() ?? '');
  const [skills, setSkills] = useState(user?.skills?.join(', ') ?? '');
  const [interests, setInterests] = useState(user?.interests?.join(', ') ?? '');
  const [company, setCompany] = useState(user?.alumniProfile?.company ?? '');
  const [designation, setDesignation] = useState(user?.alumniProfile?.designation ?? '');
  const [industry, setIndustry] = useState(user?.alumniProfile?.industry ?? '');
  const [experience, setExperience] = useState(
    user?.alumniProfile?.yearsExperience?.toString() ?? '',
  );
  const [mentorInterests, setMentorInterests] = useState(
    user?.alumniProfile?.mentorshipInterests?.join(', ') ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!session?.token || !user) return;
    if (!name.trim()) {
      notify('Name is required.', 'error');
      return;
    }
    setBusy(true);
    try {
      const response = await updateMyProfile(session.token, {
        name: name.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        department: department.trim(),
        degree: (degree || undefined) as typeof user.degree,
        batch: batch.trim() || undefined,
        semester: semester ? Number(semester) : undefined,
        section: section.trim() || undefined,
        cgpa: cgpa ? Number(cgpa) : undefined,
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
        skills: split(skills),
        interests: split(interests),
      });
      updateUser(response.user);
      if (user.role === 'alumni') {
        const alumni = await updateMyAlumniProfile(session.token, {
          company: company.trim(),
          designation: designation.trim(),
          industry: industry.trim(),
          ...(experience ? { yearsExperience: Number(experience) } : {}),
          skills: split(skills),
          mentorshipInterests: split(mentorInterests),
        });
        updateUser({ alumniProfile: alumni.profile.alumniProfile, skills: alumni.profile.skills });
      }
      notify('Profile updated successfully.', 'success');
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Profile could not be updated.', 'error');
    } finally {
      setBusy(false);
    }
  }
  async function uploadAvatar(files: File[]) {
    const file = files[0];
    if (!file || !session?.token || !user) return;
    setFileError('');
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Choose an image smaller than 5 MB.');
      return;
    }
    try {
      const result = await uploadFile<Uploaded>(
        file,
        {
          associatedEntityType: 'profile_image',
          associatedEntityId: user._id,
          accessPolicy: 'public',
        },
        session.token,
      );
      const avatar = `${API_BASE_URL}/files/${encodeURIComponent(result.file._id)}`;
      const response = await updateMyProfile(session.token, { avatar });
      updateUser(response.user);
      notify('Profile photo updated.', 'success');
    } catch (e) {
      setFileError(e instanceof ApiError ? e.message : 'Profile photo could not be uploaded.');
    }
  }
  if (!user) return null;
  return (
    <div className="shared-page">
      <header className="shared-heading">
        <div>
          <span className="eyebrow">Account</span>
          <h1>My profile</h1>
          <p>Keep the information shown to your campus community up to date.</p>
        </div>
      </header>
      <Card className="shared-profile-summary">
        <Avatar src={user.avatar} name={user.name} size="xl" />
        <div>
          <h2>{user.name}</h2>
          <p>
            {user.headline || user.role.replaceAll('_', ' ')} · {user.institution}
          </p>
          <span>{user.email}</span>
        </div>
        <div className="shared-avatar-upload">
          <FileUpload
            label="Update profile photo"
            helperText="PNG, JPEG or WebP · maximum 5 MB"
            accept="image/png,image/jpeg,image/webp"
            onFilesSelected={(files) => void uploadAvatar(files)}
            onError={setFileError}
          />
          {fileError && (
            <p className="shared-error" role="alert">
              {fileError}
            </p>
          )}
        </div>
      </Card>
      <Card>
        <form className="shared-form" onSubmit={save}>
          <header className="shared-section-heading">
            <UserRound size={19} />
            <div>
              <h2>Personal information</h2>
              <p>
                Account email and role are managed by the institution and cannot be changed here.
              </p>
            </div>
          </header>
          <label>
            Full name
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </label>
          <label>
            Headline
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={160} />
          </label>
          <label>
            About
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={2000}
            />
          </label>
          <label>
            Department / branch
            <Input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              maxLength={120}
            />
          </label>
          <label>
            Degree
            <select
              className="us-select us-input-md"
              value={degree}
              onChange={(event) => setDegree(event.target.value)}
            >
              <option value="">Not specified</option>
              <option value="btech">B.Tech</option>
              <option value="mtech">M.Tech</option>
              <option value="bca">BCA</option>
              <option value="mca">MCA</option>
              <option value="bsc">B.Sc</option>
              <option value="msc">M.Sc</option>
              <option value="phd">Ph.D.</option>
              <option value="diploma">Diploma</option>
            </select>
          </label>
          <label>
            Batch
            <Input
              value={batch}
              onChange={(event) => setBatch(event.target.value)}
              maxLength={40}
            />
          </label>
          <label>
            Semester
            <Input
              type="number"
              min="1"
              max="12"
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
            />
          </label>
          <label>
            Section
            <Input
              value={section}
              onChange={(event) => setSection(event.target.value)}
              maxLength={20}
            />
          </label>
          <label>
            CGPA
            <Input
              type="number"
              min="0"
              max="10"
              step="0.01"
              value={cgpa}
              onChange={(event) => setCgpa(event.target.value)}
            />
          </label>
          <label>
            Graduation year
            <Input
              type="number"
              min="1950"
              max="2100"
              value={graduationYear}
              onChange={(event) => setGraduationYear(event.target.value)}
            />
          </label>
          <label>
            Skills
            <Input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Separate with commas"
            />
          </label>
          <label>
            Interests
            <Input
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Separate with commas"
            />
          </label>
          {user.role === 'alumni' && (
            <>
              <div className="shared-divider" />
              <h3>Professional details</h3>
              <p className="shared-muted">Saved through the existing alumni profile API.</p>
              <label>
                Current company
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={160}
                />
              </label>
              <label>
                Job title
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  maxLength={160}
                />
              </label>
              <label>
                Industry
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label>
                Years of experience
                <Input
                  type="number"
                  min="0"
                  max="80"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </label>
              <label>
                Mentorship interests
                <Input
                  value={mentorInterests}
                  onChange={(e) => setMentorInterests(e.target.value)}
                  placeholder="Separate with commas"
                />
              </label>
              <div className="shared-readonly-info">
                Academic information above is saved through the account profile endpoint. Career
                details are saved through the alumni profile endpoint.
              </div>
            </>
          )}
          <Button type="submit" loading={busy} leadingIcon={<Save size={16} />}>
            Save profile
          </Button>
        </form>
      </Card>
    </div>
  );
}
