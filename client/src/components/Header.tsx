import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageCircle, X, Settings } from 'lucide-react';
import { devLog } from '@/lib/debug';
import ChatModal from './modals/ChatModal';
import SettingsModal from './modals/SettingsModal';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({
  title = "Dashboard",
  subtitle
}: HeaderProps) {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const queryClient = useQueryClient();

  const isSuperAdminView = (user as any)?.isSuperAdminView;

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['/api/notifications'],
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  // Mutation for deleting notifications
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: number) =>
      apiRequest('DELETE', `/api/notifications/${notificationId}`),
    onSuccess: () => {
      // Refresh notifications list
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const handleDeleteNotification = (notificationId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent dropdown item click
    deleteNotificationMutation.mutate(notificationId);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
              {isSuperAdminView && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                  👁 {t('viewMode')}
                </Badge>
              )}
            </div>
            <p className="text-slate-600 mt-1">{subtitle || t('welcomeMessage')}</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    {t('noNotifications')}
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notification: any) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex justify-between items-start p-3 hover:bg-slate-50"
                    >
                      <div className="flex-1 pr-2">
                        <div className="font-medium text-slate-900">{notification.title}</div>
                        <div className="text-sm text-slate-500 mt-1">{notification.message}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-slate-200 rounded-full"
                        onClick={(e) => handleDeleteNotification(notification.id, e)}
                        disabled={deleteNotificationMutation.isPending}
                      >
                        <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                      </Button>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Messages Button - Hide in super admin view mode */}
            {!isSuperAdminView && (
              <Button onClick={() => setShowChat(true)} className="bg-primary-600 hover:bg-primary-700 btn-modern shadow-md hover:shadow-lg transition-all duration-300">
                <MessageCircle className="h-5 w-5 mr-2" />
                {t('messages')}
              </Button>
            )}

            {/* Exit view mode button for super admin */}
            {isSuperAdminView && (
              <Button
                onClick={async () => {
                  try {
                    await fetch('/api/super-admin/exit-view', {
                      method: 'POST',
                      credentials: 'include',
                    });
                    window.location.href = '/super-admin';
                  } catch (error) {
                    devLog('Failed to exit view mode:', error);
                  }
                }}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                ← {t('returnToPanel')}
              </Button>
            )}

            {/* User Menu - Hide in super admin view mode */}
            {!isSuperAdminView && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">U</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowSettings(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    {t('settings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <ChatModal
        open={showChat}
        onOpenChange={setShowChat}
      />

      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </>
  );
}
