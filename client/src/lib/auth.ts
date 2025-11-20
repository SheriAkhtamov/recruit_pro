import type { User } from '@shared/schema';

export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

export function formatUserRole(role: string): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'hr_manager':
      return 'HR Manager';
    case 'employee':
      return 'Employee';
    default:
      return role;
  }
}

export function canAccessReports(user: User): boolean {
  return user.role === 'admin' || Boolean(user.hasReportAccess);
}

export function canManageUsers(user: User): boolean {
  return user.role === 'admin';
}

export function canManageVacancies(user: User): boolean {
  return user.role === 'admin' || user.role === 'hr_manager';
}

export function canManageAnyInterview(user: User): boolean {
  return user.role === 'admin';
}

export function canApproveInterview(user: User, interviewerId: number): boolean {
  return user.role === 'admin' || user.id === interviewerId;
}

// New permission functions for employees
export function canAccessDocumentation(user: User): boolean {
  return user.role === 'admin' || user.role === 'hr_manager';
}

export function canAccessArchive(user: User): boolean {
  return user.role === 'admin' || user.role === 'hr_manager';
}

export function canAccessAnalytics(user: User): boolean {
  return user.role === 'admin' || user.role === 'hr_manager' || Boolean(user.hasReportAccess);
}

export function canAccessAdmin(user: User): boolean {
  return user.role === 'admin';
}

export function isEmployee(user: User): boolean {
  return user.role === 'employee';
}
