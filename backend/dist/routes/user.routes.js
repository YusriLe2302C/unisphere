"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const UserController = __importStar(require("../controllers/user.controller.js"));
const router = (0, express_1.Router)();
// Search / discover users
router.get('/', UserController.searchUsers);
// Get profile by ID
router.get('/:id', UserController.getProfile);
// Update own profile
router.put('/profile/me', auth_js_1.authenticate, UserController.updateProfile);
// Projects
router.post('/projects', auth_js_1.authenticate, UserController.addProject);
router.delete('/projects/:projectId', auth_js_1.authenticate, UserController.removeProject);
// Achievements
router.post('/achievements', auth_js_1.authenticate, UserController.addAchievement);
// Follow / unfollow
router.post('/:id/follow', auth_js_1.authenticate, UserController.toggleFollow);
// Account status management (admin / dean / principal)
router.put('/:id/status', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), UserController.setAccountStatus);
exports.default = router;
