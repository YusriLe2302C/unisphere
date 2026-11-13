import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models/User.js';
import { authenticate, AuthRequest, getJwtSecret } from '../middleware/auth.js';

const router = Router();

const generateToken = (userId: string): string => {
  const secret = getJwtSecret();
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  return jwt.sign({ id: userId }, secret, { expiresIn });
};

// Register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, institution, department, graduationYear, headline, bio } = req.body;

    if (!name || !email || !password || !institution) {
      res.status(400).json({ message: 'Name, email, password, and institution are required.' });
      return;
    }

    // Role whitelisting: NEVER allow unprivileged users to register directly as admin
    const allowedRoles = ['student', 'faculty', 'alumni'];
    const chosenRole = (role || 'student').toLowerCase();
    if (!allowedRoles.includes(chosenRole)) {
      res.status(400).json({ message: 'Invalid role. Permitted registration roles are student, faculty, and alumni.' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ message: 'An account with this email already exists.' });
      return;
    }

    // Derive domain from email for academic credibility
    const emailDomain = email.includes('@') ? email.split('@')[1].toLowerCase() : '';
    // Institutional verification: Academic domains (.edu, .ac.in, etc.) or university domains auto-verify
    const isAcademic = emailDomain.endsWith('.edu') || emailDomain.endsWith('.ac.in') || emailDomain.includes('univ') || emailDomain.includes('college') || emailDomain.includes('rnsit');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: chosenRole,
      institution: institution.trim(),
      institutionDomain: emailDomain,
      isVerified: isAcademic, // Verified based on institutional domain
      department: department || 'General Studies',
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      headline: headline || `${chosenRole.toUpperCase()} at ${institution}`,
      bio: bio || '',
      skills: ['Research', 'Collaboration'],
      interests: ['Academic Networking', 'Innovation']
    });

    const token = generateToken(newUser._id.toString());
    const userJson = newUser.toObject();
    delete (userJson as any).password;

    res.status(201).json({
      message: isAcademic 
        ? 'Account created and institution verified successfully.'
        : 'Account created. Institutional verification pending administrative review.',
      token,
      user: userJson
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const token = generateToken(user._id.toString());
    const userJson = user.toObject();
    delete (userJson as any).password;

    res.json({
      message: 'Logged in successfully.',
      token,
      user: userJson
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

// Demo Login (Instant role switching for local testing & demos)
router.post('/demo-login', async (req: Request, res: Response): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ message: 'Demo login is strictly disabled in production environments.' });
      return;
    }

    const { role } = req.body; // 'student', 'alumni', 'faculty', 'admin'
    const targetRole = role || 'student';

    // Guard privileged admin switching: require explicit ENABLE_ADMIN_DEMO or dev key
    if (targetRole === 'admin' && process.env.ENABLE_ADMIN_DEMO !== 'true') {
      res.status(403).json({ message: 'Admin demo login requires administrator credentials or ENABLE_ADMIN_DEMO=true.' });
      return;
    }

    const user = await User.findOne({ role: targetRole });
    if (!user) {
      res.status(404).json({ message: `No demo account found for role: ${targetRole}. Please run seed script.` });
      return;
    }

    const token = generateToken(user._id.toString());
    const userJson = user.toObject();
    delete (userJson as any).password;

    res.json({
      message: `Signed in as Demo ${targetRole.toUpperCase()}`,
      token,
      user: userJson
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error during demo login.', error: error.message });
  }
});

// Current Authenticated User
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ user: req.user });
});

export default router;
