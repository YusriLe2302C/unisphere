import { FilterQuery } from 'mongoose';

export interface ScopeOptions {
  institution?: string;
  department?: string;
  includePublic?: boolean;
}

export const buildInstitutionalQuery = <T>(
  baseQuery: FilterQuery<T> = {},
  options: ScopeOptions
): FilterQuery<T> => {
  const query = { ...baseQuery } as any;

  if (options.institution) {
    if (options.includePublic) {
      query.$or = [
        { institution: options.institution },
        { visibility: 'public' }
      ];
    } else {
      query.institution = options.institution;
    }
  }

  if (options.department) {
    query.department = options.department;
  }

  return query;
};

export const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

export const buildSearchQuery = (
  fields: string[],
  searchTerm?: string
): Record<string, any> => {
  if (!searchTerm || !searchTerm.trim()) {
    return {};
  }

  const escaped = escapeRegex(searchTerm.trim());
  const regex = new RegExp(escaped, 'i');

  return {
    $or: fields.map((field) => ({ [field]: regex }))
  };
};

