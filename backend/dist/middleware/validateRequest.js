"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const errors_js_1 = require("../utils/errors.js");
const validateRequest = (rules, source = 'body') => {
    return (req, _res, next) => {
        const data = req[source] || {};
        const errors = [];
        for (const rule of rules) {
            const val = data[rule.field];
            if (rule.required && (val === undefined || val === null || val === '')) {
                errors.push({ field: rule.field, message: `${rule.field} is required` });
                continue;
            }
            if (val === undefined || val === null) {
                continue;
            }
            if (rule.type) {
                if (rule.type === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (typeof val !== 'string' || !emailRegex.test(val)) {
                        errors.push({ field: rule.field, message: `${rule.field} must be a valid email address` });
                    }
                }
                else if (rule.type === 'array') {
                    if (!Array.isArray(val)) {
                        errors.push({ field: rule.field, message: `${rule.field} must be an array` });
                    }
                }
                else if (typeof val !== rule.type) {
                    errors.push({ field: rule.field, message: `${rule.field} must be of type ${rule.type}` });
                }
            }
            if (rule.enum && !rule.enum.includes(val)) {
                errors.push({
                    field: rule.field,
                    message: `${rule.field} must be one of: ${rule.enum.join(', ')}`
                });
            }
            if (rule.min !== undefined) {
                if (typeof val === 'number' && val < rule.min) {
                    errors.push({ field: rule.field, message: `${rule.field} cannot be less than ${rule.min}` });
                }
                else if (typeof val === 'string' && val.length < rule.min) {
                    errors.push({ field: rule.field, message: `${rule.field} must be at least ${rule.min} characters` });
                }
            }
            if (rule.max !== undefined) {
                if (typeof val === 'number' && val > rule.max) {
                    errors.push({ field: rule.field, message: `${rule.field} cannot exceed ${rule.max}` });
                }
                else if (typeof val === 'string' && val.length > rule.max) {
                    errors.push({ field: rule.field, message: `${rule.field} cannot exceed ${rule.max} characters` });
                }
            }
            if (rule.custom) {
                const customRes = rule.custom(val, req);
                if (typeof customRes === 'string') {
                    errors.push({ field: rule.field, message: customRes });
                }
                else if (!customRes) {
                    errors.push({ field: rule.field, message: `${rule.field} failed validation` });
                }
            }
        }
        if (errors.length > 0) {
            throw new errors_js_1.ValidationError('Validation failed for incoming request data', errors);
        }
        next();
    };
};
exports.validateRequest = validateRequest;
