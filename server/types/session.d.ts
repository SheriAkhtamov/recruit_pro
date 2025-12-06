import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      email: string;
      fullName: string;
      role: string;
      workspaceId: number;
      hasReportAccess?: boolean;
    };
    superAdmin?: {
      id: number;
      username: string;
      fullName: string;
      isActive: boolean;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      workspaceId?: number;
    }
  }
}
