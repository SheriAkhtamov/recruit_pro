import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useTranslation } from '@/hooks/useTranslation';
import { devLog } from '@/lib/debug';

interface ScheduleInterviewModalProps {
  open: boolean;
  onClose: () => void;
  candidateId: number;
  stageId: number;
  interviewerId: number;
}

export default function ScheduleInterviewModal({
  open,
  onClose,
  candidateId,
  stageId,
  interviewerId,
}: ScheduleInterviewModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedInterviewer, setSelectedInterviewer] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');

  // Get candidate's stages
  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ['/api/interview-stages/candidate', candidateId],
    enabled: !!candidateId && open,
  });

  // Get all users for interviewer selection
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const scheduleInterviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const stageIdValue = data?.stageId ?? selectedStage;
      const interviewerIdValue = data?.interviewerId ?? selectedInterviewer;
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
      return apiRequest('POST', '/api/interviews/schedule', {
        stageId: parseInt(stageIdValue),
        interviewerId: parseInt(interviewerIdValue),
        scheduledAt: scheduledAt.toISOString(),
        duration: parseInt(duration),
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/interview-stages/candidate', candidateId] });
      onClose();
      resetForm();
      toast({
        title: t('interviewScheduled'),
        description: `${t('interviewerLabel')} ${t('willReceive')} ${t('interviewNotification')}`,
      });
    },
    onError: (error: any) => {
      devLog('Schedule interview error:', error);
      const errorMessage = error.message || t('errorOccurred');
      
      // Check if it's a conflict error
      if (errorMessage.toLowerCase().includes('busy') || errorMessage.includes('занят') || errorMessage.includes('busy')) {
        toast({
          title: t('interviewerBusy'),
          description: t('selectDifferentTime'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('error'),
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
  });

  const resetForm = () => {
    setSelectedStage(stageId ? stageId.toString() : '');
    setSelectedInterviewer(interviewerId ? interviewerId.toString() : '');
    setScheduledDate('');
    setScheduledTime('');
    setDuration('30');
    setNotes('');
  };

  const handleSchedule = () => {
    if (!selectedStage || !selectedInterviewer || !scheduledDate || !scheduledTime) {
      toast({
        title: t('error'),
        description: t('fillRequiredFields'),
        variant: 'destructive',
      });
      return;
    }

    scheduleInterviewMutation.mutate({});
  };

  // Get available stages for this candidate (current and next stage)
  const availableStages = stages.filter((stage: any) => 
    !stage.completedAt || stage.status !== 'passed'
  );

  // Set default date to tomorrow
  if (!scheduledDate && open) {
    const tomorrow = addDays(new Date(), 1);
    setScheduledDate(format(tomorrow, 'yyyy-MM-dd'));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('scheduleInterview')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Candidate Info */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-medium">{t('candidate')}</h3>
                <p className="text-sm text-slate-600">{t('email')}</p>
              </div>
            </div>
          </div>

          {/* Stage Selection */}
          <div>
            <Label htmlFor="stage">{t('interviewStage')} *</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('selectStage')} />
              </SelectTrigger>
              <SelectContent>
                {availableStages.map((stage: any) => (
                  <SelectItem key={stage.id} value={stage.id.toString()}>
                    {stage.stageName} ({t('stage')} {stage.stageIndex + 1})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interviewer Selection */}
          <div>
            <Label htmlFor="interviewer">{t('interviewer')} *</Label>
            <Select value={selectedInterviewer} onValueChange={setSelectedInterviewer}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('selectInterviewer')} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.fullName} {user.email ? `(${user.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">{t('date')} *</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1"
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div>
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                {t('time')} *
              </Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="duration">{t('durationMinutes')}</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('selectDuration')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">{t('minutes15')}</SelectItem>
                <SelectItem value="30">{t('minutes30')}</SelectItem>
                <SelectItem value="45">{t('minutes45')}</SelectItem>
                <SelectItem value="60">{t('hour1')}</SelectItem>
                <SelectItem value="90">{t('hours1_5')}</SelectItem>
                <SelectItem value="120">{t('hours2')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">{t('notesOptional')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('addInterviewNotes')}
              className="mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button 
              onClick={handleSchedule}
              disabled={scheduleInterviewMutation.isPending}
              className="flex-1"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {scheduleInterviewMutation.isPending ? t('planning') : t('planInterview')}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
