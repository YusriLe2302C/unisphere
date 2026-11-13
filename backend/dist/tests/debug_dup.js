"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("../app.js");
const db_js_1 = require("../config/db.js");
const User_js_1 = require("../models/User.js");
const mongoose_1 = __importDefault(require("mongoose"));
const run = async () => {
    await (0, db_js_1.connectDB)();
    const app = (0, app_js_1.createApp)();
    const server = app.listen(5098);
    await new Promise(r => setTimeout(r, 400));
    const email = `dup_debug_${Date.now()}@test.com`;
    const body = JSON.stringify({ name: 'S', email, password: 'Password123!', institution: 'X' });
    const headers = { 'Content-Type': 'application/json' };
    const r1 = await fetch('http://localhost:5098/api/auth/register', { method: 'POST', headers, body });
    const d1 = await r1.json();
    console.log('First reg:', r1.status, d1.message);
    const r2 = await fetch('http://localhost:5098/api/auth/register', { method: 'POST', headers, body });
    const d2 = await r2.json();
    console.log('Dup reg:', r2.status, d2.message);
    // cleanup
    await User_js_1.User.deleteOne({ email });
    server.close();
    await mongoose_1.default.disconnect();
};
run().catch(e => { console.error(e); process.exit(1); });
