import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { generateToken } from '../services/auth.service.js';
import mongoose from 'mongoose';

const run = async () => {
  await connectDB();
  const app = createApp();
  const server = app.listen(5097);
  await new Promise(r => setTimeout(r, 400));

  const ts = Date.now();

  // Create faculty user
  const faculty = await User.create({
    name: 'Debug Faculty', email: `debug_fac_${ts}@rnsit.ac.in`,
    password: '$2a$12$placeholder', role: 'faculty', institution: 'RNSIT',
    institutionDomain: 'rnsit.ac.in', isVerified: true, tokenVersion: 0
  });
  const facToken = generateToken(faculty._id.toString(), 0);

  // Create admin user
  const admin = await User.create({
    name: 'Debug Admin', email: `debug_adm_${ts}@rnsit.ac.in`,
    password: '$2a$12$placeholder', role: 'admin', institution: 'RNSIT',
    institutionDomain: 'rnsit.ac.in', isVerified: true, tokenVersion: 0
  });
  const admToken = generateToken(admin._id.toString(), 0);

  const get = async (path: string, token?: string) => {
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`http://localhost:5097/api${path}`, { headers });
    return { status: res.status, body: await res.json() };
  };

  const adminStats = await get('/admin/stats', admToken);
  console.log('Admin /admin/stats:', adminStats.status, '(expected 200)');

  const facStats = await get('/admin/stats', facToken);
  console.log('Faculty /admin/stats:', facStats.status, '(expected 403)', facStats.body.message);

  // cleanup
  await User.deleteMany({ email: { $in: [faculty.email, admin.email] } });
  server.close();
  await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
