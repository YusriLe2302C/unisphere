"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
const local_storage_js_1 = require("./local.storage.js");
// S3 and Cloudinary adapters implement StorageAdapter; deployments select them here.
exports.storage = new local_storage_js_1.LocalStorageAdapter();
