import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getInitials } from '@/lib/auth';
import CandidateCard from '@/components/CandidateCard';
import CandidateProfileModal from '@/components/modals/CandidateProfileModal';
import AddCandidateModal from '@/components/modals/AddCandidateModal';

import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import type { Candidate, InterviewStage } from '@shared/schema';
import {
  Search,
  Filter,
  Users,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Trash2,
  Edit,
} from 'lucide-react';

export default function Candidates() {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showAddCandidate, setShowAddCandidate] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vacancyFilter, setVacancyFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Employees should only see candidates they are assigned to interview
  const candidatesEndpoint = user?.role === 'employee'
    ? `/api/candidates/interviewer/${user.id}`
    : '/api/candidates';

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: [candidatesEndpoint],
  });

  const { data: vacancies = [], isLoading: vacanciesLoading } = useQuery({
    queryKey: ['/api/vacancies'],
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/candidates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: t('candidateDeletedSuccessfully'),
        description: t('candidateRemovedFromSystem'),
      });
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('failedToDeleteCandidate'),
        variant: 'destructive',
      });
    },
  });

  const handleDeleteCandidate = (candidate: Candidate) => {
    if (window.confirm(`${t('confirmDeleteCandidate')} "${candidate.fullName}"? ${t('thisActionCannotBeUndone')}`)) {
      deleteCandidateMutation.mutate(candidate.id);
    }
  };

  const getStageProgress = (candidate: Candidate) => {
    // interviewStageChain may be typed as {} in schema but is actually InterviewStage[]
    const stageChain = (candidate.interviewStageChain as InterviewStage[] | undefined) || [];
    if (!stageChain || stageChain.length === 0) {
      return { current: 0, total: 0, stages: [] };
    }
    const passed = stageChain.filter((s: InterviewStage) => s.status === 'passed').length;
    const stages = stageChain.map((s: InterviewStage) => ({
      name: s.stageName,
      status: s.status,
    }));
    return { current: passed, total: stageChain.length, stages };
  };

  const filteredCandidates = (candidates as Candidate[]).filter((candidate: Candidate) => {
    // Exclude candidates in 'documentation' or 'hired' status from the main candidates section
    if (candidate.status === 'documentation' || candidate.status === 'hired') {
      return false;
    }

    const matchesSearch =
      (candidate.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (candidate.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;

    const matchesVacancy = vacancyFilter === 'all' ||
      candidate.vacancyId?.toString() === vacancyFilter;

    const matchesSource = sourceFilter === 'all' ||
      (sourceFilter === 'manual' && (!candidate.source || candidate.source !== 'Telegram'));

    return matchesSearch && matchesStatus && matchesVacancy && matchesSource;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'hired':
        return 'bg-emerald-100 text-emerald-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t('active');
      case 'hired':
        return t('hired');
      case 'rejected':
        return t('rejected');
      case 'archived':
        return t('archived');
      default:
        return status;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('candidates')}</h1>
          <p className="text-sm text-slate-500">
            {t('manageCandidateProfiles')}
          </p>
        </div>
        <Button
          onClick={() => setShowAddCandidate(true)}
          className="bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('addCandidate')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('searchCandidates')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus')}</SelectItem>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="rejected">{t('rejected')}</SelectItem>
                  <SelectItem value="archived">{t('archived')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={vacancyFilter} onValueChange={setVacancyFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('position')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allPositions')}</SelectItem>
                {(vacancies as any[]).map((vacancy: any) => (
                  <SelectItem key={vacancy.id} value={vacancy.id.toString()}>
                    {vacancy.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('source')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allSources')}</SelectItem>
                <SelectItem value="manual">📄 {t('manualEntry')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates List */}
      {candidatesLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noCandidatesFound')}</h3>
            <p className="text-slate-500 mb-4">
              {searchTerm || statusFilter !== 'all' || vacancyFilter !== 'all'
                ? t('adjustSearchCriteria')
                : t('getStartedAddCandidate')}
            </p>
            {!searchTerm && statusFilter === 'all' && vacancyFilter === 'all' && (
              <Button
                onClick={() => setShowAddCandidate(true)}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('addFirstCandidate')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCandidates.map((candidate: any) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onEdit={() => setSelectedCandidate(candidate)}
              onDelete={() => handleDeleteCandidate(candidate)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddCandidateModal
        open={showAddCandidate}
        onOpenChange={setShowAddCandidate}
      />

      {selectedCandidate && (
        <CandidateProfileModal
          open={!!selectedCandidate}
          onOpenChange={() => setSelectedCandidate(null)}
          candidate={selectedCandidate}
        />
      )}

      {/* Removed separate ScheduleInterviewModal as it's now handled in CandidateCard */}
    </div>
  );
}
