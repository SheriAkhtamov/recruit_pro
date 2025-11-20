import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Building2, AlertCircle, CheckCircle2, Eye, EyeOff, Edit2, LogOut } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { devLog } from '@/lib/debug';

export default function SuperAdmin() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  // Fetch all workspaces
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['/api/super-admin/workspaces'],
    queryFn: async () => {
      const response = await fetch('/api/super-admin/workspaces', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch workspaces');
      return response.json();
    },
  });

  // Create workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: { name: string; logo?: File }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.logo) {
        formData.append('logo', data.logo);
      }

      const response = await fetch('/api/super-admin/workspaces', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create workspace');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/workspaces'] });
      setShowCreateDialog(false);
      setWorkspaceName('');
      setLogoFile(null);
      setLogoPreview('');
      setCreatedCredentials({
        email: data.adminCredentials.email,
        password: data.adminCredentials.password,
      });
      toast({
        title: 'Рабочая область создана',
        description: 'Рабочая область успешно создана. Сохраните учетные данные администратора!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать рабочую область',
        variant: 'destructive',
      });
    },
  });

  // Delete workspace mutation
  const deleteWorkspaceMutation = useMutation({
    mutationFn: async (workspaceId: number) => {
      const response = await fetch(`/api/super-admin/workspaces/${workspaceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete workspace');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/workspaces'] });
      toast({
        title: 'Рабочая область удалена',
        description: 'Рабочая область успешно удалена',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить рабочую область',
        variant: 'destructive',
      });
    },
  });

  // Fetch admin user for selected workspace
  const { data: adminUser, refetch: refetchAdminUser } = useQuery({
    queryKey: ['/api/super-admin/workspaces', selectedWorkspace?.id, 'admin'],
    queryFn: async () => {
      if (!selectedWorkspace) return null;
      const response = await fetch(`/api/super-admin/workspaces/${selectedWorkspace.id}/admin`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch admin user');
      return response.json();
    },
    enabled: !!selectedWorkspace,
  });

  // Update admin user mutation
  const updateAdminMutation = useMutation({
    mutationFn: async (data: { email: string; fullName: string; password?: string }) => {
      const response = await fetch(`/api/super-admin/workspaces/${selectedWorkspace.id}/admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update admin user');
      return response.json();
    },
    onSuccess: () => {
      refetchAdminUser();
      setShowEditDialog(false);
      setEditPassword('');
      toast({
        title: 'Данные обновлены',
        description: 'Данные администратора успешно обновлены',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить данные администратора',
        variant: 'destructive',
      });
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateWorkspace = () => {
    if (!workspaceName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название рабочей области',
        variant: 'destructive',
      });
      return;
    }

    createWorkspaceMutation.mutate({
      name: workspaceName.trim(),
      logo: logoFile || undefined,
    });
  };

  const handleDeleteWorkspace = (workspaceId: number, workspaceName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить рабочую область "${workspaceName}"? Все данные будут удалены!`)) {
      return;
    }

    deleteWorkspaceMutation.mutate(workspaceId);
  };

  const handleViewAdmin = (workspace: any) => {
    setSelectedWorkspace(workspace);
    setShowAdminDialog(true);
    setShowPassword(false);
  };

  const handleViewWorkspace = async (workspaceId: number) => {
    devLog('🔍 Entering workspace:', workspaceId);
    try {
      const response = await fetch(`/api/super-admin/view-workspace/${workspaceId}`, {
        method: 'POST',
        credentials: 'include',
      });

      devLog('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        devLog('❌ Response error:', errorData);
        throw new Error(errorData.error || 'Failed to enter workspace');
      }

      const data = await response.json();
      devLog('✅ Response data:', data);

      // Invalidate auth queries to refresh user session
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      toast({
        title: 'Вход выполнен',
        description: 'Вы вошли в рабочую область в режиме просмотра',
      });

      devLog('🔄 Redirecting to /');
      // Small delay to ensure session is saved
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error: any) {
      devLog('❌ Error in handleViewWorkspace:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось войти в рабочую область',
        variant: 'destructive',
      });
    }
  };

  const handleEditAdmin = () => {
    setEditEmail(adminUser?.email || '');
    setEditFullName(adminUser?.fullName || '');
    setEditPassword('');
    setShowEditDialog(true);
  };

  const handleUpdateAdmin = () => {
    if (!editEmail.trim() || !editFullName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    updateAdminMutation.mutate({
      email: editEmail.trim(),
      fullName: editFullName.trim(),
      password: editPassword.trim() || undefined,
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось выйти из системы',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Панель суперадминистратора</h1>
          <p className="text-slate-600 mt-1">Управление рабочими областями Cognix Hire</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать рабочую область
          </Button>
        </div>
      </div>

      {/* Credentials display after creation */}
      {createdCredentials && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Рабочая область создана!</strong>
            <div className="mt-2 space-y-1">
              <p><strong>Email администратора:</strong> {createdCredentials.email}</p>
              <p><strong>Пароль:</strong> {createdCredentials.password}</p>
              <p className="text-sm text-green-700 mt-2">
                ⚠️ Сохраните эти данные! Они больше не будут показаны.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setCreatedCredentials(null)}
            >
              Закрыть
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Workspaces grid */}
      {workspaces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет рабочих областей</h3>
            <p className="text-slate-600 mb-4">Создайте первую рабочую область для начала работы</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать рабочую область
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((workspace: any) => (
            <Card key={workspace.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {workspace.logoUrl ? (
                      <img
                        src={workspace.logoUrl}
                        alt={workspace.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{workspace.name}</CardTitle>
                      <CardDescription>
                        ID: {workspace.id}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteWorkspace(workspace.id, workspace.name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-600 mb-3">
                  <p>Создана: {new Date(workspace.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleViewWorkspace(workspace.id)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Войти
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAdmin(workspace)}
                    className="flex-1"
                  >
                    Админ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Workspace Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать рабочую область</DialogTitle>
            <DialogDescription>
              Создайте новую рабочую область для компании. Будет автоматически создан администратор.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workspace-name">Название компании *</Label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Например: ООО Компания"
              />
            </div>
            <div>
              <Label htmlFor="workspace-logo">Логотип компании (необязательно)</Label>
              <Input
                id="workspace-logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
              />
              {logoPreview && (
                <div className="mt-2">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreateWorkspace}
              disabled={!workspaceName.trim() || createWorkspaceMutation.isPending}
            >
              {createWorkspaceMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Admin Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Данные администратора - {selectedWorkspace?.name}</DialogTitle>
            <DialogDescription>
              Учетные данные администратора для входа в систему
            </DialogDescription>
          </DialogHeader>
          {adminUser ? (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-600">Ф.И.О.</Label>
                <p className="text-lg font-medium">{adminUser.fullName}</p>
              </div>
              <div>
                <Label className="text-slate-600">Email (логин)</Label>
                <p className="text-lg font-medium">{adminUser.email}</p>
              </div>
              <div>
                <Label className="text-slate-600">Пароль</Label>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-medium font-mono text-slate-500 italic">
                    (Скрыт в целях безопасности)
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Загрузка...</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminDialog(false)}>
              Закрыть
            </Button>
            <Button onClick={handleEditAdmin} disabled={!adminUser}>
              <Edit2 className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать данные администратора</DialogTitle>
            <DialogDescription>
              Изменение учетных данных для {selectedWorkspace?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-fullname">Ф.И.О. *</Label>
              <Input
                id="edit-fullname"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Иван Иванов"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email (логин) *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="admin@company.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">Новый пароль</Label>
              <Input
                id="edit-password"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Оставьте пустым, чтобы не менять"
              />
              <p className="text-xs text-slate-500 mt-1">
                Если не нужно менять пароль, оставьте поле пустым
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleUpdateAdmin}
              disabled={updateAdminMutation.isPending}
            >
              {updateAdminMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

