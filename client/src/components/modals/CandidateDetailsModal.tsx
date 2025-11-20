import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  FileText,
  Building2,
  Target,
  MessageSquare,
  Star,
  LogOut,
  Edit,
  Save,
  X
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CandidatePhoto } from '@/components/CandidatePhoto';

interface CandidateDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: any;
}

export default function CandidateDetailsModal({ open, onOpenChange, candidate }: CandidateDetailsModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingFeedback, setEditingFeedback] = useState<number | null>(null);
  const [editedFeedbackText, setEditedFeedbackText] = useState('');
  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ['/api/interview-stages/candidate', candidate.id],
    enabled: open && !!candidate.id,
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ stageId, comments }: { stageId: number; comments: string }) => {
      return apiRequest('PUT', `/api/interview-stages/${stageId}/comments`, { comments });
    },
    onSuccess: () => {
      // Инвалидация ВСЕХ связанных query keys для синхронизации отзывов во всех разделах
      queryClient.invalidateQueries({ queryKey: ['/api/interview-stages/candidate', candidate.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['documentation-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      setEditingFeedback(null);
      setEditedFeedbackText('');
      toast({
        title: t('feedbackUpdated'),
        description: t('feedbackUpdatedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('errorOccurred'),
        description: t('failedToUpdateFeedback'),
        variant: 'destructive',
      });
    },
  });

  const canEditFeedback = (stage: any) => {
    if (!user) return false;
    return user.role === 'admin' || stage.interviewerId === user.id;
  };

  const handleStartEditFeedback = (stage: any) => {
    setEditingFeedback(stage.id);
    setEditedFeedbackText(stage.comments || '');
  };

  const handleSaveFeedback = (stageId: number) => {
    if (editedFeedbackText.trim()) {
      updateFeedbackMutation.mutate({ stageId, comments: editedFeedbackText.trim() });
    }
  };

  const handleCancelEditFeedback = () => {
    setEditingFeedback(null);
    setEditedFeedbackText('');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: t('active'), variant: 'default' as const },
      hired: { label: t('hired'), variant: 'default' as const },
      rejected: { label: t('rejected'), variant: 'destructive' as const },
      archived: { label: t('archived'), variant: 'secondary' as const },
      dismissed: { label: t('dismissed'), variant: 'secondary' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getStageStatusBadge = (status: string) => {
    const statusMap = {
      waiting: { label: t('waiting'), color: 'bg-gray-100 text-gray-700' },
      pending: { label: t('pending'), color: 'bg-blue-100 text-blue-700' },
      in_progress: { label: t('inProgress'), color: 'bg-yellow-100 text-yellow-700' },
      passed: { label: t('passed'), color: 'bg-green-100 text-green-700' },
      failed: { label: t('failed'), color: 'bg-red-100 text-red-700' },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const currentStage = stages.find((stage: any) => stage.stageIndex === candidate.currentStageIndex);
  const completedStages = stages.filter((stage: any) => stage.status === 'passed').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <CandidatePhoto 
              photoUrl={candidate.photoUrl} 
              name={candidate.fullName}
              size="md"
            />
            <div>
              <span className="text-xl">{candidate.fullName}</span>
              <div className="mt-1">
                {getStatusBadge(candidate.status)}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            {t('candidateDetailsDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t('contactInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{candidate.email || t('notSpecified')}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{candidate.phone}</span>
                </div>
              )}
              {candidate.city && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{candidate.city}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {t('created')}: {new Date(candidate.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>
              {candidate.source && (
                <div className="flex items-center space-x-3">
                  <Target className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{t('source')}: {candidate.source}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Position Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                {t('positionInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidate.vacancy && (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t('vacancy')}:</p>
                    <p className="text-sm">{candidate.vacancy.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t('department')}:</p>
                    <p className="text-sm">{candidate.vacancy.department}</p>
                  </div>
                </>
              )}
              {candidate.createdByUser && (
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('responsibleManager')}:</p>
                  <p className="text-sm">{candidate.createdByUser.fullName}</p>
                  <p className="text-xs text-gray-500">{candidate.createdByUser.position}</p>
                </div>
              )}
              {candidate.resumeUrl && (
                <div className="pt-2">
                  <a 
                    href={candidate.resumeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {candidate.resumeFilename || t('downloadResume')}
                  </a>
                </div>
              )}
              
              {/* Additional Documentation Attachments */}
              {candidate.documentationAttachments && candidate.documentationAttachments.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">{t('documentationFiles')}:</p>
                  <div className="space-y-1">
                    {candidate.documentationAttachments.map((attachment: any) => (
                      <a 
                        key={attachment.id}
                        href={`/api/files/${attachment.filename}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{attachment.originalName}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Dismissal Information */}
              {candidate.status === 'dismissed' && candidate.dismissalReason && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('dismissalInformation')}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">{t('dismissalReason')}:</p>
                      <p className="text-sm">{candidate.dismissalReason}</p>
                    </div>
                    {candidate.dismissalDate && (
                      <div>
                        <p className="text-xs text-gray-500">{t('dismissalDate')}:</p>
                        <p className="text-sm">{new Date(candidate.dismissalDate).toLocaleDateString('ru-RU')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interview Progress */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {t('interviewProgress')}
                </div>
                <div className="text-sm font-normal text-gray-600">
                  {completedStages} {t('of')} {stages.length} {t('stagesCompleted')}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stages.length > 0 ? (
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(completedStages / stages.length) * 100}%` }}
                    ></div>
                  </div>

                  {/* Stage Timeline */}
                  <div className="space-y-3">
                    {stages.map((stage: any, index: number) => (
                      <div key={stage.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-1
                          ${index < candidate.currentStageIndex 
                            ? 'bg-green-100 text-green-700' 
                            : index === candidate.currentStageIndex 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-500'
                          }
                        `}>
                          {index < candidate.currentStageIndex ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">{stage.stageName}</h4>
                            {getStageStatusBadge(stage.status)}
                          </div>
                          
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center text-sm text-gray-600">
                              <User className="h-3 w-3 mr-1" />
                              {t('interviewer')}: {stage.interviewer?.fullName || t('notAssigned')}
                              {stage.interviewer?.position && (
                                <span className="ml-1 text-gray-500">({stage.interviewer.position})</span>
                              )}
                            </div>
                            
                            {stage.scheduledAt && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="h-3 w-3 mr-1" />
                                {t('scheduled')}: {new Date(stage.scheduledAt).toLocaleDateString('ru-RU')} {t('at')} {new Date(stage.scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            
                            {!stage.scheduledAt && index === candidate.currentStageIndex && (
                              <div className="flex items-center text-sm text-orange-600">
                                <Clock className="h-3 w-3 mr-1" />
                                {t('needScheduleInterview')}
                              </div>
                            )}
                            
                            {/* Interview Feedback */}
                            {stage.comments && (
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center text-sm font-medium text-gray-700">
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    {t('interviewFeedback')}:
                                  </div>
                                  {canEditFeedback(stage) && editingFeedback !== stage.id && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleStartEditFeedback(stage)}
                                      className="h-6 w-6 p-0 text-gray-600 hover:text-gray-800"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                
                                {editingFeedback === stage.id ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editedFeedbackText}
                                      onChange={(e) => setEditedFeedbackText(e.target.value)}
                                      className="text-sm"
                                      rows={3}
                                    />
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveFeedback(stage.id)}
                                        disabled={updateFeedbackMutation.isPending}
                                        className="h-7 text-xs"
                                      >
                                        <Save className="h-3 w-3 mr-1" />
                                        {t('save')}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEditFeedback}
                                        className="h-7 text-xs"
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        {t('cancel')}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{stage.comments}</p>
                                )}
                                
                                {stage.completedAt && editingFeedback !== stage.id && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {t('left')}: {new Date(stage.completedAt).toLocaleDateString('ru-RU')} {t('at')} {new Date(stage.completedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Rating Display */}
                            {stage.rating && (
                              <div className="mt-2 flex items-center text-sm text-gray-600">
                                <Star className="h-3 w-3 mr-1" />
                                {t('rating')}: {stage.rating}/5
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>{t('noInterviewStagesConfigured')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {candidate.notes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  {t('notes')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{candidate.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}