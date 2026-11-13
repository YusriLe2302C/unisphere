"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAudit = writeAudit;
exports.verifyAuditChain = verifyAuditChain;
const crypto_1 = require("crypto");
const mongoose_1 = require("mongoose");
const AuditLog_js_1 = require("../models/AuditLog.js");
const crypto_2 = require("crypto");
const canonical = (v) => JSON.stringify(v, (_k, val) => val instanceof mongoose_1.Types.ObjectId ? val.toString() : val instanceof Date ? val.toISOString() : val);
const digest = (data) => { const key = process.env.AUDIT_HMAC_SECRET || process.env.JWT_SECRET; if (!key || key.length < 32)
    throw new Error('AUDIT_HMAC_SECRET must be configured with at least 32 characters'); return (0, crypto_1.createHmac)('sha256', key).update(canonical(data)).digest('hex'); };
async function writeAudit(actor, action, entityType, entityId, before, after, reason, req) {
    const owner = (0, crypto_2.randomUUID)();
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        await AuditLog_js_1.AuditHead.updateOne({ _id: 'global' }, { $setOnInsert: { sequence: 0, hash: 'GENESIS' } }, { upsert: true });
        const head = await AuditLog_js_1.AuditHead.findOneAndUpdate({ _id: 'global', $or: [{ lockExpiresAt: { $lt: new Date() } }, { lockExpiresAt: { $exists: false } }] }, { $set: { lockOwner: owner, lockExpiresAt: new Date(Date.now() + 10000) } }, { new: true });
        if (!head) {
            await new Promise(resolve => setTimeout(resolve, 20));
            continue;
        }
        try {
            const latest = await AuditLog_js_1.AuditLog.findOne().sort({ sequence: -1 }).select('sequence hash');
            const sequence = (latest?.sequence || 0) + 1;
            const previousHash = latest?.hash || 'GENESIS';
            const timestamp = new Date();
            const data = { sequence, previousHash, actorId: actor._id.toString(), actorRole: actor.role, institution: actor.institution, collegeId: actor.collegeId, action, entityType, entityId: entityId.toString(), reason, timestamp: timestamp.toISOString(), before: before ?? null, after: after ?? null };
            const hash = digest(data);
            const row = await AuditLog_js_1.AuditLog.create({ ...data, timestamp, actorId: actor._id, entityId, previousStateSnapshot: before, newStateSnapshot: after, ipAddress: req?.ip, userAgent: req?.get?.('user-agent'), hash });
            await AuditLog_js_1.AuditHead.updateOne({ _id: 'global', lockOwner: owner }, { $set: { sequence, hash }, $unset: { lockOwner: 1, lockExpiresAt: 1 } });
            return row;
        }
        catch (e) {
            await AuditLog_js_1.AuditHead.updateOne({ _id: 'global', lockOwner: owner }, { $unset: { lockOwner: 1, lockExpiresAt: 1 } });
            throw e;
        }
    }
    throw new Error('Audit entry lock timed out');
}
async function verifyAuditChain() {
    const rows = await AuditLog_js_1.AuditLog.find().sort({ sequence: 1 }).lean();
    let prior = 'GENESIS';
    for (const row of rows) {
        const data = { sequence: row.sequence, previousHash: row.previousHash, actorId: row.actorId.toString(), actorRole: row.actorRole, institution: row.institution, collegeId: row.collegeId, action: row.action, entityType: row.entityType, entityId: row.entityId.toString(), reason: row.reason, timestamp: row.timestamp.toISOString(), before: row.previousStateSnapshot ?? null, after: row.newStateSnapshot ?? null };
        const expected = digest(data);
        if (row.previousHash !== prior || row.hash !== expected)
            return { valid: false, sequence: row.sequence };
        prior = row.hash;
    }
    return { valid: true, entries: rows.length, head: prior };
}
