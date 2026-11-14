import type { IResearchPaper } from '../models/ResearchPaper.js';
import type { IUser } from '../models/User.js';

export function isInstitutionProctor(
  user: Pick<IUser, 'role' | 'institution' | 'responsibilities'> | null | undefined,
  paper: Pick<IResearchPaper, 'institution'>,
): boolean {
  return Boolean(
    user?.role === 'faculty' &&
      user.institution === paper.institution &&
      user.responsibilities?.includes('proctor'),
  );
}
