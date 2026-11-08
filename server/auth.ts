import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET ?? '';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? '';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? '';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured and at least 32 characters long.');
}

if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD_HASH must be configured.');
}

const TOKEN_EXPIRY = '30d';

interface AdminTokenPayload {
  username: string;
}

export async function adminLogin(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { username, password } = req.body || {};

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password
    ) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const usernameMatches = username.trim() === ADMIN_USERNAME;
    const passwordMatches = await bcrypt.compare(
      password,
      ADMIN_PASSWORD_HASH
    );

    if (!usernameMatches || !passwordMatches) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const token = jwt.sign(
      { username: ADMIN_USERNAME } satisfies AdminTokenPayload,
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({
      success: true,
      token,
      expiresIn: TOKEN_EXPIRY,
      username: ADMIN_USERNAME,
    });
  } catch (error) {
    console.error('Admin login failed:', error);
    res.status(500).json({ error: 'Unable to log in. Please try again.' });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Please log in to continue.' });
    return;
  }

  const token = authorization.slice(7).trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET!) as AdminTokenPayload;

    if (payload.username !== ADMIN_USERNAME) {
      res.status(401).json({ error: 'Invalid admin session.' });
      return;
    }

    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}
