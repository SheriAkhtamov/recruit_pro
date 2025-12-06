import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showWorkspaceLogo?: boolean;
}

export default function Logo({ size = 'md', className = '', showWorkspaceLogo = true }: LogoProps) {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20'
  };

  // Fetch workspace info if user is authenticated
  const { data: workspace } = useQuery({
    queryKey: ['/api/workspace'],
    queryFn: async () => {
      const res = await fetch('/api/workspace', {
        credentials: 'include',
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated && showWorkspaceLogo && !!user,
  });

  // Show workspace logo if available
  if (workspace?.logoUrl && showWorkspaceLogo) {
    return (
      <div className={`${sizeClasses[size]} ${className} flex items-center`}>
        <img
          src={workspace.logoUrl}
          alt={workspace.name || t('companyLogoAlt')}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Default logo from PNG file
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <img
        src="/logo.png"
        alt={t('companyLogoAlt')}
        className="w-full h-full object-contain"
      />
    </div>
  );
}