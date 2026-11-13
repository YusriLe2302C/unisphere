import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(` UniGlobe Backend running on http://localhost:${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(` Swagger UI: http://localhost:${PORT}/api/docs`);
    console.log(`=================================================`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
