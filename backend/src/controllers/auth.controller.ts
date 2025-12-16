import { Request, Response } from 'express';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role = 'staff' } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return sendError(res, 'Name, email, and password are required', 400);
    }

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (existingUser) {
      return sendError(res, 'User with this email already exists', 400);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail, // Store email in lowercase
        passwordHash,
        role: role.toLowerCase(),
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return sendSuccess(res, { user, token }, 'User registered successfully', 201);
  } catch (error: any) {
    console.error('Register error:', error);
    return sendError(res, 'Registration failed', 500, error.message);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    // Normalize email to lowercase for case-insensitive lookup
    const normalizedEmail = email.toLowerCase().trim();

    // Find user - try exact match first, then case-insensitive
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If not found with exact match, try case-insensitive search
    if (!user) {
      const allUsers = await prisma.user.findMany({
        where: {
          email: {
            contains: normalizedEmail,
            mode: 'insensitive',
          },
        },
      });
      // Find exact match (case-insensitive)
      user = allUsers.find(u => u.email.toLowerCase() === normalizedEmail) || null;
    }

    if (!user) {
      console.error(`Login attempt failed: User not found for email: ${normalizedEmail}`);
      return sendError(res, 'Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.active) {
      console.error(`Login attempt failed: Account inactive for email: ${normalizedEmail}`);
      return sendError(res, 'Account is inactive. Contact administrator.', 403);
    }

    // Check if password hash exists
    if (!user.passwordHash) {
      console.error(`Login attempt failed: No password hash for user: ${user.id} (${normalizedEmail})`);
      return sendError(res, 'Account setup incomplete. Please contact administrator to reset password.', 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      console.error(`Login attempt failed: Invalid password for email: ${normalizedEmail}`);
      return sendError(res, 'Invalid email or password', 401);
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user without password
    const { passwordHash, ...userWithoutPassword } = user;

    console.log(`Login successful for user: ${user.email} (${user.role})`);
    return sendSuccess(res, { user: userWithoutPassword, token }, 'Login successful');
  } catch (error: any) {
    console.error('Login error:', error);
    return sendError(res, 'Login failed', 500, error.message);
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, user);
  } catch (error: any) {
    console.error('Get me error:', error);
    return sendError(res, 'Failed to fetch user', 500, error.message);
  }
}



