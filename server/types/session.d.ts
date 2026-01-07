import 'express-session';
import type { SuperAdmin, User } from '@shared/schema';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    workspaceId?: number;
    superAdminId?: number;
    isSuperAdminView?: boolean;
  }
}

declare global {
  namespace Express {
    interface Request {
      workspaceId?: number;
      user?: User;
      superAdmin?: SuperAdmin;
    }
  }
}
