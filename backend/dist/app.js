"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_js_1 = require("./swagger.js");
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const user_routes_js_1 = __importDefault(require("./routes/user.routes.js"));
const post_routes_js_1 = __importDefault(require("./routes/post.routes.js"));
const community_routes_js_1 = __importDefault(require("./routes/community.routes.js"));
const opportunity_routes_js_1 = __importDefault(require("./routes/opportunity.routes.js"));
const notification_routes_js_1 = __importDefault(require("./routes/notification.routes.js"));
const admin_routes_js_1 = __importDefault(require("./routes/admin.routes.js"));
const application_routes_js_1 = __importDefault(require("./routes/application.routes.js"));
const research_routes_js_1 = __importDefault(require("./routes/research.routes.js"));
const subscription_routes_js_1 = __importDefault(require("./routes/subscription.routes.js"));
const analytics_routes_js_1 = __importDefault(require("./routes/analytics.routes.js"));
const announcement_routes_js_1 = __importDefault(require("./routes/announcement.routes.js"));
const events_routes_js_1 = __importDefault(require("./routes/events.routes.js"));
const research_workflow_routes_js_1 = __importDefault(require("./routes/research-workflow.routes.js"));
const career_routes_js_1 = __importDefault(require("./routes/career.routes.js"));
const timetable_routes_js_1 = __importDefault(require("./routes/timetable.routes.js"));
const files_routes_js_1 = __importDefault(require("./routes/files.routes.js"));
const messages_routes_js_1 = __importDefault(require("./routes/messages.routes.js"));
const env_js_1 = require("./config/env.js");
const createApp = () => {
    const app = (0, express_1.default)();
    const origin = env_js_1.envConfig.CORS_ORIGIN;
    // Operational Safety & Security Middleware
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            const configured = env_js_1.envConfig.CORS_ORIGIN.split(',').map(x => x.trim()).filter(Boolean);
            if (!origin || configured.includes(origin))
                return callback(null, true);
            return callback(new Error('Origin is not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
    }));
    // Payload size restrictions (prevents Denial of Service via massive body ingestion)
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Swagger Documentation
    app.get('/api/docs.json', (_req, res) => {
        res.json(swagger_js_1.swaggerDocument);
    });
    app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_js_1.swaggerDocument));
    // Health check
    app.get('/api/health', (_req, res) => {
        res.json({
            status: 'healthy',
            app: 'UniGlobe Academic & Professional Platform',
            version: '1.0.0',
            timestamp: new Date().toISOString()
        });
    });
    // Mount API modules
    app.use('/api/auth', auth_routes_js_1.default);
    app.use('/api/users', user_routes_js_1.default);
    app.use('/api/posts', post_routes_js_1.default);
    app.use('/api/communities', community_routes_js_1.default);
    app.use('/api/opportunities', opportunity_routes_js_1.default);
    app.use('/api/applications', application_routes_js_1.default);
    app.use('/api/research', research_workflow_routes_js_1.default);
    app.use('/api/research', research_routes_js_1.default);
    app.use('/api/subscriptions', subscription_routes_js_1.default);
    app.use('/api/notifications', notification_routes_js_1.default);
    app.use('/api/admin', admin_routes_js_1.default);
    app.use('/api/analytics', analytics_routes_js_1.default);
    app.use('/api/announcements', announcement_routes_js_1.default);
    app.use('/api/events', events_routes_js_1.default);
    app.use('/api/career', career_routes_js_1.default);
    app.use('/api/timetable', timetable_routes_js_1.default);
    app.use('/api/files', files_routes_js_1.default);
    app.use('/api/messages', messages_routes_js_1.default);
    // 404 Handler
    app.use((_req, res) => {
        res.status(404).json({ message: 'API route not found.' });
    });
    // Global Error Handler — handles AppError subclasses and unexpected errors
    app.use((err, _req, res, _next) => {
        const status = err.statusCode || err.status || 500;
        const message = err.isOperational ? err.message : 'Internal Server Error';
        if (!err.isOperational)
            console.error('[Unexpected Error]', err);
        res.status(status).json({
            message,
            ...(err.errors && { errors: err.errors }),
            ...(process.env.NODE_ENV === 'development' && !err.isOperational && { stack: err.stack })
        });
    });
    return app;
};
exports.createApp = createApp;
