import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

const run = async () => {
  await connectDB();
  const app = createApp();
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
  await User.deleteOne({ email });
  server.close();
  await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
