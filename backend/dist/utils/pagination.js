"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPaginationResult = exports.getPaginationParams = void 0;
const getPaginationParams = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    let sort = { createdAt: -1 };
    if (query.sortBy) {
        const order = query.sortOrder === 'asc' ? 1 : -1;
        sort = { [query.sortBy]: order };
    }
    return { page, limit, skip, sort };
};
exports.getPaginationParams = getPaginationParams;
const formatPaginationResult = (data, total, page, limit) => {
    const totalPages = Math.ceil(total / limit) || 1;
    return {
        data,
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};
exports.formatPaginationResult = formatPaginationResult;
