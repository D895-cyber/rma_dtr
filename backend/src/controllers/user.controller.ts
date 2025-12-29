import { Request, Response } from 'express';
import { hashPassword } from '../utils/password.util';
import { sendSuccess, sendError } from '../utils/response.util';
import { prisma } from '../utils/prisma.util';
import { AuthRequest } from '../middleware/auth.middleware';

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

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user (case-insensitive)
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

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail, // Store email in lowercase
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

export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Prevent users from deleting themselves
    if (req.user && req.user.userId === id) {
      return sendError(res, 'You cannot delete your own account', 400);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        createdDtrCases: { take: 1 },
        assignedDtrCases: { take: 1 },
        createdRmaCases: { take: 1 },
        assignedRmaCases: { take: 1 },
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Check if user has related records
    const hasRelatedRecords = 
      user.createdDtrCases.length > 0 ||
      user.assignedDtrCases.length > 0 ||
      user.createdRmaCases.length > 0 ||
      user.assignedRmaCases.length > 0;

    if (hasRelatedRecords) {
      // Instead of preventing deletion, we'll deactivate the user
      // This preserves data integrity while "removing" the user
      await prisma.user.update({
        where: { id },
        data: { active: false },
      });

      return sendSuccess(res, null, 'User deactivated successfully (has related records)');
    }

    // Safe to delete - no related records
    await prisma.user.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'User deleted successfully');
  } catch (error: any) {
    console.error('Delete user error:', error);
    
    // Handle foreign key constraint errors
    if (error.code === 'P2003' || error.message?.includes('Foreign key constraint')) {
      // If deletion fails due to constraints, deactivate instead
      try {
        await prisma.user.update({
          where: { id: req.params.id },
          data: { active: false },
        });
        return sendSuccess(res, null, 'User deactivated successfully (has related records)');
      } catch (updateError: any) {
        return sendError(res, 'Failed to delete user. User may have related records.', 400, updateError.message);
      }
    }
    
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

export async function resetUserPassword(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return sendError(res, 'Password must be at least 8 characters long', 400);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update the user's password
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return sendSuccess(res, null, `Password reset successfully for ${user.name}`);
  } catch (error: any) {
    console.error('Reset password error:', error);
    return sendError(res, 'Failed to reset password', 500, error.message);
  }
}

