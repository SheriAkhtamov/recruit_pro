import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { CandidatePhoto } from '@/components/CandidatePhoto';
import {
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Plus,
  Upload,
  Download,
  Trash2,
  Check,
  AlertCircle,
  Users,
  FolderOpen,
  CheckCircle,
  ArrowRight,
  User,
  Calendar,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Camera
} from 'lucide-react';

interface Candidate {
  id: number;
  fullName: string;
  email?: string;
  phone?: string;
  city?: string;
  vacancyId: number;
  status: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
  createdByUser?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface Vacancy {
  id: number;
  title: string;
  department: string;
  status: string;
}

interface DocumentationAttachment {
  id: number;
  candidateId: number;
  filename: string;
  originalName: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: number;
  createdAt: string;
  uploadedByUser?: {
    id: number;
    fullName: string;
    email: string;
  };
}

export default function Documentation() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<Record<number, boolean>>({});

  // Photo state management
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>('');

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);

  // Fetch documentation candidates
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ['documentation-candidates'],
    queryFn: async () => {
      const response = await fetch('/api/documentation/candidates', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch documentation candidates');
      return response.json();
    },
  });

  // Fetch vacancies
  const { data: vacancies = [] } = useQuery({
    queryKey: ['vacancies'],
    queryFn: async () => {
      const response = await fetch('/api/vacancies', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch vacancies');
      return response.json();
    },
  });

  // Fetch attachments for selected candidate
  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['documentation-attachments', selectedCandidate?.id],
    queryFn: async () => {
      if (!selectedCandidate) return [];
      const response = await fetch(`/api/documentation/candidates/${selectedCandidate.id}/attachments`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch attachments');
      return response.json();
    },
    enabled: !!selectedCandidate,
  });

  // Add manual candidate mutation
  const addCandidateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/documentation/candidates', {
        method: 'POST',
        body: data,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to add candidate');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-candidates'] });
      setShowAddModal(false);
      toast({
        title: t('candidateAddedToDocumentation'),
        description: t('candidateAddedToDocumentation'),
      });
    },
    onError: () => {
      toast({
        title: t('failedToAddCandidate'),
        description: t('failedToAddCandidate'),
        variant: 'destructive',
      });
    },
  });

  // Upload documents mutation
  const uploadDocumentsMutation = useMutation({
    mutationFn: async ({ candidateId, files }: { candidateId: number; files: FileList }) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('documents', file);
      });

      const response = await fetch(`/api/documentation/candidates/${candidateId}/upload`, {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to upload documents');
      return response.json();
    },
    onSuccess: () => {
      refetchAttachments();
      setUploadFiles(null);
      toast({
        title: t('documentsUploaded'),
        description: t('documentsUploaded'),
      });
    },
    onError: () => {
      toast({
        title: t('documentUploadFailed'),
        description: t('documentUploadFailed'),
        variant: 'destructive',
      });
    },
  });

  // Complete documentation mutation
  const completeDocumentationMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const response = await fetch(`/api/documentation/candidates/${candidateId}/complete`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to complete documentation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setSelectedCandidate(null);
      toast({
        title: t('documentationCompleted'),
        description: t('documentationCompleted'),
      });
    },
    onError: () => {
      toast({
        title: t('documentationFailed'),
        description: t('documentationFailed'),
        variant: 'destructive',
      });
    },
  });

  // Delete candidate mutation
  const deleteCandidateMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete candidate');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      setShowDeleteDialog(false);
      setCandidateToDelete(null);
      toast({
        title: t('candidateDeleted'),
        description: t('candidateDeletedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('errorOccurred'),
        description: error.message || t('failedToDeleteCandidate'),
        variant: 'destructive',
      });
    },
  });

  // Delete attachment mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await fetch(`/api/documentation/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete attachment');
      return response.json();
    },
    onSuccess: () => {
      refetchAttachments();
      toast({
        title: t('documentDeleted'),
        description: t('documentDeleted'),
      });
    },
    onError: () => {
      toast({
        title: t('failedToDeleteDocument'),
        description: t('failedToDeleteDocument'),
        variant: 'destructive',
      });
    },
  });

  // Photo handling functions
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: t('error'),
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('error'),
          description: 'Please select an image smaller than 5MB',
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

  const handleDeleteCandidate = (candidate: Candidate) => {
    setCandidateToDelete(candidate);
    setShowDeleteDialog(true);
  };

  const confirmDeleteCandidate = () => {
    if (candidateToDelete) {
      deleteCandidateMutation.mutate(candidateToDelete.id);
    }
  };

  const handleAddCandidate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // Add photo if selected
    if (selectedPhotoFile) {
      formData.append('photo', selectedPhotoFile);
    }

    try {
      const result = await addCandidateMutation.mutateAsync(formData);
      if (result?.id) {
        setShowDocumentsModal(true);
      }

      // Reset photo state
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl('');
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const handleUploadDocuments = () => {
    if (uploadFiles && selectedCandidate) {
      uploadDocumentsMutation.mutate({
        candidateId: selectedCandidate.id,
        files: uploadFiles,
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!user) {
    return <div>{t('loading')}</div>;
  }

  if (candidatesLoading) {
    return <div className="p-6">{t('loading')}</div>;
  }

  const documentationDateLabel = new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU');
  const uniqueOwners = new Set(
    candidates.map((candidate: Candidate) => candidate.createdByUser?.id).filter(Boolean)
  ).size;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('documentation')}</h1>
          <p className="text-muted-foreground">
            {t('documentationManagement')}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-slate-400" />
              {t('candidates')}: {candidates.length}
            </span>
            <span className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-400" />
              {t('vacancies')}: {vacancies.length}
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              {t('responsible')}: {uniqueOwners}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              {documentationDateLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('addManualCandidate')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('addManualCandidate')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCandidate} className="space-y-4">
              {/* Photo Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">{t('candidatePhoto')}</label>
                <div className="flex items-center gap-4">
                  {photoPreviewUrl ? (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex-shrink-0">
                      <img
                        src={photoPreviewUrl}
                        alt="Photo preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <CandidatePhoto
                      photoUrl={null}
                      name="New Candidate"
                      size="lg"
                    />
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('photo-input-doc')?.click()}
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
                  id="photo-input-doc"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <p className="text-xs text-gray-500">
                  {t('photoOptional')} • {t('photoFormat')}
                </p>
              </div>

              <div>
                <Label htmlFor="fullName">{t('fullName')} *</Label>
                <Input id="fullName" name="fullName" required />
              </div>
              <div>
                <Label htmlFor="email">{t('email')}</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div>
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input id="phone" name="phone" />
              </div>
              <div>
                <Label htmlFor="city">{t('city')}</Label>
                <Input id="city" name="city" />
              </div>
              <div>
                <Label htmlFor="vacancyId">{t('vacancy')} *</Label>
                <Select name="vacancyId" required>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectVacancy')} />
                  </SelectTrigger>
                  <SelectContent>
                    {vacancies.map((vacancy: Vacancy) => (
                      <SelectItem key={vacancy.id} value={vacancy.id.toString()}>
                        {vacancy.title} - {vacancy.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="documents">{t('attachDocuments')}</Label>
                <Input
                  id="documents"
                  name="documents"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {t('maxDocuments')}
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={addCandidateMutation.isPending}>
                  {addCandidateMutation.isPending ? t('saving') : t('addCandidate')}
                </Button>
              </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showDocumentsModal} onOpenChange={setShowDocumentsModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                {t('viewDocuments')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('documentation')}</DialogTitle>
                <DialogDescription>{t('documentationManagement')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-slate-400" />
                  {t('addManualCandidate')}
                </p>
                <p className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-slate-400" />
                  {t('attachDocuments')}
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {t('scheduleInterview')}
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowDocumentsModal(false)}>
                  {t('close')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {candidates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('noDocumentationCandidates')}</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {t('documentationCandidatesWillAppear')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {candidates.map((candidate: Candidate) => {
            const vacancy = vacancies.find((v: Vacancy) => v.id === candidate.vacancyId);

            return (
              <DocumentationCandidateCard
                key={candidate.id}
                candidate={candidate}
                vacancy={vacancy}
                attachments={attachments}
                selectedCandidate={selectedCandidate}
                setSelectedCandidate={setSelectedCandidate}
                uploadFiles={uploadFiles}
                setUploadFiles={setUploadFiles}
                handleUploadDocuments={handleUploadDocuments}
                deleteAttachmentMutation={deleteAttachmentMutation}
                uploadDocumentsMutation={uploadDocumentsMutation}
                completeDocumentationMutation={completeDocumentationMutation}
                formatFileSize={formatFileSize}
                expandedFeedback={expandedFeedback}
                setExpandedFeedback={setExpandedFeedback}
                handleDeleteCandidate={handleDeleteCandidate}
                t={t}
              />
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">{t('deleteCandidate')}</DialogTitle>
            <DialogDescription>
              {t('deleteCandidateConfirmation')} <strong>{candidateToDelete?.fullName}</strong>?
              <br /><br />
              <span className="text-red-600 font-medium">{t('deleteCandidateWarning')}</span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCandidate}
              disabled={deleteCandidateMutation.isPending}
            >
              {deleteCandidateMutation.isPending ? t('deleting') : t('deleteCandidate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentationCandidateCard({
  candidate,
  vacancy,
  attachments,
  selectedCandidate,
  setSelectedCandidate,
  uploadFiles,
  setUploadFiles,
  handleUploadDocuments,
  deleteAttachmentMutation,
  uploadDocumentsMutation,
  completeDocumentationMutation,
  formatFileSize,
  expandedFeedback,
  setExpandedFeedback,
  handleDeleteCandidate,
  t
}: any) {
  const { user } = useAuth();
  const { language } = useTranslation();
  const { data: stages = [] } = useQuery({
    queryKey: ['/api/interview-stages/candidate', candidate.id],
  });

  const typedStages = stages as any[];
  const completedStages = typedStages.filter(stage => stage.status === 'passed');
  const showFeedback = expandedFeedback[candidate.id] || false;

  return (
    <Card className="relative hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <CandidatePhoto
              photoUrl={candidate.photoUrl}
              name={candidate.fullName}
              size="md"
            />
            <div className="flex-1">
              <CardTitle className="text-lg">{candidate.fullName}</CardTitle>
              {vacancy && (
                <p className="text-sm text-muted-foreground">
                  {vacancy.title} • {vacancy.department}
                </p>
              )}
              {candidate.createdByUser && (
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <User className="h-3 w-3 mr-1" />
                  {t('responsible')}: {candidate.createdByUser.fullName}
                </div>
              )}
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800">
            {t('inDocumentation')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="space-y-2 text-sm">
          {candidate.email && (
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{candidate.email}</span>
            </div>
          )}
          {candidate.phone && (
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{candidate.phone}</span>
            </div>
          )}
          {candidate.city && (
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{candidate.city}</span>
            </div>
          )}
          {candidate.source && (
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{t('source')}: {candidate.source}</span>
            </div>
          )}
        </div>

        {/* Interview Stage Progress */}
        {typedStages.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700">
                {t('completedInterviewStages')}
              </h4>
              <span className="text-xs text-slate-500">
                {completedStages.length} {t('of')} {typedStages.length} {t('completed')}
              </span>
            </div>

            <div className="flex items-center space-x-2 mb-3">
              {typedStages.map((stage: any, index: number) => (
                <div key={stage.id} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                    ${stage.status === 'passed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                    }
                  `}>
                    {stage.status === 'passed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < typedStages.length - 1 && (
                    <ArrowRight className="h-3 w-3 mx-1 text-gray-400" />
                  )}
                </div>
              ))}
            </div>

            {/* Stage Names */}
            <div className="text-xs text-muted-foreground space-y-1">
              {typedStages.map((stage: any) => (
                <div key={stage.id} className={`flex items-center justify-between ${stage.status === 'passed' ? 'text-green-700' : 'text-gray-500'
                  }`}>
                  <span>{stage.stageName}</span>
                  {stage.status === 'passed' && (
                    <CheckCircle className="h-3 w-3" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interview Feedback History */}
        {completedStages.length > 0 && (
          <div className="border-t pt-4">
            <button
              className="flex items-center text-sm font-medium text-slate-700 hover:text-slate-900 mb-2 w-full justify-between"
              onClick={() => {
                setExpandedFeedback((prev: any) => ({
                  ...prev,
                  [candidate.id]: !prev[candidate.id]
                }));
              }}
            >
              <div className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('interviewFeedback')}
              </div>
              {showFeedback ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showFeedback && (
              <div className="space-y-2">
                {completedStages.map((stage: any) => (
                  stage.comments && (
                    <div key={stage.id} className="bg-green-50 p-3 rounded-lg border-l-4 border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-green-800">
                          {stage.stageName}
                        </span>
                        <span className="text-xs text-green-600">
                          {stage.interviewer?.fullName}
                        </span>
                      </div>
                      <p className="text-sm text-green-700 whitespace-pre-wrap mb-2">
                        {stage.comments}
                      </p>
                      {stage.completedAt && (
                        <div className="text-xs text-green-600">
                          {new Date(stage.completedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU')} {t('atTime')} {new Date(stage.completedAt).toLocaleTimeString(language === 'en' ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {/* Document Management Section */}
        {selectedCandidate?.id === candidate.id && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              {t('attachedDocuments')}
            </h4>

            {attachments.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('noDocumentsAttached')}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment: DocumentationAttachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{attachment.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.fileSize)} • {new Date(attachment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          window.open(`/api/files/${attachment.filename}`, '_blank');
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(t('confirmDeleteDocument'))) {
                            deleteAttachmentMutation.mutate(attachment.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setUploadFiles(e.target.files)}
              />
              {uploadFiles && (
                <Button
                  size="sm"
                  onClick={handleUploadDocuments}
                  disabled={uploadDocumentsMutation.isPending}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadDocumentsMutation.isPending ? t('saving') : t('uploadDocuments')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCandidate(
                selectedCandidate?.id === candidate.id ? null : candidate
              );
            }}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            {selectedCandidate?.id === candidate.id ? t('hide') : t('manageDocuments')}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (confirm(t('confirmCompleteDocumentation'))) {
                completeDocumentationMutation.mutate(candidate.id);
              }
            }}
            disabled={completeDocumentationMutation.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <Check className="h-4 w-4 mr-2" />
            {completeDocumentationMutation.isPending ? t('saving') : t('completeDocumentation')}
          </Button>
          {user?.role === 'admin' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteCandidate(candidate)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center space-x-4">
            {candidate.resumeUrl && (
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center"
              >
                <FileText className="h-3 w-3 mr-1" />
                {t('resume')}
              </a>
            )}
          </div>
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(candidate.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
