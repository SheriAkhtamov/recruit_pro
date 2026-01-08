import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  getInitials, 
  formatUserRole, 
  canAccessReports,
  canAccessDocumentation,
  canAccessArchive,
  canAccessAnalytics,
  canAccessAdmin
} from '@/lib/auth';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Logo from '@/components/Logo';
import {
  BarChart3,
  Briefcase,
  Calendar,
  ChartBar,
  Settings,
  Users,
  Archive,
  FileText,
} from 'lucide-react';

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const navigation: Array<{
    name: string;
    href: string;
    icon: any;
    requiresDocAccess?: boolean;
    requiresArchiveAccess?: boolean;
    requiresAnalyticsAccess?: boolean;
    requiresAdminAccess?: boolean;
  }> = [
    { name: t('dashboard'), href: '/', icon: BarChart3 },
    { name: t('vacancies'), href: '/vacancies', icon: Briefcase },
    { name: t('candidates'), href: '/candidates', icon: Users },
    { name: t('documentation'), href: '/documentation', icon: FileText, requiresDocAccess: true },
    { name: t('calendar'), href: '/calendar', icon: Calendar },
    { name: t('archive'), href: '/archive', icon: Archive, requiresArchiveAccess: true },
    { name: t('analytics'), href: '/analytics', icon: ChartBar, requiresAnalyticsAccess: true },
    { name: t('administration'), href: '/admin', icon: Settings, requiresAdminAccess: true },
  ];

  if (!user) return null;

  // Fetch workspace info for logo
  const { data: workspace } = useQuery({
    queryKey: ['/api/workspace'],
    queryFn: async () => {
      const res = await fetch('/api/workspace', {
        credentials: 'include',
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const filteredNavigation = navigation.filter(item => {
    // Check specific access requirements
    if (item.requiresDocAccess && !canAccessDocumentation(user)) return false;
    if (item.requiresArchiveAccess && !canAccessArchive(user)) return false;
    if (item.requiresAnalyticsAccess && !canAccessAnalytics(user)) return false;
    if (item.requiresAdminAccess && !canAccessAdmin(user)) return false;
    return true;
  });

  return (
    <div className="w-64 bg-white shadow-sm border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-slate-200">
        <div className="flex items-center w-full">
          <Logo size="md" showWorkspaceLogo={true} />
          <div className="ml-3 flex flex-col flex-1 min-w-0">
            <span className="text-xl font-semibold text-slate-900 truncate">
              {workspace?.name || 'Cognix Hire'}
            </span>
            <span className="text-xs text-gray-500">Recruitment Platform</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <div className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer
                ${isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }
              `}>
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Language Switcher */}
      <div className="px-4 py-2 border-t border-slate-200">
        <LanguageSwitcher />
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-slate-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-slate-700">
              {getInitials(user.fullName)}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-slate-900">{user.fullName}</p>
            <p className="text-xs text-slate-500">{formatUserRole(user.role)}</p>
            {canAccessReports(user) && (
              <p className="text-[10px] text-emerald-600">{t('reportsAccess')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
