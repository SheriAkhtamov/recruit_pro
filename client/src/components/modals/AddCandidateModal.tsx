import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, X, User, Camera, Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { CandidatePhoto } from '@/components/CandidatePhoto';
import { PhotoUploadModal } from '@/components/modals/PhotoUploadModal';
import { devLog } from '@/lib/debug';

// Define schema with translated validation messages
const createAddCandidateSchema = (t: (key: string) => string) => z.object({
  fullName: z.string().min(1, t('candidateNameRequired')),
  email: z.string().email(t('invalidEmailFormat')).optional().or(z.literal('')),
  phone: z.string().optional(),
  city: z.string().optional(),
  vacancyId: z.number().min(1, t('selectVacancyRequired')).optional(),
  source: z.string().optional(),
  interviewStageChain: z.array(z.object({
    stageName: z.string().min(1, t('stageNameRequired')),
    interviewerId: z.number().min(1, t('selectInterviewerRequired')),
  })).min(1, t('addAtLeastOneStage')),
});

interface AddCandidateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddCandidateModal({ open, onOpenChange }: AddCandidateModalProps) {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [currentStage, setCurrentStage] = useState({
    stageName: '',
    interviewerId: null as number | null,
  });
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>('');
  const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false);
  const [tempCandidateId, setTempCandidateId] = useState<number | null>(null);

  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Create schema with translations
  const addCandidateSchema = createAddCandidateSchema(t);
  type AddCandidateForm = z.infer<typeof addCandidateSchema>;

  const form = useForm<AddCandidateForm>({
    resolver: zodResolver(addCandidateSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      city: '',
      vacancyId: undefined,
      source: '',
      interviewStageChain: [],
    },
  });

  const { data: vacancies = [] } = useQuery<any[]>({
    queryKey: ['/api/vacancies/active'],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const interviewers = users.filter((user: any) =>
    user.role === 'hr_manager' || user.role === 'admin' || user.role === 'employee'
  );

  const addCandidateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest('POST', '/api/candidates', formData);
    },
    onSuccess: async (data) => {
      // If there's a selected photo, upload it after candidate creation
      if (selectedPhotoFile && data.id) {
        try {
          const photoFormData = new FormData();
          photoFormData.append('photo', selectedPhotoFile);

          await apiRequest('POST', `/api/candidates/${data.id}/photo`, photoFormData);
        } catch (error) {
          devLog('Error uploading photo:', error);
          toast({
            title: t('warning'),
            description: t('candidateCreatedPhotoFailed'),
            variant: 'destructive',
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: t('successTitle'),
        description: `${t('candidate')} ${data.fullName} ${t('candidateAddedSuccess')}`,
        className: 'bg-green-50 border-green-200',
      });
      onOpenChange(false);
      form.reset();
      setAttachedFiles([]);
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl('');
      if (!selectedPhotoFile && data.id) {
        setTempCandidateId(data.id);
        setIsPhotoUploadOpen(true);
      }
    },
    onError: (error: any) => {
      devLog('Error creating candidate:', error);
      toast({
        title: t('errorCreatingCandidate'),
        description: error.message || t('checkDataAndTryAgain'),
        variant: 'destructive',
      });
    },
  });

  const handlePhotoUploaded = (photoUrl: string) => {
    setPhotoPreviewUrl(photoUrl);
    setIsPhotoUploadOpen(false);
  };

  const handleAddStage = () => {
    if (currentStage.stageName && currentStage.interviewerId) {
      const stages = form.getValues('interviewStageChain');
      const interviewer = interviewers.find((u: any) => u.id === currentStage.interviewerId);
      if (interviewer) {
        devLog('Selected interviewer:', interviewer.fullName);
      }

      form.setValue('interviewStageChain', [
        ...stages,
        {
          stageName: currentStage.stageName,
          interviewerId: currentStage.interviewerId,
        },
      ]);

      setCurrentStage({ stageName: '', interviewerId: null });
    }
  };

  const handleRemoveStage = (index: number) => {
    const stages = form.getValues('interviewStageChain');
    form.setValue('interviewStageChain', stages.filter((_, i) => i !== index));
  };

  // Photo handling functions
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: t('error'),
          description: t('selectImageFile'),
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('error'),
          description: t('imageTooLarge'),
          variant: 'destructive',
        });
        return;
      }

      setSelectedPhotoFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl('');
  };

  const onSubmit = (data: AddCandidateForm) => {
    devLog('Form submission data:', data);
    devLog('Form errors:', form.formState.errors);

    // Validate that all required fields are present
    if (!data.fullName) {
      toast({
        title: t('error'),
        description: t('fillCandidateName'),
        variant: 'destructive',
      });
      return;
    }



    if (!data.vacancyId || data.vacancyId === 0) {
      toast({
        title: t('error'),
        description: t('selectVacancy'),
        variant: 'destructive',
      });
      return;
    }

    if (!data.interviewStageChain || data.interviewStageChain.length === 0) {
      toast({
        title: t('error'),
        description: t('addAtLeastOneStage'),
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();

    formData.append('fullName', data.fullName);
    formData.append('email', data.email || '');
    formData.append('phone', data.phone || '');
    formData.append('city', data.city || '');
    formData.append('vacancyId', data.vacancyId.toString());
    formData.append('source', data.source || '');
    formData.append('interviewStageChain', JSON.stringify(data.interviewStageChain));

    // Append all attached files with the correct name expected by backend
    attachedFiles.forEach((file) => {
      formData.append('files', file);
    });

    devLog('Sending FormData with entries:');
    for (let [key, value] of formData.entries()) {
      devLog(`${key}: ${value}`);
    }

    addCandidateMutation.mutate(formData);
  };

  const stages = form.watch('interviewStageChain');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('addCandidateTitle')}</DialogTitle>
            <DialogDescription>
              {t('createCandidateProfile')}
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
                    <FormLabel>{t('fullName')} *</FormLabel>
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
                      <Input placeholder="+7 123 456 78 90" {...field} />
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
                    <FormLabel>{t('vacancy')} *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
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
                      <Input placeholder={t('candidateSourcePlaceholder')} {...field} />
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
                {photoPreviewUrl ? (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex-shrink-0">
                    <img
                      src={photoPreviewUrl}
                      alt="Photo preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <CandidatePhoto
                    photoUrl={null}
                    name={form.watch('fullName') || 'New Candidate'}
                    size="xl"
                  />
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('photo-input')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    {photoPreviewUrl ? t('changePhoto') : t('uploadPhoto')}
                  </Button>
                  {photoPreviewUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemovePhoto}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('removePhoto')}
                    </Button>
                  )}
                </div>
              </div>
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <p className="text-xs text-gray-500">
                {t('photoOptional')} • {t('photoFormat')}
              </p>
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('attachFiles')}</label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                multiple
                onChange={(e) => {
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
                }}
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
                        onClick={() => {
                          setAttachedFiles(files => files.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interview Stage Chain */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('interviewStageChain')}</CardTitle>
                <p className="text-sm text-gray-600">{t('addStagesForPosition')}</p>
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
                      <SelectValue placeholder={t('interviewerPlaceholder')} />
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
                    <h4 className="font-medium">{t('createdStages')}</h4>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={addCandidateMutation.isPending}>
                {addCandidateMutation.isPending ? t('creating') : t('createCandidate')}
              </Button>
            </DialogFooter>
          </form>
          </Form>
        </DialogContent>
      </Dialog>
      {tempCandidateId && (
        <PhotoUploadModal
          isOpen={isPhotoUploadOpen}
          onClose={() => setIsPhotoUploadOpen(false)}
          onPhotoUploaded={handlePhotoUploaded}
          candidateId={tempCandidateId}
        />
      )}
    </>
  );
}
