import bcrypt from 'bcrypt';
import { storage } from '../storage';
import type { SuperAdmin, InsertSuperAdmin } from '@shared/schema';

export class SuperAuthService {
  private saltRounds = 10;

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async authenticateSuperAdmin(username: string, password: string): Promise<SuperAdmin | null> {
    const superAdmin = await storage.getSuperAdminByUsername(username);

    if (!superAdmin) {
      return null;
    }

    if (!superAdmin.isActive) {
      return null;
    }

    const isValidPassword = await this.verifyPassword(password, superAdmin.password);

    if (!isValidPassword) {
      return null;
    }

    return superAdmin;
  }

  async createSuperAdmin(superAdminData: InsertSuperAdmin): Promise<SuperAdmin> {
    const hashedPassword = await this.hashPassword(superAdminData.password);
    const superAdminWithHashedPassword = {
      ...superAdminData,
      password: hashedPassword,
    };

    return await storage.createSuperAdmin(superAdminWithHashedPassword);
  }

  sanitizeSuperAdmin(superAdmin: SuperAdmin): Omit<SuperAdmin, 'password'> {
    const { password, ...sanitizedSuperAdmin } = superAdmin;
    return sanitizedSuperAdmin;
  }
}

export const superAuthService = new SuperAuthService();

