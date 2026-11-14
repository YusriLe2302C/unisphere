import { ConflictError } from '../utils/errors.js';

const e = new ConflictError('test');
console.log('statusCode:', e.statusCode);
console.log('status:', (e as any).status);
console.log('isOperational:', e.isOperational);
