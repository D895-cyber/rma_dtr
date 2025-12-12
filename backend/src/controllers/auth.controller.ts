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

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
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
        email,
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.active) {
      return sendError(res, 'Account is inactive. Contact administrator.', 403);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
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



