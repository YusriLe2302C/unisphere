"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_js_1 = require("../utils/errors.js");
const e = new errors_js_1.ConflictError('test');
console.log('statusCode:', e.statusCode);
console.log('status:', e.status);
console.log('isOperational:', e.isOperational);
