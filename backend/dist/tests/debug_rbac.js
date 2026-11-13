"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("../app.js");
const db_js_1 = require("../config/db.js");
const User_js_1 = require("../models/User.js");
const auth_service_js_1 = require("../services/auth.service.js");
const mongoose_1 = __importDefault(require("mongoose"));
const run = async () => {
    await (0, db_js_1.connectDB)();
    const app = (0, app_js_1.createApp)();
    const server = app.listen(5097);
    await new Promise(r => setTimeout(r, 400));
    const ts = Date.now();
    // Create faculty user
    const faculty = await User_js_1.User.create({
        name: 'Debug Faculty', email: `debug_fac_${ts}@rnsit.ac.in`,
        password: '$2a$12$placeholder', role: 'faculty', institution: 'RNSIT',
        institutionDomain: 'rnsit.ac.in', isVerified: true, tokenVersion: 0
    });
    const facToken = (0, auth_service_js_1.generateToken)(faculty._id.toString(), 0);
    // Create admin user
    const admin = await User_js_1.User.create({
        name: 'Debug Admin', email: `debug_adm_${ts}@rnsit.ac.in`,
        password: '$2a$12$placeholder', role: 'admin', institution: 'RNSIT',
        institutionDomain: 'rnsit.ac.in', isVerified: true, tokenVersion: 0
    });
    const admToken = (0, auth_service_js_1.generateToken)(admin._id.toString(), 0);
    const get = async (path, token) => {
        const headers = {};
        if (token)
            headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`http://localhost:5097/api${path}`, { headers });
        return { status: res.status, body: await res.json() };
    };
    const adminStats = await get('/admin/stats', admToken);
    console.log('Admin /admin/stats:', adminStats.status, '(expected 200)');
    const facStats = await get('/admin/stats', facToken);
    console.log('Faculty /admin/stats:', facStats.status, '(expected 403)', facStats.body.message);
    // cleanup
    await User_js_1.User.deleteMany({ email: { $in: [faculty.email, admin.email] } });
    server.close();
    await mongoose_1.default.disconnect();
};
run().catch(e => { console.error(e); process.exit(1); });
