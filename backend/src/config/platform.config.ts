export interface PlatformConfig {
  mode: 'cross-college' | 'single-college';
  primaryInstitution: string;
}

export const platformConfig: PlatformConfig = {
  mode: (process.env.PLATFORM_MODE as 'cross-college' | 'single-college') || 'cross-college',
  primaryInstitution: process.env.PRIMARY_INSTITUTION || 'RNS Institute of Technology'
};

/**
 * Generates an institutional query filter based on the platform mode and user context.
 * In single-college mode, limits data to the primary institution.
 * In cross-college mode, enables cross-institutional discovery while respecting private visibility.
 */
export const getInstitutionScope = (userInstitution?: string) => {
  if (platformConfig.mode === 'single-college') {
    return { institution: platformConfig.primaryInstitution };
  }

  // Cross-college mode with visibility scoping
  if (userInstitution) {
    return {
      $or: [
        { visibility: { $ne: 'institution-only' } },
        { institution: userInstitution }
      ]
    };
  }

  // Public/unauthenticated requests only see public content
  return {
    visibility: { $ne: 'institution-only' }
  };
};
