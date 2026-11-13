"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_js_1 = require("./app.js");
const db_js_1 = require("./config/db.js");
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    await (0, db_js_1.connectDB)();
    const app = (0, app_js_1.createApp)();
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
