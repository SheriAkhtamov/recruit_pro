import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  superAdmin: any | null;
  isLoading: boolean;
  login: (login: string, password: string, workspaceId?: number) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [superAdmin, setSuperAdmin] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const { data: authData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error('Auth check failed');
      return await res.json();
    }
  });

  const { data: superAdminData, isLoading: isLoadingSuperAdmin } = useQuery({
    queryKey: ['/api/auth/super-admin/me'],
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/auth/super-admin/me', {
        credentials: 'include',
      });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error('Super admin auth check failed');
      return await res.json();
    }
  });

  useEffect(() => {
    if (authData && 'user' in authData) {
      setUser(authData.user);
      // Don't clear superAdmin when user is set (for view mode)
    }
  }, [authData]);

  useEffect(() => {
    if (superAdminData && 'superAdmin' in superAdminData) {
      setSuperAdmin(superAdminData.superAdmin);
      // Don't clear user when superAdmin is set (allows both to exist)
    }
  }, [superAdminData]);

  const loginMutation = useMutation({
    mutationFn: async ({ login, password, workspaceId }: { login: string; password: string; workspaceId?: number }) => {
      return await apiRequest('POST', '/api/auth/login', { login, password, workspaceId });
    },
    onSuccess: (data) => {
      if (data && 'user' in data) {
        setUser(data.user);
        setSuperAdmin(null);
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
    },
  });

  const login = async (login: string, password: string, workspaceId?: number) => {
    await loginMutation.mutateAsync({ login, password, workspaceId });
  };

  const logout = async () => {
    if (superAdmin) {
      await fetch('/api/auth/super-admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setSuperAdmin(null);
    } else {
      await logoutMutation.mutateAsync();
    }
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        superAdmin,
        isLoading: isLoadingUser || isLoadingSuperAdmin || loginMutation.isPending || logoutMutation.isPending,
        login,
        logout,
        isAuthenticated: !!user || !!superAdmin,
        isSuperAdmin: !!superAdmin,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
