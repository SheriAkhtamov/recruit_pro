import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitials } from '@/lib/auth';
import CandidateProfileModal from '@/components/modals/CandidateProfileModal';
import { CandidatePhoto } from '@/components/CandidatePhoto';
import { 
  Briefcase, 
  UserCheck, 
  CalendarDays, 
  UserPlus,
  Video,
  Handshake,
  Bus,
  Plus,
  FileText
} from 'lucide-react';

export default function Dashboard() {
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const { t } = useTranslation();

  const { data: stats = {} as any, isLoading: statsLoading } = useQuery<any>({
    queryKey: ['/api/analytics/dashboard'],
  });

  const { data: funnel = {} as any, isLoading: funnelLoading } = useQuery<any>({
    queryKey: ['/api/analytics/funnel'],
  });

  const { data: candidates = [] as any[], isLoading: candidatesLoading } = useQuery<any[]>({
    queryKey: ['/api/candidates'],
  });

  const { data: interviews = [] as any[], isLoading: interviewsLoading } = useQuery<any[]>({
    queryKey: ['/api/interviews'],
  });

  // Get interview stages for each candidate
  const { data: candidateStages = {} as Record<number, any[]> } = useQuery<any[], Error, Record<number, any[]>>({
    queryKey: ['/api/interview-stages'],
    select: (data) => {
      const stagesByCandidate: Record<number, any[]> = {};
      (data || []).forEach((stage: any) => {
        if (!stagesByCandidate[stage.candidateId]) {
          stagesByCandidate[stage.candidateId] = [];
        }
        stagesByCandidate[stage.candidateId].push(stage);
      });
      return stagesByCandidate;
    }
  });

  const { data: vacancies = [] as any[], isLoading: vacanciesLoading } = useQuery<any[]>({
    queryKey: ['/api/vacancies'],
  });

  // Process data for display
  const recentCandidates = candidates
    .filter((c: any) => c.status === 'active')
    .slice(0, 3);

  const now = new Date();
  const upcomingInterviews = interviews
    .filter((interview: any) => {
      const interviewDate = new Date(interview.scheduledAt);
      // Only show scheduled interviews that are in the future, exclude completed/cancelled ones
      return (
        interviewDate >= now &&
        interview.status === 'scheduled'
      );
    })
    .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()) // Sort by date
    .slice(0, 3);

  const activeVacancies = vacancies
    .filter((v: any) => v.status === 'active')
    .slice(0, 3);

  const getStageProgress = (candidate: any) => {
    const stages = (candidateStages as Record<number, any[]>)[candidate.id] || [];
    if (stages.length === 0) return { current: 0, total: 0 };
    
    // Count how many stages have been actually passed
    const passedStages = stages.filter((s: any) => s.status === 'passed').length;
    
    return { 
      current: passedStages, 
      total: stages.length 
    };
  };

  const getStageIcon = (index: number, progress: { current: number; total: number }) => {
    if (index < progress.current) {
      // Stage completed successfully (green)
      return <div className="w-3 h-3 bg-emerald-500 rounded-full" />;
    } else if (index === progress.current) {
      // Current stage in progress (amber)
      return <div className="w-3 h-3 bg-amber-500 rounded-full" />;
    } else {
      // Future stages not started yet (gray)
      return <div className="w-3 h-3 bg-slate-300 rounded-full" />;
    }
  };

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500">{t('totalVacancies')}</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-2xl font-semibold text-slate-900">
                    {stats?.activeVacancies || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500">{t('activeCandidates')}</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-2xl font-semibold text-slate-900">
                    {stats?.activeCandidates || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <CalendarDays className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500">{t('todayInterviews')}</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-2xl font-semibold text-slate-900">
                    {stats?.todayInterviews || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500">{t('hiredThisMonth')}</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-2xl font-semibold text-slate-900">
                    {stats?.hiredThisMonth || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500">{t('documentationCandidates')}</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-2xl font-semibold text-slate-900">
                    {stats?.documentationCandidates || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Upcoming Interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Candidates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-medium">{t('recentCandidates')}</CardTitle>
            <Link href="/candidates" className="text-sm text-primary-600 hover:text-primary-700">
              {t('viewAll')}
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            {candidatesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentCandidates.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {t('noRecentCandidates')}
              </div>
            ) : (
              recentCandidates.map((candidate: any) => {
                const progress = getStageProgress(candidate);
                return (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2"
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <div className="flex items-center">
                      <CandidatePhoto 
                        photoUrl={candidate.photoUrl} 
                        name={candidate.fullName} 
                        size="sm" 
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-slate-900">{candidate.fullName}</p>
                        <p className="text-xs text-slate-500">{candidate.vacancy?.title || t('positionTBD')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* Progress Indicator */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.max(1, progress.total) }, (_, i) => (
                          <div key={i}>
                            {getStageIcon(i, progress)}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">
                        {t('stageCount')} {progress.current}/{progress.total}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-medium">{t('upcomingInterviews')}</CardTitle>
            <Link href="/calendar" className="text-sm text-primary-600 hover:text-primary-700">
              {t('viewCalendar')}
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            {interviewsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingInterviews.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {t('noUpcomingInterviews')}
              </div>
            ) : (
              upcomingInterviews.map((interview: any, index: number) => {
                const IconComponent = index % 3 === 0 ? Video : index % 3 === 1 ? Handshake : Bus;
                const iconColor = index % 3 === 0 ? 'text-primary-600 bg-primary-100' : 
                                index % 3 === 1 ? 'text-emerald-600 bg-emerald-100' : 
                                'text-purple-600 bg-purple-100';
                
                return (
                  <div key={interview.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColor}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-slate-900">
                          {interview.candidate?.fullName || t('candidateTBD')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {interview.candidate?.vacancy?.title || t('positionTBD')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(interview.scheduledAt).toLocaleDateString([], { 
                          month: 'short', 
                          day: 'numeric' 
                        })} {t('at')} {new Date(interview.scheduledAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('with')} {interview.interviewer?.fullName || t('interviewerTBD')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-medium">{t('recruitmentFunnel')}</CardTitle>
          <p className="text-sm text-slate-500">{t('candidateProgression')}</p>
        </CardHeader>
        <CardContent className="p-6">
          {funnelLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-2 w-48" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* ONLY Dynamic stages - no "Applications" or "Hired" */}
              {(funnel?.stages || []).map((stage: any, index: number) => {
                const colors = ['bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500'];
                const color = colors[index % colors.length];
                const maxCount = Math.max(...(funnel?.stages || []).map((s: any) => s.count), 1);
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-4 h-4 ${color} rounded mr-3`}></div>
                      <span className="text-sm font-medium text-slate-700">{stage.stageNumber || index + 1} {t('stage')}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-48 bg-slate-200 rounded-full h-2 mr-4">
                        <div 
                          className={`${color} h-2 rounded-full`}
                          style={{ 
                            width: `${(stage.count / maxCount) * 100}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-slate-900">
                        {stage.count || 0}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Vacancies Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-medium">{t('activeVacancies')}</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/vacancies">
              <Plus className="h-4 w-4 mr-2" />
              {t('newVacancy')}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('position')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('department')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('candidates')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('created')}
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">{t('actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {vacanciesLoading ? (
                  Array.from({ length: 3 }, (_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-6 w-16" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-12" />
                      </td>
                    </tr>
                  ))
                ) : activeVacancies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      {t('noActiveVacancies')}
                    </td>
                  </tr>
                ) : (
                  activeVacancies.map((vacancy: any) => {
                    const candidateCount = candidates.filter(
                      (c: any) => c.vacancyId === vacancy.id
                    ).length;
                    
                    return (
                      <tr key={vacancy.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {vacancy.title}
                            </div>
                            <div className="text-sm text-slate-500">
                              {vacancy.location || t('locationTBD')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {vacancy.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {candidateCount} {t('candidatesLowercase')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            className={
                              vacancy.status === 'active' 
                                ? 'bg-emerald-100 text-emerald-800'
                                : vacancy.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-800'
                            }
                          >
                            {vacancy.status === 'active' ? t('active') :
                             vacancy.status === 'in_progress' ? t('inProgress') : t('closed')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {new Date(vacancy.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href="/vacancies" className="text-primary-600 hover:text-primary-900">
                            {t('view')}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Candidate Profile Modal */}
      {selectedCandidate && (
        <CandidateProfileModal
          open={!!selectedCandidate}
          onOpenChange={() => setSelectedCandidate(null)}
          candidate={selectedCandidate}
        />
      )}
    </div>
  );
}
