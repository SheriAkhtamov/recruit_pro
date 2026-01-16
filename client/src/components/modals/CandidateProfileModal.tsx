import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/auth';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressTimeline } from '@/components/ui/progress-timeline';
import { CandidatePhoto } from '@/components/CandidatePhoto';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  Download,
  Check,
  X,
  Clock,
} from 'lucide-react';

interface CandidateProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: any;
}

export default function CandidateProfileModal({ 
  open, 
  onOpenChange, 
  candidate 
}: CandidateProfileModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const initials = getInitials(candidate.fullName || '');

  const updateStageMutation = useMutation({
    mutationFn: async ({ stageId, status, comments }: { 
      stageId: number; 
      status: string; 
      comments?: string;
    }) => {
      const response = await apiRequest('PUT', `/api/interview-stages/${stageId}`, {
        status,
        comments,
        completedAt: new Date().toISOString(),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: t('stageUpdatedTitle'),
        description: t('stageUpdatedDescription'),
      });
    },
    onError: () => {
      toast({
        title: t('stageUpdateFailedTitle'),
        description: t('stageUpdateFailedDescription'),
        variant: 'destructive',
      });
    },
  });

  if (!candidate) return null;

  const handleApprove = (stageId: number) => {
    updateStageMutation.mutate({
      stageId,
      status: 'passed',
      comments: t('stageApprovedComment'),
    });
  };

  const handleReject = (stageId: number) => {
    updateStageMutation.mutate({
      stageId,
      status: 'failed',
      comments: t('stageRejectedComment'),
    });
  };

  const timelineStages = candidate.stages?.map((stage: any) => ({
    name: stage.stageName,
    status: stage.status,
  })) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-emerald-100 text-emerald-800">{t('statusPassed')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('statusFailed')}</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-100 text-amber-800">{t('inProgress')}</Badge>;
      default:
        return <Badge variant="secondary">{t('pending')}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-4">
            <CandidatePhoto 
              photoUrl={candidate.photoUrl} 
              name={candidate.fullName}
              size="md"
            />
            <div>
              <DialogTitle className="text-xl" title={initials}>
                {candidate.fullName}
              </DialogTitle>
              <p className="text-sm text-gray-500">
                {candidate.vacancy?.title} {t('candidate')}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column: Personal Info & Resume */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">{t('contactInformation')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 text-gray-400 mr-2" />
                    <span>{candidate.email}</span>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                  {candidate.city && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{candidate.city}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span>{t('appliedOn')}: {new Date(candidate.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resume */}
            {candidate.resumeUrl && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">{t('resumeLabel')}</h4>
                  <div className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <FileText className="h-5 w-5 text-red-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {candidate.resumeFilename || t('resumeDefaultName')}
                      </p>
                      <p className="text-xs text-gray-500">{t('fileTypePdf')}</p>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={candidate.resumeUrl} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Source */}
            {candidate.source && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">{t('sourceLabel')}</h4>
                  <div className="flex items-center">
                    <span className="text-sm capitalize">{candidate.source}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Interview Progress & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Timeline */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">{t('interviewProgress')}</h4>
              
              {timelineStages.length > 0 && (
                <div className="mb-6">
                  <ProgressTimeline 
                    stages={timelineStages}
                    currentStageIndex={candidate.currentStageIndex || 0}
                  />
                </div>
              )}

              {/* Interview History */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-gray-900">{t('interviewHistory')}</h5>
                
                {candidate.stages?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {t('noInterviewStagesConfigured')}
                  </div>
                )}

                {candidate.stages?.map((stage: any, index: number) => (
                  <Card key={stage.id} className={`
                    ${stage.status === 'in_progress' ? 'border-amber-200 bg-amber-50' : ''}
                    ${stage.status === 'passed' ? 'border-emerald-200 bg-emerald-50' : ''}
                    ${stage.status === 'failed' ? 'border-red-200 bg-red-50' : ''}
                  `}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            stage.status === 'passed' ? 'bg-emerald-500' :
                            stage.status === 'failed' ? 'bg-red-500' :
                            stage.status === 'in_progress' ? 'bg-amber-500' :
                            'bg-gray-300'
                          }`} />
                          <span className="font-medium text-gray-900">{stage.stageName}</span>
                          {getStatusBadge(stage.status)}
                        </div>
                        {stage.completedAt && (
                          <span className="text-sm text-gray-500">
                            {new Date(stage.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      {stage.interviewer && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span>{t('interviewer')}: </span>
                          <span className="font-medium">{stage.interviewer.fullName}</span>
                        </div>
                      )}
                      
                      {stage.comments && (
                        <p className="text-sm text-gray-700 mb-3">{stage.comments}</p>
                      )}
                      
                      {/* Interview Actions for current stage */}
                      {stage.status === 'in_progress' || 
                       (stage.status === 'pending' && index === candidate.currentStageIndex) && (
                        <div className="flex items-center space-x-3">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(stage.id)}
                            disabled={updateStageMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {t('approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(stage.id)}
                            disabled={updateStageMutation.isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            {t('reject')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateStageMutation.isPending}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {t('reschedule')}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
