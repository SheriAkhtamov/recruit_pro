import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { canApproveInterview } from '@/lib/auth';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ArrowRight,
  Edit,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format, addDays } from 'date-fns';
import { useTranslation } from '@/hooks/useTranslation';
import EditCandidateModal from '@/components/modals/EditCandidateModal';
import CandidateDetailsModal from '@/components/modals/CandidateDetailsModal';
import { CandidatePhoto } from '@/components/CandidatePhoto';

interface CandidateCardProps {
  candidate: any;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CandidateCard({ candidate, onEdit, onDelete }: CandidateCardProps) {
  const [showScheduleInterview, setShowScheduleInterview] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalFeedback, setApprovalFeedback] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [nextStageToSchedule, setNextStageToSchedule] = useState<any>(null);
  const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<number | null>(null);
  const [editedFeedbackText, setEditedFeedbackText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();

  const { data: stages = [] } = useQuery({
    queryKey: ['/api/interview-stages/candidate', candidate.id],
  });

  // Type assertion for stages data
  const typedStages = stages as any[];

  const markInterviewConductedMutation = useMutation({
    mutationFn: async ({ stageId, feedback }: { stageId: number; feedback: string }) => {
      // First, mark the stage as passed with feedback
      await apiRequest('PUT', `/api/interview-stages/${stageId}`, {
        status: 'passed',
        completedAt: new Date().toISOString(),
        comments: feedback,
      });

      // Then, update the candidate's current stage index
      const nextStageIndex = candidate.currentStageIndex + 1;
      await apiRequest('PUT', `/api/candidates/${candidate.id}`, {
        currentStageIndex: nextStageIndex
      });

      return { stageId, nextStageIndex };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/interview-stages/candidate', candidate.id] });
      toast({
        title: t('stageCompleted'),
        description: t('candidateMovedToNext'),
      });
      // Check if there's a next stage to schedule
      const nextStageData = typedStages.find((stage: any) => stage.stageIndex === candidate.currentStageIndex + 1);
      if (nextStageData) {
        // Show scheduling modal for next stage
        setNextStageToSchedule(nextStageData);
        setShowScheduleInterview(true);
      } else {
        // All stages completed - candidate can be hired
        toast({
          title: t('allStagesCompleted'),
          description: t('nowCandidateCanBeHired'),
        });
      }
    },
    onError: () => {
      toast({
        title: t('errorOccurred'),
        description: t('failedToCompleteStage'),
        variant: 'destructive',
      });
    },
  });

  const rejectInterviewStageMutation = useMutation({
    mutationFn: async ({ stageId, feedback }: { stageId: number; feedback: string }) => {
      // Mark the stage as failed with feedback
      await apiRequest('PUT', `/api/interview-stages/${stageId}`, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        comments: feedback,
      });

      // This will automatically mark the candidate as rejected via backend logic
      return { stageId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/interview-stages/candidate', candidate.id] });
      toast({
        title: t('stageCompleted'),
        description: t('candidateRejectedAtStage'),
      });
      setShowRejectDialog(false);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: t('errorOccurred'),
        description: error.message || t('failedToCompleteStage'),
        variant: 'destructive',
      });
    },
  });

  const rejectCandidateMutation = useMutation({
    mutationFn: async (reason: string) => {
      return apiRequest('PUT', `/api/candidates/${candidate.id}`, {
        status: 'rejected',
        rejectionReason: reason,
        rejectionStage: candidate.currentStageIndex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: t('candidateRejected'),
        description: t('candidateMovedToArchive'),
      });
    },
    onError: () => {
      toast({
        title: t('errorOccurred'),
        description: t('failedToRejectCandidate'),
        variant: 'destructive',
      });
    },
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
        title: t('error'),
        description: t('failedToUpdateFeedback'),
        variant: 'destructive',
      });
    },
  });

  // NOTE: Deletion is handled by parent component via onDelete prop
  // No need for local mutation to avoid double deletion

  const currentStage = typedStages.find((stage: any) => stage.stageIndex === candidate.currentStageIndex);
  const nextStage = typedStages.find((stage: any) => stage.stageIndex === candidate.currentStageIndex + 1);
  const isCurrentStageManager = currentStage && user && currentStage.interviewerId === user.id;
  const canApprove = currentStage && user ? canApproveInterview(user, currentStage.interviewerId) : false;
  const isCreator = candidate.createdBy === user?.id;

  // Function to determine candidate visual status for color indicators
  const getCandidateVisualStatus = () => {
    // Gray: New applications without interview stages
    if (typedStages.length === 0 && (!candidate.interviewStageChain || candidate.interviewStageChain.length === 0)) {
      return 'new'; // Gray
    }

    // Blue: Interview chain created but no interviews scheduled
    if (typedStages.length > 0) {
      const hasScheduledInterviews = typedStages.some((stage: any) => stage.scheduledAt);
      if (!hasScheduledInterviews) {
        return 'chain-created'; // Blue
      }

      // Yellow: Has scheduled interviews that are not completed
      const hasActiveScheduledInterview = typedStages.some((stage: any) =>
        stage.scheduledAt && stage.status !== 'passed' && stage.status !== 'failed'
      );
      if (hasActiveScheduledInterview) {
        return 'interview-scheduled'; // Yellow
      }
    }

    // Default (no special color)
    return 'default';
  };

  // Get card styling based on visual status
  const getCardStyling = () => {
    const status = getCandidateVisualStatus();
    const baseClasses = "hover:shadow-md transition-shadow cursor-pointer";

    switch (status) {
      case 'new':
        return `${baseClasses} border-l-4 border-gray-400 bg-gray-50`;
      case 'chain-created':
        return `${baseClasses} border-l-4 border-blue-400 bg-blue-50`;
      case 'interview-scheduled':
        return `${baseClasses} border-l-4 border-yellow-400 bg-yellow-50`;
      default:
        return baseClasses;
    }
  };

  const canEditFeedback = (stage: any) => {
    if (!user) return false;
    return user.role === 'admin' || stage.interviewerId === user.id;
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const handleDeleteCandidate = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCandidate = () => {
    setShowDeleteConfirm(false);
    onDelete(); // Call parent's delete handler
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
    const variants = {
      active: 'bg-green-100 text-green-800',
      hired: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800',
    } as const;

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.active}>
        {status}
      </Badge>
    );
  };

  const handleReject = () => {
    setShowRejectDialog(true);
  };

  const handleApprove = () => {
    setShowApproveDialog(true);
  };

  const handleScheduleNextStage = async () => {
    if (!scheduledDate || !scheduledTime || !nextStageToSchedule) {
      toast({
        title: t('errorOccurred'),
        description: t('fillDateAndTime'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);

      // Check if this is a reschedule (interview already exists) or new scheduling
      const isReschedule = nextStageToSchedule.scheduledAt;

      if (isReschedule && nextStageToSchedule.interviewId) {
        // Update existing interview using reschedule endpoint
        await apiRequest('PUT', `/api/interviews/${nextStageToSchedule.interviewId}/reschedule`, {
          newDateTime: scheduledAt.toISOString(),
        });

        toast({
          title: t('interviewRescheduled'),
          description: `${t('interviewerLabel')} ${nextStageToSchedule.interviewer?.fullName || t('willReceive')} ${t('interviewNotification')}${t('candidateNotifiedReschedule')}`,
        });
      } else if (isReschedule && !nextStageToSchedule.interviewId) {
        // If there's a scheduled time but no interview ID, we need to find and update the interview
        // This is a fallback for cases where the interview ID is missing
        const interviewsResponse = await fetch(`/api/interviews?stageId=${nextStageToSchedule.id}`, {
          credentials: 'include',
        });
        if (interviewsResponse.ok) {
          const interviews = await interviewsResponse.json();
          const existingInterview = interviews.find((i: any) => i.stageId === nextStageToSchedule.id);

          if (existingInterview) {
            await apiRequest('PUT', `/api/interviews/${existingInterview.id}/reschedule`, {
              newDateTime: scheduledAt.toISOString(),
            });

            toast({
              title: t('interviewRescheduled'),
              description: `${t('interviewerLabel')} ${nextStageToSchedule.interviewer?.fullName || t('willReceive')} ${t('interviewNotification')}${t('candidateNotifiedReschedule')}`,
            });
          } else {
            // If no interview found, create new one
            await apiRequest('POST', '/api/interviews', {
              stageId: nextStageToSchedule.id,
              candidateId: candidate.id,
              interviewerId: nextStageToSchedule.interviewerId,
              scheduledAt: scheduledAt.toISOString(),
              duration: 30,
              notes: `${t('interviewFor')} "${nextStageToSchedule.stageName}" ${t('withCandidate')} ${candidate.fullName}`,
            });

            toast({
              title: t('interviewScheduled'),
              description: `${t('interviewerLabel')} ${nextStageToSchedule.interviewer?.fullName || t('willReceive')} ${t('interviewNotification')}`,
            });
          }
        }
      } else {
        // Create new interview record
        await apiRequest('POST', '/api/interviews', {
          stageId: nextStageToSchedule.id,
          candidateId: candidate.id,
          interviewerId: nextStageToSchedule.interviewerId,
          scheduledAt: scheduledAt.toISOString(),
          duration: 30,
          notes: `${t('interviewFor')} "${nextStageToSchedule.stageName}" ${t('withCandidate')} ${candidate.fullName}`,
        });

        toast({
          title: t('interviewScheduled'),
          description: `${t('interviewerLabel')} ${nextStageToSchedule.interviewer?.fullName || t('willReceive')} ${t('interviewNotification')}`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/interviews/interviewer'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/interview-stages/candidate', candidate.id] });

      setShowScheduleInterview(false);
      setScheduledDate('');
      setScheduledTime('');
    } catch (error: any) {
      toast({
        title: t('errorOccurred'),
        description: error.message || t('failedToScheduleInterview'),
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className={getCardStyling()} onClick={() => setShowDetailsModal(true)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <CandidatePhoto
                    photoUrl={candidate.photoUrl}
                    name={candidate.fullName}
                    size="md"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {candidate.fullName}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {candidate.email}
                      </div>
                      {candidate.phone && (
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {candidate.phone}
                        </div>
                      )}
                      {candidate.city && (
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {candidate.city}
                        </div>
                      )}
                    </div>
                    {candidate.createdByUser && (
                      <div className="flex items-center text-xs text-slate-500 mt-1">
                        <User className="h-3 w-3 mr-1" />
                        {t('responsible')}: {candidate.createdByUser.fullName} ({candidate.createdByUser.position})
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(candidate.status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setShowEditModal(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {isAdmin() && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCandidate();
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Interview Stage Progress */}
              {(typedStages.length > 0 || candidate.interviewStageChain?.length > 0) && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700">{t('interviewStages')}:</h4>
                    <span className="text-xs text-slate-500">
                      {Math.min(candidate.currentStageIndex, typedStages.length > 0 ? typedStages.length : candidate.interviewStageChain?.length || 0)} {t('of')} {typedStages.length > 0 ? typedStages.length : candidate.interviewStageChain?.length || 0}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    {(typedStages.length > 0 ? typedStages : candidate.interviewStageChain || []).map((stage: any, index: number) => {
                      // Use stages data if available, otherwise fallback to candidate.interviewStageChain
                      const stageInfo = typedStages.length > 0 ? stage : stage;
                      const stageName = typedStages.length > 0 ? stage.stageName : stage.stageName;
                      const stageLabel = stageInfo?.status ? `${stageName} (${stageInfo.status})` : stageName;

                      return (
                        <div key={index} className="flex items-center">
                          <div
                            title={stageLabel}
                            className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                            ${index < candidate.currentStageIndex
                              ? 'bg-green-100 text-green-700'
                              : index === candidate.currentStageIndex
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-500'
                            }
                          `}
                          >
                            {index < candidate.currentStageIndex ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          {index < (typedStages.length > 0 ? typedStages.length : candidate.interviewStageChain?.length || 0) - 1 && (
                            <ArrowRight className="h-3 w-3 mx-1 text-gray-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Current Stage Info */}
                  {currentStage && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {t('currentStage')}: {currentStage.stageName}
                          </p>
                          <p className="text-xs text-blue-700">
                            <User className="inline h-3 w-3 mr-1" />
                            {t('interviewer')}: {currentStage.interviewer?.fullName || t('notAssigned')}
                          </p>
                          {currentStage.scheduledAt && (
                            <p className="text-xs text-blue-600 mt-1">
                              <Calendar className="inline h-3 w-3 mr-1" />
                              {t('scheduled')}: {new Date(currentStage.scheduledAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')} {new Date(currentStage.scheduledAt).toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          {!currentStage.scheduledAt && isCreator && (
                            <p className="text-xs text-orange-600 mt-1">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {t('needScheduleInterview')}
                            </p>
                          )}
                          {!currentStage.scheduledAt && !isCreator && (
                            <p className="text-xs text-gray-600 mt-1">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {t('onlyResponsibleManager')}
                            </p>
                          )}
                        </div>
                        {nextStage && (
                          <div className="text-right">
                            <p className="text-xs text-blue-600">
                              {t('next')}: {nextStage.stageName}
                            </p>
                            <p className="text-xs text-blue-500">
                              {nextStage.interviewer?.fullName || t('notAssigned')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interview Feedback History */}
              {typedStages.length > 0 && typedStages.some((stage: any) => stage.comments && stage.status === 'passed') && (
                <div className="mb-4">
                  <button
                    className="flex items-center text-sm font-medium text-slate-700 hover:text-slate-900 mb-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFeedbackHistory(!showFeedbackHistory);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t('interviewFeedbackHistory')}
                    {showFeedbackHistory ? (
                      <ChevronUp className="h-4 w-4 ml-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </button>

                  {showFeedbackHistory && (
                    <div className="space-y-2">
                      {typedStages
                        .filter((stage: any) => stage.comments && stage.status === 'passed')
                        .map((stage: any) => (
                          <div key={stage.id} className="bg-green-50 p-3 rounded-lg border-l-4 border-green-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-green-800">
                                {stage.stageName}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-green-600">
                                  {stage.interviewer?.fullName}
                                </span>
                                {canEditFeedback(stage) && editingFeedback !== stage.id && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEditFeedback(stage);
                                    }}
                                    className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveFeedback(stage.id);
                                    }}
                                    disabled={updateFeedbackMutation.isPending}
                                    className="h-7 text-xs"
                                  >
                                    <Save className="h-3 w-3 mr-1" />{t('save')}</Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelEditFeedback();
                                    }}
                                    className="h-7 text-xs"
                                  >
                                    <X className="h-3 w-3 mr-1" />{t('cancel')}</Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-green-700 whitespace-pre-wrap">
                                {stage.comments}
                              </p>
                            )}

                            {stage.completedAt && editingFeedback !== stage.id && (
                              <div className="text-xs text-green-600 mt-1">
                                {t('left')}: {new Date(stage.completedAt).toLocaleDateString()} {t('at')} {new Date(stage.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {candidate.status === 'active' && (
                <div className="flex items-center space-x-2">
                  {/* Schedule Interview Button - only for creator when stage not scheduled */}
                  {isCreator && currentStage && !currentStage.scheduledAt && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNextStageToSchedule(currentStage);
                        setShowScheduleInterview(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      {t('scheduleInterview')}
                    </Button>
                  )}

                  {/* Approve/Reject Buttons - only for current stage interviewer */}
                  {isCurrentStageManager && canApprove && currentStage && currentStage.scheduledAt && (
                    <>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove();
                        }}
                        disabled={markInterviewConductedMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('approve')}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject();
                        }}
                        disabled={rejectCandidateMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {t('reject')}
                      </Button>
                    </>
                  )}

                  {/* Reschedule Button - for everyone else when interview is scheduled */}
                  {(!isCurrentStageManager || !canApprove) && currentStage && currentStage.scheduledAt && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNextStageToSchedule(currentStage);
                        setShowScheduleInterview(true);
                      }}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      {t('reschedule')}
                    </Button>
                  )}
                </div>
              )}

              {/* Hire Button - if all stages completed */}
              {candidate.status === 'active' && typedStages.length > 0 &&
                typedStages.every((stage: any) => stage.status === 'passed') && (
                  <div className="mt-4">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle hire candidate
                        const hireMutation = {
                          mutate: async () => {
                            await apiRequest('PUT', `/api/candidates/${candidate.id}`, {
                              status: 'hired'
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
                            toast({
                              title: t('candidateHired'),
                              description: t('candidateHiredSuccess'),
                            });
                          }
                        };
                        hireMutation.mutate();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {t('hireCandidate')}
                    </Button>
                  </div>
                )}

              {/* Additional Info */}
              <div className="flex items-center justify-between text-xs text-slate-500 mt-4">
                <div className="flex items-center space-x-4">
                  {candidate.source && (
                    <span>{t('source')}: {candidate.source}</span>
                  )}
                  {candidate.resumeUrl && (
                    <div className="flex items-center">
                      <FileText className="h-3 w-3 mr-1" />
                      <a
                        href={candidate.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {t('resume')}
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(candidate.createdAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Interview Dialog */}
      <Dialog open={showScheduleInterview} onOpenChange={setShowScheduleInterview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('scheduleNextStage')}</DialogTitle>
            <DialogDescription>
              {nextStageToSchedule ? (
                <>{t('planningStage')} "{nextStageToSchedule.stageName}" {t('for')} {candidate.fullName}</>
              ) : (
                <>{t('planningNextStage')} {candidate.fullName}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('interviewDate')}</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
              />
            </div>

            <div>
              <Label>{t('time')}</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleInterview(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleScheduleNextStage}>
              {t('schedule')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('rejectCandidate')}</DialogTitle>
            <DialogDescription>
              {t('specifyRejectionReason')} {candidate.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('rejectionReason')}</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('specifyRejectionPlaceholder')}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectionReason.trim()) {
                  toast({
                    title: t('errorOccurred'),
                    description: t('feedbackRequired'),
                    variant: 'destructive',
                  });
                  return;
                }
                rejectInterviewStageMutation.mutate({
                  stageId: currentStage.id,
                  feedback: rejectionReason
                });
              }}
              disabled={rejectInterviewStageMutation.isPending}
            >
              {t('reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('approveCandidate')}</DialogTitle>
            <DialogDescription>
              {t('provideFeedbackForApproval')} {candidate.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('approvalFeedback')}</Label>
              <Textarea
                value={approvalFeedback}
                onChange={(e) => setApprovalFeedback(e.target.value)}
                placeholder={t('provideDetailedFeedback')}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowApproveDialog(false);
              setApprovalFeedback('');
            }}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => {
                if (!approvalFeedback.trim()) {
                  toast({
                    title: t('errorOccurred'),
                    description: t('feedbackRequired'),
                    variant: 'destructive',
                  });
                  return;
                }
                markInterviewConductedMutation.mutate({
                  stageId: currentStage.id,
                  feedback: approvalFeedback
                });
                setShowApproveDialog(false);
                setApprovalFeedback('');
              }}
              disabled={markInterviewConductedMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {t('approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Candidate Modal */}
      <EditCandidateModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        candidate={candidate}
      />

      {/* Candidate Details Modal */}
      <CandidateDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        candidate={candidate}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">{t('deleteCandidate')}</DialogTitle>
            <DialogDescription>
              {t('deleteCandidateConfirmation')} <strong>{candidate.fullName}</strong>?
              <br /><br />
              <span className="text-red-600 font-medium">{t('deleteCandidateWarning')}</span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCandidate}
            >
              {t('deleteCandidate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
