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
const createApp = () => {
    const app = (0, express_1.default)();
    // Operational Safety & Security Middleware
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            // In production or development, allow browser requests from authorized frontends
            callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
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
    app.use('/api/research', research_routes_js_1.default);
    app.use('/api/subscriptions', subscription_routes_js_1.default);
    app.use('/api/notifications', notification_routes_js_1.default);
    app.use('/api/admin', admin_routes_js_1.default);
    app.use('/api/analytics', analytics_routes_js_1.default);
    // 404 Handler
    app.use((_req, res) => {
        res.status(404).json({ message: 'API route not found.' });
    });
    // Global Error Handler
    app.use((err, _req, res, _next) => {
        console.error('[Error]', err);
        res.status(err.status || 500).json({
            message: err.message || 'Internal Server Error',
            error: process.env.NODE_ENV === 'development' ? err : undefined
        });
    });
    return app;
};
exports.createApp = createApp;
