import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { canApproveInterview } from '@/lib/auth';
import {
  Clock,
  User,
  CheckCircle,
  XCircle,
  RotateCcw,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Star,
} from 'lucide-react';
import {
  format,
  addDays,
  startOfWeek,
  isToday,
  parseISO,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  getDay,
  startOfDay,
  endOfDay,
  isWithinInterval
} from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { devLog } from '@/lib/debug';

// Google Calendar-style Interview Event Component
function InterviewEvent({ interview, onClick }: { interview: any; onClick: () => void }) {
  const { t } = useTranslation();
  const scheduledTime = parseISO(interview.scheduledAt);
  const statusColors = {
    scheduled: 'bg-blue-500 border-blue-600',
    completed: 'bg-green-500 border-green-600',
    cancelled: 'bg-red-500 border-red-600',
    rescheduled: 'bg-yellow-500 border-yellow-600',
  };

  return (
    <div
      onClick={onClick}
      className={`text-white text-xs p-1 mb-1 rounded border-l-4 cursor-pointer hover:shadow-md transition-shadow ${statusColors[interview.status as keyof typeof statusColors] || statusColors.scheduled
        }`}
    >
      <div className="font-medium truncate">
        {format(scheduledTime, 'HH:mm')} {interview.candidate?.fullName}
      </div>
      <div className="opacity-90 truncate">
        {interview.stage?.stageName} {t('stage')}
      </div>
    </div>
  );
}

// Month view component
function MonthView({
  currentDate,
  interviews,
  onInterviewClick
}: {
  currentDate: Date;
  interviews: any[];
  onInterviewClick: (interview: any) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 1 }), 6);

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const getInterviewsForDate = (date: Date) => {
    const interval = { start: startOfDay(date), end: endOfDay(date) };
    const dayInterviews = interviews.filter((interview: any) => {
      if (!interview.scheduledAt) return false;
      if (interview.status === 'completed') return false; // Hide completed interviews
      try {
        return isWithinInterval(parseISO(interview.scheduledAt), interval);
      } catch (error) {
        devLog('Error parsing date:', interview.scheduledAt, error);
        return false;
      }
    });

    if (dayInterviews.length > 0) {
      devLog(`Found ${dayInterviews.length} interviews for ${format(date, 'yyyy-MM-dd')}:`, dayInterviews);
    }

    return dayInterviews;
  };

  const { t } = useTranslation();
  const weekDays = [t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday'), t('sunday')];

  return (
    <div className="bg-white rounded-lg border">
      {/* Header with weekdays */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div key={day} className="p-3 text-center font-medium text-gray-600 border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((date, index) => {
          const dayInterviews = getInterviewsForDate(date);
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isCurrentDay = isToday(date);
          const dayOfWeek = getDay(date);
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          return (
            <div
              key={date.toISOString()}
              data-index={index}
              className={`min-h-32 p-2 border-r border-b last:border-r-0 ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                } ${isCurrentDay ? 'bg-blue-50' : ''} ${isWeekend ? 'bg-slate-50' : ''}`}
            >
              <div className={`text-sm mb-1 ${isCurrentDay ? 'text-blue-600 font-bold' : ''}`}>
                {format(date, 'd')}
              </div>
              {dayInterviews.length >= 3 && (
                <Star className="h-3 w-3 text-amber-500 mb-1" />
              )}
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {dayInterviews.map((interview) => (
                  <InterviewEvent
                    key={interview.id}
                    interview={interview}
                    onClick={() => onInterviewClick(interview)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Interview Details Modal
function InterviewDetailsModal({
  interview,
  isOpen,
  onClose,
  onReschedule,
  onUpdateOutcome,
  currentUser
}: {
  interview: any;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (newDateTime: string) => void;
  onUpdateOutcome: (outcome: 'passed' | 'failed', notes: string) => void;
  currentUser: any;
}) {
  const { t, language } = useTranslation();
  const locale = language === 'ru' ? ru : enUS;
  const [notes, setNotes] = useState(interview?.notes || '');
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDateTime, setNewDateTime] = useState('');

  if (!interview) return null;

  const scheduledTime = parseISO(interview.scheduledAt);
  const canApprove = canApproveInterview(currentUser, interview.interviewerId);

  const handleReschedule = () => {
    onReschedule(newDateTime);
    setShowReschedule(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="interview-details-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('interviewWithCandidate')}: {interview.candidate?.fullName}
          </DialogTitle>
        </DialogHeader>
        <div id="interview-details-description" className="sr-only">
          {t('interviewInfo')} {t('withCandidate')} {interview.candidate?.fullName}
        </div>

        <div className="space-y-6">
          {/* Interview Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('interviewInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{format(scheduledTime, t('dateFormatWithTime'), { locale })}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span>{interview.stage?.stageName} {t('stage')}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span>{t('interviewerLabel')}: {interview.interviewer?.fullName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={
                  interview.status === 'completed' ? 'default' :
                    interview.status === 'scheduled' ? 'secondary' :
                      interview.status === 'cancelled' ? 'destructive' : 'outline'
                }>
                  {interview.status === 'scheduled' && t('scheduled')}
                  {interview.status === 'completed' && t('completed')}
                  {interview.status === 'cancelled' && t('cancelled')}
                  {interview.status === 'rescheduled' && t('rescheduled')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Candidate Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('candidateCard')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('fullName')}</Label>
                  <p className="font-medium">{interview.candidate?.fullName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t('position')}</Label>
                  <p>{interview.vacancy?.title}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{interview.candidate?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{interview.candidate?.phone}</span>
                </div>
              </div>
              {interview.candidate?.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{interview.candidate?.city}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('addInterviewNotes')}
              rows={4}
            />
          </div>

          {/* Reschedule section */}
          {showReschedule && (
            <div className="space-y-2">
              <Label htmlFor="reschedule">{t('newTime')}</Label>
              <Input
                id="reschedule"
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            {interview.status === 'scheduled' && canApprove && (
              <>
                <Button
                  onClick={() => onUpdateOutcome('passed', notes)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('approve')}
                </Button>
                <Button
                  onClick={() => onUpdateOutcome('failed', notes)}
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {t('reject')}
                </Button>
              </>
            )}
            {interview.status === 'scheduled' && canApprove && (
              <>
                <Button
                  onClick={() => {
                    setShowReschedule(!showReschedule);
                    if (!showReschedule) {
                      setNewDateTime(format(scheduledTime, "yyyy-MM-dd'T'HH:mm"));
                    }
                  }}
                  variant="outline"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {showReschedule ? t('cancel') : t('reschedule')}
                </Button>
                {showReschedule && (
                  <Button onClick={handleReschedule}>
                    {t('save')}
                  </Button>
                )}
              </>
            )}
            {interview.status === 'scheduled' && !canApprove && (
              <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                {t('onlyInterviewerOrAdminCanManage')}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GoogleCalendar() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get locale based on current language
  const locale = language === 'en' ? enUS : ru;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  const [selectedInterviewerId, setSelectedInterviewerId] = useState<number | null>(null);

  // Set current user as default interviewer when user loads
  useEffect(() => {
    if (user?.id && !selectedInterviewerId) {
      setSelectedInterviewerId(user.id);
    }
  }, [user?.id, selectedInterviewerId]);

  const { data: interviews = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/interviews/interviewer', selectedInterviewerId],
    enabled: !!selectedInterviewerId,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: !!user?.id,
  });

  const { data: candidates = [] } = useQuery<any[]>({
    queryKey: ['/api/candidates'],
    enabled: !!user?.id,
  });

  const updateOutcomeMutation = useMutation({
    mutationFn: ({ outcome, notes }: { outcome: 'passed' | 'failed'; notes: string }) => {
      // Validate that feedback is provided
      if (!notes || notes.trim() === '') {
        throw new Error(t('feedbackRequired'));
      }
      return apiRequest('PUT', `/api/interviews/${selectedInterview.id}/outcome`, { outcome, notes });
    },
    onSuccess: () => {
      // Инвалидируем все связанные кеши
      queryClient.invalidateQueries({ queryKey: ['/api/interviews/interviewer'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      if (selectedInterview?.candidateId) {
        queryClient.invalidateQueries({
          queryKey: ['/api/interview-stages/candidate', selectedInterview.candidateId]
        });
      }
      setShowInterviewModal(false);
      toast({
        title: t('resultSaved'),
        description: t('interviewResultUpdated'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('errorOccurred'),
        description: error.message || t('failedToSaveResult'),
        variant: 'destructive',
      });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: (newDateTime: string) =>
      apiRequest('PUT', `/api/interviews/${selectedInterview.id}/reschedule`, { newDateTime }),
    onSuccess: () => {
      // Invalidate all relevant queries to ensure synchronization
      queryClient.invalidateQueries({ queryKey: ['/api/interviews/interviewer'] });
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      if (selectedInterview?.candidateId) {
        queryClient.invalidateQueries({
          queryKey: ['/api/interview-stages/candidate', selectedInterview.candidateId]
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      setShowInterviewModal(false);
      toast({
        title: t('interviewRescheduled'),
        description: t('interviewTimeChanged'),
      });
    },
    onError: () => {
      toast({
        title: t('errorOccurred'),
        description: t('failedToReschedule'),
        variant: 'destructive',
      });
    },
  });

  const handleInterviewClick = (interview: any) => {
    // Добавляем информацию о кандидате и вакансии
    const candidate = candidates.find((c: any) => c.id === interview.candidateId);
    const enrichedInterview = {
      ...interview,
      candidate,
    };
    setSelectedInterview(enrichedInterview);
    setShowInterviewModal(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev =>
      direction === 'next' ? addWeeks(prev, 4) : subWeeks(prev, 4)
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{t('calendarTitle')}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-medium min-w-[200px] text-center">
              {format(currentDate, 'LLLL yyyy', { locale })}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <Select
              value={selectedInterviewerId?.toString() || ''}
              onValueChange={(value) => setSelectedInterviewerId(parseInt(value))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('selectCalendar')} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.fullName} ({user.position})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date())}
          >
            {t('today')}
          </Button>
        </div>
      </div>

      {/* Selected Calendar Info */}
      {selectedInterviewerId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">
              {t('calendar')}: {users.find((u: any) => u.id === selectedInterviewerId)?.fullName}
            </span>
            <Badge variant="secondary" className="ml-2">
              {interviews.length} {t('interviews')}
            </Badge>
          </div>
        </div>
      )}

      {/* Calendar */}
      <MonthView
        currentDate={currentDate}
        interviews={interviews}
        onInterviewClick={handleInterviewClick}
      />

      {/* Interview Details Modal */}
      <InterviewDetailsModal
        interview={selectedInterview}
        isOpen={showInterviewModal}
        onClose={() => setShowInterviewModal(false)}
        onReschedule={(newDateTime) => rescheduleMutation.mutate(newDateTime)}
        onUpdateOutcome={(outcome, notes) => updateOutcomeMutation.mutate({ outcome, notes })}
        currentUser={user}
      />
    </div>
  );
}
