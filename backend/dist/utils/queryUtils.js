"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSearchQuery = exports.escapeRegex = exports.buildInstitutionalQuery = void 0;
const buildInstitutionalQuery = (baseQuery = {}, options) => {
    const query = { ...baseQuery };
    if (options.institution) {
        if (options.includePublic) {
            query.$or = [
                { institution: options.institution },
                { visibility: 'public' }
            ];
        }
        else {
            query.institution = options.institution;
        }
    }
    if (options.department) {
        query.department = options.department;
    }
    return query;
};
exports.buildInstitutionalQuery = buildInstitutionalQuery;
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};
exports.escapeRegex = escapeRegex;
const buildSearchQuery = (fields, searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) {
        return {};
    }
    const escaped = (0, exports.escapeRegex)(searchTerm.trim());
    const regex = new RegExp(escaped, 'i');
    return {
        $or: fields.map((field) => ({ [field]: regex }))
    };
};
exports.buildSearchQuery = buildSearchQuery;
