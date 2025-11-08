import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getPool } from '../db';
import { generateToken } from '../utils/jwt';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest, User, UserRole, AuthMethod } from '../types';

const router = Router();

/**
 * POST /auth/register
 * Register a new user with email/password or phone
 */
router.post('/register',
  [
    body('role').isIn(['client', 'runner']).withMessage('Role must be client or runner'),
    body('auth_method').isIn(['phone', 'email', 'nostr']).withMessage('Invalid auth method'),
    body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
    body('email').optional().isEmail().withMessage('Invalid email address'),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('nostr_pubkey').optional().isLength({ min: 64, max: 64 }).withMessage('Invalid Nostr public key'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { role, auth_method, phone, email, password, nostr_pubkey } = req.body as {
        role: UserRole;
        auth_method: AuthMethod;
        phone?: string;
        email?: string;
        password?: string;
        nostr_pubkey?: string;
      };

      // Validate auth method has required field
      if (auth_method === 'phone' && !phone) {
        res.status(400).json({ error: 'Phone number required for phone authentication' });
        return;
      }
      if (auth_method === 'email' && (!email || !password)) {
        res.status(400).json({ error: 'Email and password required for email authentication' });
        return;
      }
      if (auth_method === 'nostr' && !nostr_pubkey) {
        res.status(400).json({ error: 'Nostr public key required for Nostr authentication' });
        return;
      }

      // Validate password strength for email auth
      if (auth_method === 'email' && password) {
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
          res.status(400).json({ 
            error: 'Weak password', 
            details: passwordValidation.errors 
          });
          return;
        }
      }

      const pool = getPool();
      if (!pool) {
        res.status(500).json({ error: 'Database not configured' });
        return;
      }

      // Check if user already exists
      let existingUser;
      if (phone) {
        existingUser = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
      } else if (email) {
        existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      } else if (nostr_pubkey) {
        existingUser = await pool.query('SELECT id FROM users WHERE nostr_pubkey = $1', [nostr_pubkey]);
      }

      if (existingUser && existingUser.rows.length > 0) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      // Hash password if provided
      let hashedPassword: string | null = null;
      if (password) {
        hashedPassword = await hashPassword(password);
      }

      // Create user
      const result = await pool.query<User>(
        `INSERT INTO users (role, auth_method, phone, email, password_hash, nostr_pubkey, phone_verified, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, role, phone, email, nostr_pubkey, created_at`,
        [
          role,
          auth_method,
          phone || null,
          email || null,
          hashedPassword,
          nostr_pubkey || null,
          auth_method === 'phone' ? false : true, // Phone requires verification
          auth_method === 'email' ? false : true, // Email requires verification
        ]
      );

      const user = result.rows[0];

      if (!user) {
        res.status(500).json({ error: 'Failed to create user' });
        return;
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id as number,
        role: user.role,
      });

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          role: user.role,
          phone: user.phone,
          email: user.email,
          nostr_pubkey: user.nostr_pubkey,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed', message: (error as Error).message });
    }
  }
);

/**
 * POST /auth/login
 * Login with email/password or phone/code
 */
router.post('/login',
  [
    body('auth_method').isIn(['email', 'phone', 'nostr']).withMessage('Invalid auth method'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('password').optional().notEmpty().withMessage('Password required'),
    body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
    body('code').optional().isLength({ min: 6, max: 6 }).withMessage('Invalid verification code'),
    body('nostr_pubkey').optional().isLength({ min: 64, max: 64 }).withMessage('Invalid Nostr public key'),
    body('nostr_signature').optional().notEmpty().withMessage('Nostr signature required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { auth_method, email, password, phone, code, nostr_pubkey, nostr_signature } = req.body as {
        auth_method: AuthMethod;
        email?: string;
        password?: string;
        phone?: string;
        code?: string;
        nostr_pubkey?: string;
        nostr_signature?: string;
      };

      const pool = getPool();
      if (!pool) {
        res.status(500).json({ error: 'Database not configured' });
        return;
      }

      let user: any;

      // Email/Password login
      if (auth_method === 'email') {
        if (!email || !password) {
          res.status(400).json({ error: 'Email and password required' });
          return;
        }

        const result = await pool.query(
          'SELECT id, role, email, password_hash FROM users WHERE email = $1',
          [email]
        );

        if (result.rows.length === 0) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }

        user = result.rows[0];

        // Verify password
        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }
      }
      
      // Phone/Code login (simplified - in production use Twilio)
      else if (auth_method === 'phone') {
        if (!phone || !code) {
          res.status(400).json({ error: 'Phone and verification code required' });
          return;
        }

        // TODO: Verify code with Twilio or SMS provider
        // For now, accept any 6-digit code for development
        if (!/^\d{6}$/.test(code)) {
          res.status(401).json({ error: 'Invalid verification code' });
          return;
        }

        const result = await pool.query(
          'SELECT id, role, phone FROM users WHERE phone = $1',
          [phone]
        );

        if (result.rows.length === 0) {
          res.status(401).json({ error: 'User not found' });
          return;
        }

        user = result.rows[0];
      }
      
      // Nostr login
      else if (auth_method === 'nostr') {
        if (!nostr_pubkey || !nostr_signature) {
          res.status(400).json({ error: 'Nostr public key and signature required' });
          return;
        }

        // TODO: Verify Nostr signature
        // For now, accept any signature for development

        const result = await pool.query(
          'SELECT id, role, nostr_pubkey FROM users WHERE nostr_pubkey = $1',
          [nostr_pubkey]
        );

        if (result.rows.length === 0) {
          res.status(401).json({ error: 'User not found' });
          return;
        }

        user = result.rows[0];
      }

      if (!user) {
        res.status(401).json({ error: 'Authentication failed' });
        return;
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        role: user.role,
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          role: user.role,
          phone: user.phone,
          email: user.email,
          nostr_pubkey: user.nostr_pubkey,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed', message: (error as Error).message });
    }
  }
);

/**
 * GET /auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    if (!pool) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const result = await pool.query(
      `SELECT u.id, u.role, u.phone, u.email, u.nostr_pubkey, u.created_at,
              rp.id as runner_profile_id, rp.display_name, rp.bio, rp.lightning_address
       FROM users u
       LEFT JOIN runner_profiles rp ON u.id = rp.user_id
       WHERE u.id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user', message: (error as Error).message });
  }
});

/**
 * POST /auth/phone/start
 * Start phone verification (send SMS code)
 */
router.post('/phone/start',
  [body('phone').isMobilePhone('any').withMessage('Invalid phone number')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { phone } = req.body as { phone: string };

      // TODO: Integrate with Twilio to send SMS
      // For development, return success
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log(`[DEV] Verification code for ${phone}: ${code}`);

      res.json({
        message: 'Verification code sent',
        expires_in: 300, // 5 minutes
        // In production, don't return the code!
        dev_code: process.env.NODE_ENV === 'development' ? code : undefined,
      });
    } catch (error) {
      console.error('Phone verification error:', error);
      res.status(500).json({ error: 'Failed to send verification code' });
    }
  }
);

export default router;
