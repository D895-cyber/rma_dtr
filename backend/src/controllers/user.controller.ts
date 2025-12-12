import { Request, Response } from 'express';
import { hashPassword } from '../utils/password.util';
import { sendSuccess, sendError } from '../utils/response.util';
import { prisma } from '../utils/prisma.util';

export async function getAllUsers(req: Request, res: Response) {
  try {
    const { role, active, search } = req.query;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (active !== undefined) {
      where.active = active === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map 'active' to 'isActive' for frontend compatibility
    const mappedUsers = users.map(user => ({
      ...user,
      isActive: user.active,
    }));

    return sendSuccess(res, { users: mappedUsers });
  } catch (error: any) {
    console.error('Get users error:', error);
    return sendError(res, 'Failed to fetch users', 500, error.message);
  }
}

export async function getUserById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
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

    // Map 'active' to 'isActive' for frontend compatibility
    const mappedUser = {
      ...user,
      isActive: user.active,
    };

    return sendSuccess(res, { user: mappedUser });
  } catch (error: any) {
    console.error('Get user error:', error);
    return sendError(res, 'Failed to fetch user', 500, error.message);
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    // Accept both 'active' and 'isActive' from frontend
    const { name, email, password, role, active, isActive } = req.body;
    const userActive = active !== undefined ? active : (isActive !== undefined ? isActive : true);

    if (!name || !email || !password || !role) {
      return sendError(res, 'Name, email, password, and role are required', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return sendError(res, 'User with this email already exists', 400);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role.toLowerCase(),
        active: userActive,
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

    // Map 'active' to 'isActive' for frontend compatibility
    const mappedUser = {
      ...user,
      isActive: user.active,
    };

    return sendSuccess(res, { user: mappedUser }, 'User created successfully', 201);
  } catch (error: any) {
    console.error('Create user error:', error);
    return sendError(res, 'Failed to create user', 500, error.message);
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    // Accept both 'active' and 'isActive' from frontend
    const { name, email, role, active, isActive, password } = req.body;

    const updateData: any = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role.toLowerCase();
    // Handle both active and isActive
    if (active !== undefined) updateData.active = active;
    else if (isActive !== undefined) updateData.active = isActive;
    if (password) updateData.passwordHash = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    // Map 'active' to 'isActive' for frontend compatibility
    const mappedUser = {
      ...user,
      isActive: user.active,
    };

    return sendSuccess(res, { user: mappedUser }, 'User updated successfully');
  } catch (error: any) {
    console.error('Update user error:', error);
    return sendError(res, 'Failed to update user', 500, error.message);
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'User deleted successfully');
  } catch (error: any) {
    console.error('Delete user error:', error);
    return sendError(res, 'Failed to delete user', 500, error.message);
  }
}

export async function getEngineers(req: Request, res: Response) {
  try {
    const engineers = await prisma.user.findMany({
      where: {
        role: 'engineer',
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
      orderBy: { name: 'asc' },
    });

    // Map 'active' to 'isActive' for frontend compatibility
    const mappedEngineers = engineers.map(engineer => ({
      ...engineer,
      isActive: engineer.active,
    }));

    return sendSuccess(res, { engineers: mappedEngineers });
  } catch (error: any) {
    console.error('Get engineers error:', error);
    return sendError(res, 'Failed to fetch engineers', 500, error.message);
  }
}

