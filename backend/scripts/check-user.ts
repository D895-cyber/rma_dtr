// Script to check user status and reset password if needed
// Usage: npx ts-node backend/scripts/check-user.ts <email>

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.util';

const prisma = new PrismaClient();

async function checkUser(email: string) {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Try to find user
    const user = await prisma.user.findFirst({
      where: {
        email: {
          contains: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      console.log(`   Searched for: ${normalizedEmail}`);
      return;
    }

    console.log('\n✅ User Found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.active}`);
    console.log(`   Has Password Hash: ${user.passwordHash ? 'Yes' : 'No'}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Updated: ${user.updatedAt}`);

    if (!user.active) {
      console.log('\n⚠️  User account is INACTIVE');
      console.log('   User cannot login until account is activated.');
    }

    if (!user.passwordHash) {
      console.log('\n⚠️  User has NO PASSWORD HASH');
      console.log('   Password needs to be set.');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function resetPassword(email: string, newPassword: string) {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await prisma.user.findFirst({
      where: {
        email: {
          contains: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    console.log(`\n✅ Password reset successfully for: ${user.email}`);
    console.log(`   New password: ${newPassword}`);
    
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];
const email = args[1];
const password = args[2];

if (!command || !email) {
  console.log('Usage:');
  console.log('  Check user: npx ts-node backend/scripts/check-user.ts check <email>');
  console.log('  Reset password: npx ts-node backend/scripts/check-user.ts reset <email> <newPassword>');
  process.exit(1);
}

if (command === 'check') {
  checkUser(email);
} else if (command === 'reset') {
  if (!password) {
    console.log('❌ Password required for reset');
    console.log('Usage: npx ts-node backend/scripts/check-user.ts reset <email> <newPassword>');
    process.exit(1);
  }
  resetPassword(email, password);
} else {
  console.log('Unknown command. Use "check" or "reset"');
  process.exit(1);
}

