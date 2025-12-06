import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { apiRequest } from '@/lib/queryClient';
import { PhotoUploadModal } from './PhotoUploadModal';
import { CandidatePhoto } from '@/components/CandidatePhoto';
import { Plus, X, User, FileText, Camera, Trash2 } from 'lucide-react';
import { devLog } from '@/lib/debug';

// Define schema with translated validation messages
const createEditCandidateSchema = (t: (key: string) => string) => z.object({
  fullName: z.string().min(1, t('candidateNameRequired')),
  email: z.string().email(t('invalidEmailFormat')).optional().or(z.literal('')),
  phone: z.string().optional(),
  city: z.string().optional(),
  vacancyId: z.number().min(1, t('selectVacancyRequired')).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  interviewStageChain: z.array(z.object({
    stageName: z.string()
      .min(3, t('stageNameRequired'))
      .refine((name) => !/^\d+$/.test(name.trim()), t('stageNameCannotBeOnlyNumbers')),
    interviewerId: z.number().min(1, t('selectInterviewerRequired')),
  })).optional(), // Made optional for editing existing candidates
});

type EditCandidateForm = z.infer<ReturnType<typeof createEditCandidateSchema>>;

interface EditCandidateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: any;
}

export default function EditCandidateModal({ open, onOpenChange, candidate }: EditCandidateModalProps) {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [currentStage, setCurrentStage] = useState({
    stageName: '',
    interviewerId: null as number | null,
  });
  const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);

  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Create schema with translations
  const editCandidateSchema = createEditCandidateSchema(t);
  type EditCandidateForm = z.infer<typeof editCandidateSchema>;

  const form = useForm<EditCandidateForm>({
    resolver: zodResolver(editCandidateSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      city: '',
      vacancyId: undefined,
      source: '',
      notes: '',
      interviewStageChain: [],
    },
  });

  // Update form when candidate changes
  useEffect(() => {
    if (candidate && open) {
      form.reset({
        fullName: candidate.fullName || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        city: candidate.city || '',
        vacancyId: candidate.vacancyId || undefined,
        source: candidate.source || '',
        notes: candidate.notes || '',
        interviewStageChain: candidate.interviewStageChain || [],
      });
      setCurrentPhotoUrl(candidate.photoUrl || null);
    }
  }, [candidate, open, form]);

  const { data: vacancies = [] } = useQuery<any[]>({
    queryKey: ['/api/vacancies/active'],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const interviewers = users.filter((user: any) =>
    user.role === 'hr_manager' || user.role === 'admin' || user.role === 'employee'
  );

  const editCandidateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      devLog('🔄 Отправка запроса на обновление кандидата...');
      devLog('📋 FormData entries:');
      for (let [key, value] of formData.entries()) {
        devLog(`  ${key}: ${value}`);
      }

      const result = await apiRequest('PUT', `/api/candidates/${candidate.id}`, formData);
      devLog('✅ Ответ сервера:', result);
      return result;
    },
    onSuccess: (data) => {
      devLog('🎉 Кандидат успешно обновлен:', data);
      // Инвалидация ВСЕХ связанных query keys для синхронизации данных во всех разделах
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['documentation-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/interview-stages/candidate', candidate.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: t('candidateUpdated'),
        description: t('candidateDataSaved'),
      });
      onOpenChange(false);
      setAttachedFiles([]);
    },
    onError: (error: any) => {
      devLog('❌ Ошибка при обновлении кандидата:', error);
      devLog('📋 Детали ошибки:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      toast({
        title: t('error'),
        description: error.message || t('failedToUpdateCandidate'),
        variant: 'destructive',
      });
    },
  });

  // Photo handling functions
  const handlePhotoUploaded = (photoUrl: string) => {
    setCurrentPhotoUrl(photoUrl);
    // Invalidate queries to refresh candidate data
    queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
    toast({
      title: t('success'),
      description: 'Photo uploaded successfully',
    });
  };

  const deletePhotoMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/candidates/${candidate.id}/photo`);
    },
    onSuccess: () => {
      setCurrentPhotoUrl(null);
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: t('success'),
        description: 'Photo deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || 'Failed to delete photo',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EditCandidateForm) => {
    devLog('EditCandidate - Form submission data:', data);
    devLog('EditCandidate - Form errors:', form.formState.errors);

    // Additional validation for interview stages if provided
    if (data.interviewStageChain && data.interviewStageChain.length > 0) {
      const hasInvalidStages = data.interviewStageChain.some(stage =>
        !stage.stageName.trim() || !stage.interviewerId
      );

      if (hasInvalidStages) {
        toast({
          title: t('error'),
          description: t('stageNameRequired') + ' / ' + t('selectInterviewerRequired'),
          variant: 'destructive',
        });
        return;
      }
    }

    const formData = new FormData();

    formData.append('fullName', data.fullName);
    formData.append('email', data.email || '');
    formData.append('phone', data.phone || '');
    formData.append('city', data.city || '');
    if (data.vacancyId) {
      formData.append('vacancyId', data.vacancyId.toString());
    }
    formData.append('source', data.source || '');
    formData.append('notes', data.notes || '');

    // Only append interview stage chain if it exists and has stages
    if (data.interviewStageChain && data.interviewStageChain.length > 0) {
      formData.append('interviewStageChain', JSON.stringify(data.interviewStageChain));
    }

    // Append all attached files with the correct name expected by backend
    attachedFiles.forEach((file) => {
      formData.append('files', file);
    });

    devLog('EditCandidate - Submitting form data...');
    editCandidateMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast({
        title: t('tooManyFiles'),
        description: t('maxFilesError'),
        variant: 'destructive',
      });
      return;
    }
    setAttachedFiles(files);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleAddStage = () => {
    devLog('📝 Попытка добавить этап:', currentStage);

    if (!currentStage.stageName.trim()) {
      toast({
        title: t('error'),
        description: t('stageNameRequired'),
        variant: 'destructive',
      });
      return;
    }

    // Проверяем, что название этапа не слишком короткое
    if (currentStage.stageName.trim().length < 3) {
      toast({
        title: t('error'),
        description: t('stageNameRequired'),
        variant: 'destructive',
      });
      return;
    }

    // Проверяем, что название не состоит только из цифр
    if (/^\d+$/.test(currentStage.stageName.trim())) {
      toast({
        title: t('error'),
        description: t('stageNameCannotBeOnlyNumbers'),
        variant: 'destructive',
      });
      return;
    }

    if (!currentStage.interviewerId) {
      toast({
        title: t('error'),
        description: t('selectInterviewerRequired'),
        variant: 'destructive',
      });
      return;
    }

    const stages = form.getValues('interviewStageChain') || [];

    // Check for duplicate stage names
    const isDuplicate = stages.some(stage =>
      stage.stageName.toLowerCase().trim() === currentStage.stageName.toLowerCase().trim()
    );

    if (isDuplicate) {
      toast({
        title: t('error'),
        description: t('duplicateStageError'),
        variant: 'destructive',
      });
      return;
    }

    const newStage = {
      stageName: currentStage.stageName.trim(),
      interviewerId: currentStage.interviewerId,
    };

    form.setValue('interviewStageChain', [...stages, newStage]);
    setCurrentStage({ stageName: '', interviewerId: null });

    devLog('✅ Этап добавлен:', newStage);
    devLog('📋 Текущие этапы:', [...stages, newStage]);

    // Show success feedback
    toast({
      title: t('success'),
      description: `${t('stageAdded')}: "${currentStage.stageName.trim()}"`,
    });
  };

  const handleRemoveStage = (index: number) => {
    const stages = form.getValues('interviewStageChain') || [];
    form.setValue('interviewStageChain', stages.filter((_, i) => i !== index));
  };

  const stages = form.watch('interviewStageChain') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editCandidate')}</DialogTitle>
          <DialogDescription>
            {t('updateCandidateInfo')} {candidate?.fullName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fullNameRequired')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('fullNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('emailPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phone')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('phonePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('city')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('cityPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vacancyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('vacancy')}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectVacancy')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vacancies.map((vacancy: any) => (
                          <SelectItem key={vacancy.id} value={vacancy.id.toString()}>
                            {vacancy.title} - {vacancy.department}
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
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('source')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('sourcePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Photo Section */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">{t('candidatePhoto')}</label>
              <div className="flex items-center gap-4">
                <CandidatePhoto
                  photoUrl={currentPhotoUrl}
                  name={candidate?.fullName || ''}
                  size="xl"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPhotoUploadOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    {currentPhotoUrl ? t('changePhoto') : t('uploadPhoto')}
                  </Button>
                  {currentPhotoUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => deletePhotoMutation.mutate()}
                      disabled={deletePhotoMutation.isPending}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletePhotoMutation.isPending ? t('deleting') : t('deletePhoto')}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {t('photoOptional')} • {t('photoFormat')}
              </p>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('notesPlaceholder')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Interview Stage Chain */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('interviewStageChain')}</CardTitle>
                <p className="text-sm text-gray-600">{t('editStagesDescription')}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Stage */}
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder={t('stageNamePlaceholder')}
                    value={currentStage.stageName}
                    onChange={(e) => setCurrentStage({ ...currentStage, stageName: e.target.value })}
                  />
                  <Select onValueChange={(value) => setCurrentStage({ ...currentStage, interviewerId: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectInterviewer')} />
                    </SelectTrigger>
                    <SelectContent>
                      {interviewers.map((interviewer: any) => (
                        <SelectItem key={interviewer.id} value={interviewer.id.toString()}>
                          {interviewer.fullName} - {interviewer.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddStage}
                    disabled={!currentStage.stageName || !currentStage.interviewerId}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Display Added Stages */}
                {stages.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">{t('currentStages')}:</h4>
                    {stages.map((stage, index) => {
                      const interviewer = interviewers.find((u: any) => u.id === stage.interviewerId);
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline">{index + 1}</Badge>
                            <div>
                              <p className="font-medium">{stage.stageName}</p>
                              <p className="text-sm text-gray-600">
                                <User className="inline h-3 w-3 mr-1" />
                                {interviewer?.fullName} - {interviewer?.position}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveStage(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="interviewStageChain"
                  render={() => (
                    <FormItem>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* File Attachments */}
            <div className="space-y-3">
              {/* Existing Resume */}
              {candidate?.resumeUrl && (
                <div>
                  <label className="block text-sm font-medium mb-2">{t('currentAttachment')}</label>
                  <div className="flex items-center justify-between text-sm text-gray-700 bg-blue-50 p-3 rounded border">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span>{candidate.resumeFilename || t('resumeDefaultName')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Open file in new tab
                          window.open(candidate.resumeUrl, '_blank');
                        }}
                      >
                        {t('view')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Add logic to remove existing file
                          devLog('Remove existing file');
                        }}
                      >
                        {t('removeFile')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* New File Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('attachNewFiles')}</label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  multiple
                  onChange={handleFileChange}
                />
                {attachedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <span>{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={editCandidateMutation.isPending}>
                {editCandidateMutation.isPending ? t('saving') : t('saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Photo Upload Modal */}
        <PhotoUploadModal
          isOpen={isPhotoUploadOpen}
          onClose={() => setIsPhotoUploadOpen(false)}
          onPhotoUploaded={handlePhotoUploaded}
          candidateId={candidate?.id}
        />
      </DialogContent>
    </Dialog>
  );
}