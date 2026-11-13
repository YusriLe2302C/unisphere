"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstitutionScope = exports.platformConfig = void 0;
exports.platformConfig = {
    mode: process.env.PLATFORM_MODE || 'cross-college',
    primaryInstitution: process.env.PRIMARY_INSTITUTION || 'RNS Institute of Technology'
};
/**
 * Generates an institutional query filter based on the platform mode and user context.
 * In single-college mode, limits data to the primary institution.
 * In cross-college mode, enables cross-institutional discovery while respecting private visibility.
 */
const getInstitutionScope = (userInstitution) => {
    if (exports.platformConfig.mode === 'single-college') {
        return { institution: exports.platformConfig.primaryInstitution };
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
exports.getInstitutionScope = getInstitutionScope;
