import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { devLog } from '@/lib/debug';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { canManageVacancies } from '@/lib/auth';
import type { Vacancy, Candidate, Department, InsertVacancy } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Filter,
  Briefcase,
  MapPin,
  Users,
  Calendar,
  Edit,
  Building,
  Trash2
} from 'lucide-react';

export default function Vacancies() {
  const { t } = useTranslation();

  const vacancySchema = z.object({
    title: z.string().min(1, t('jobTitleRequired')),
    department: z.string().min(1, t('departmentRequired')),
    location: z.string().optional().or(z.literal('')),
    description: z.string().optional().or(z.literal('')),
    requirements: z.string().optional().or(z.literal('')),
    status: z.enum(['active', 'in_progress', 'closed']).default('active'),
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingVacancy, setViewingVacancy] = useState<any>(null);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentDesc, setNewDepartmentDesc] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string | null>(null);


  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof vacancySchema>>({
    resolver: zodResolver(vacancySchema),
    defaultValues: {
      title: '',
      department: '',
      location: '',
      description: '',
      requirements: '',
      status: 'active',
    },
  });

  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ['/api/vacancies'],
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ['/api/candidates'],
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['/api/departments'],
  });

  const createVacancyMutation = useMutation({
    mutationFn: async (data: Omit<InsertVacancy, 'workspaceId'>) => {
      return await apiRequest('POST', '/api/vacancies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vacancies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/funnel'] });
      toast({
        title: t('success'),
        description: t('vacancyCreatedSuccessfully'),
      });
      form.reset({
        title: '',
        department: '',
        location: '',
        description: '',
        requirements: '',
        status: 'active',
      });
      setShowCreateModal(false);
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: t('failedToCreateVacancy'),
        variant: 'destructive',
      });
    },
  });

  const updateVacancyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof vacancySchema> }) => {
      return await apiRequest('PUT', `/api/vacancies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vacancies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/funnel'] });
      toast({
        title: t('success'),
        description: t('vacancyUpdatedSuccessfully'),
      });
      form.reset();
      setShowCreateModal(false);
      setSelectedVacancy(null);
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToUpdateVacancy'),
        variant: 'destructive',
      });
    },
  });



  const createDepartmentMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await apiRequest('POST', '/api/departments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      toast({
        title: t('success'),
        description: t('departmentCreatedSuccessfully'),
      });
      setNewDepartmentName('');
      setNewDepartmentDesc('');
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToCreateDepartment'),
        variant: 'destructive',
      });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      toast({
        title: t('success'),
        description: t('departmentDeletedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('failedToDeleteDepartment'),
        variant: 'destructive',
      });
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; description?: string } }) => {
      return await apiRequest('PUT', `/api/departments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      toast({
        title: t('success'),
        description: t('departmentUpdatedSuccessfully'),
      });
      setEditingDepartment(null);
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToUpdateDepartment'),
        variant: 'destructive',
      });
    },
  });

  const deleteVacancyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/vacancies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vacancies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/funnel'] });
      toast({
        title: t('success'),
        description: t('vacancyDeletedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('failedToDeleteVacancy'),
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: z.infer<typeof vacancySchema>) => {
    try {
      // Clean up empty strings to undefined for optional fields
      const cleanData = {
        ...data,
        location: data.location?.trim() || undefined,
        description: data.description?.trim() || undefined,
        requirements: data.requirements?.trim() || undefined,
      };

      if (selectedVacancy) {
        updateVacancyMutation.mutate({ id: selectedVacancy.id, data: cleanData });
      } else {
        createVacancyMutation.mutate(cleanData);
      }
    } catch (error) {
      devLog('Form submission error:', error);
      toast({
        title: t('error'),
        description: t('formValidationFailed'),
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (vacancy: any) => {
    setSelectedVacancy(vacancy);
    form.reset(vacancy);
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setSelectedVacancy(null);
    form.reset();
  };

  const openCreateModal = (presetDepartment?: string) => {
    setSelectedVacancy(null);
    const defaultValues = {
      title: '',
      department: presetDepartment || '',
      location: '',
      description: '',
      requirements: '',
      status: 'active' as const,
    };
    form.reset(defaultValues);
    setShowCreateModal(true);
  };

  const openViewModal = (vacancy: any) => {
    setViewingVacancy(vacancy);
    setShowViewModal(true);
  };

  const handleDeleteVacancy = (vacancy: any) => {
    const candidateCount = getCandidatesCount(vacancy.id);
    const message = candidateCount > 0
      ? `Are you sure you want to delete "${vacancy.title}"? This will also delete ${candidateCount} associated candidate${candidateCount === 1 ? '' : 's'}. This action cannot be undone.`
      : `Are you sure you want to delete "${vacancy.title}"? This action cannot be undone.`;

    if (window.confirm(message)) {
      deleteVacancyMutation.mutate(vacancy.id);
    }
  };



  const filteredVacancies = (vacancies as Vacancy[]).filter((vacancy: Vacancy) => {
    const matchesSearch = vacancy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vacancy.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vacancy.status === statusFilter;
    const matchesDepartment = !selectedDepartmentFilter || vacancy.department === selectedDepartmentFilter;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const getCandidatesCount = (vacancyId: number) => {
    return (candidates as Candidate[]).filter((c: Candidate) => c.vacancyId === vacancyId).length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800';
      case 'closed':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            {selectedDepartmentFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDepartmentFilter(null)}
                className="p-1 text-slate-600 hover:text-slate-900"
              >
                ← {t('allDepartments')}
              </Button>
            )}
            <h1 className="text-2xl font-semibold text-slate-900">
              {selectedDepartmentFilter ? `${selectedDepartmentFilter} - ${t('vacancies')}` : t('vacancies')}
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            {selectedDepartmentFilter ? `${t('showingVacanciesFor')} ${selectedDepartmentFilter}` : t('manageJobPositions')}
          </p>
        </div>
        <div className="flex gap-2">
          {canManageVacancies(user!) && (
            <>
              <Button
                onClick={() => setShowDepartmentModal(true)}
                variant="outline"
              >
                <Building className="h-4 w-4 mr-2" />
                {t('manageDepartments')}
              </Button>
              <Button onClick={() => openCreateModal()} className="bg-primary-600 hover:bg-primary-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('createVacancy')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder={t('searchVacancies')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="closed">{t('closed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vacancies List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-20 w-full mb-4" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVacancies.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {selectedDepartmentFilter ? `${t('noVacanciesFound')} ${selectedDepartmentFilter}` : t('noVacanciesFound')}
            </h3>
            <p className="text-slate-500 mb-4">
              {selectedDepartmentFilter
                ? `${t('noVacanciesFound')} ${selectedDepartmentFilter} ${t('department')}.`
                : searchTerm || statusFilter !== 'all'
                  ? t('adjustSearchCriteria')
                  : t('getStartedCreateVacancy')}
            </p>
            {canManageVacancies(user!) && (
              <Button onClick={() => openCreateModal(selectedDepartmentFilter || undefined)} className="bg-primary-600 hover:bg-primary-700">
                <Plus className="h-4 w-4 mr-2" />
                {selectedDepartmentFilter ? `${t('create')} ${t('vacancy')} ${selectedDepartmentFilter}` : t('createFirstVacancy')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVacancies.map((vacancy: any) => (
            <Card
              key={vacancy.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openViewModal(vacancy)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {vacancy.title}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-600 text-sm mb-2">
                      <Building className="h-4 w-4" />
                      <span>{vacancy.department}</span>
                    </div>
                    {vacancy.location && (
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{vacancy.location}</span>
                      </div>
                    )}
                  </div>
                  <Badge className={getStatusColor(vacancy.status)}>
                    {vacancy.status === 'active' ? t('active') :
                      vacancy.status === 'in_progress' ? t('inProgress') : t('closed')}
                  </Badge>
                </div>

                {vacancy.description && (
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                    {vacancy.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{getCandidatesCount(vacancy.id)} {t('candidatesLowerCase')}</span>
                  </div>

                  {canManageVacancies(user!) && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(vacancy);
                        }}
                        className="h-8 px-2"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVacancy(vacancy);
                        }}
                        className="h-8 px-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Vacancy Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedVacancy ? t('editVacancy') : t('createNewVacancy')}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('jobTitle')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('enterJobTitle')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('department')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectDepartment')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(departments as Department[]).map((dept: Department) => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('location')} ({t('optional')})</FormLabel>
                    <FormControl>
                      <Input placeholder={t('enterLocation')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('description')} ({t('optional')})</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('enterJobDescription')}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('requirements')} ({t('optional')})</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('enterJobRequirements')}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('status')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value || 'active'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">{t('active')}</SelectItem>
                        <SelectItem value="closed">{t('closed')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeModal}>
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700"
                  disabled={createVacancyMutation.isPending || updateVacancyMutation.isPending}
                >
                  {selectedVacancy ? t('update') : t('create')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Vacancy Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingVacancy?.title}</DialogTitle>
          </DialogHeader>
          {viewingVacancy && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{t('department')}</p>
                  <p className="text-slate-900">{viewingVacancy.department}</p>
                </div>
                {viewingVacancy.location && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">{t('location')}</p>
                    <p className="text-slate-900">{viewingVacancy.location}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">{t('status')}</p>
                <Badge className={getStatusColor(viewingVacancy.status)}>
                  {viewingVacancy.status === 'active' ? t('active') : t('closed')}
                </Badge>
              </div>

              {viewingVacancy.description && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">{t('description')}</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{viewingVacancy.description}</p>
                </div>
              )}

              {viewingVacancy.requirements && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">{t('requirements')}</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{viewingVacancy.requirements}</p>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4" />
                  <span>{getCandidatesCount(viewingVacancy.id)} {t('candidatesApplied')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4" />
                  <span>{t('created')} {new Date(viewingVacancy.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Department Management Modal */}
      <Dialog open={showDepartmentModal} onOpenChange={setShowDepartmentModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('manageDepartments')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add New Department Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('addNewDepartment')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder={t('departmentName')}
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                  />
                  <Input
                    placeholder={t('departmentDescription')}
                    value={newDepartmentDesc}
                    onChange={(e) => setNewDepartmentDesc(e.target.value)}
                  />
                  <Button
                    className="bg-primary-600 hover:bg-primary-700"
                    disabled={!newDepartmentName.trim() || createDepartmentMutation.isPending}
                    onClick={() => {
                      createDepartmentMutation.mutate({
                        name: newDepartmentName.trim(),
                        description: newDepartmentDesc.trim() || undefined
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createDepartmentMutation.isPending ? t('adding') : t('addDepartment')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing Departments List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('existingDepartments')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(departments as Department[]).map((dept: Department) => {
                    const vacancyCount = (vacancies as Vacancy[]).filter((v: Vacancy) => v.department === dept.name).length;
                    const isEditing = editingDepartment?.id === dept.id;


                    return (
                      <div key={dept.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div
                          className={`flex items-center gap-3 flex-1 ${!isEditing ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (!isEditing) {
                              setSelectedDepartmentFilter(dept.name);
                              setShowDepartmentModal(false);
                            }
                          }}
                        >
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Building className="h-5 w-5 text-primary-600" />
                          </div>
                          <div className="flex-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingDepartment.name}
                                  onChange={(e) => setEditingDepartment({ ...editingDepartment, name: e.target.value })}
                                  className="text-sm"
                                />
                                <Input
                                  value={editingDepartment.description || ''}
                                  onChange={(e) => setEditingDepartment({ ...editingDepartment, description: e.target.value })}
                                  placeholder={t('departmentDescription')}
                                  className="text-sm"
                                />
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-slate-900">{dept.name}</h4>
                                  {vacancyCount > 0 && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      {vacancyCount} {vacancyCount === 1 ? t('vacancy') : t('vacancies')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500">{dept.description || t('noDescription')}</p>
                                <p className="text-xs text-blue-600 mt-1">
                                  {vacancyCount > 0 ? t('clickToViewVacancies') : t('clickToViewDepartment')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  updateDepartmentMutation.mutate({
                                    id: editingDepartment.id,
                                    data: {
                                      name: editingDepartment.name,
                                      description: editingDepartment.description || undefined
                                    }
                                  });
                                }}
                                disabled={!editingDepartment.name.trim() || updateDepartmentMutation.isPending}
                              >
                                {t('save')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingDepartment(null)}
                              >
                                {t('cancel')}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDepartment(dept);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`${t('confirmDeleteDepartment').replace('{name}', dept.name)}`)) {
                                    deleteDepartmentMutation.mutate(dept.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {(departments as any[]).length === 0 && (
                    <div className="text-center py-8">
                      <Building className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-500">{t('noDepartmentsYet')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}