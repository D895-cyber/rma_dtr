import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, SALT_ROUNDS, (err, h) => {
      if (err) reject(err);
      else resolve(h);
    });
  });
}

export async function comparePassword(password: string, hashStr: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hashStr, (err, same) => {
      if (err) reject(err);
      else resolve(same);
    });
  });
}
