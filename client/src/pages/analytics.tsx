import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { canAccessReports } from '@/lib/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';

interface PeriodData {
  year: number;
  month: number;
  monthName: string;
}

interface HiredDismissedStats {
  totalHired: number;
  totalDismissed: number;
  currentlyEmployed: number;
}

interface HiredDismissedData {
  month: string;
  year: number;
  hired: number;
  dismissed: number;
}

interface TimeToHireStats {
  averageDays: number;
  fastest: number;
  median: number;
  slowest: number;
}

interface RejectionStageData {
  stage: string;
  stageName: string;
  rejections: number;
}
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Calendar,
  Clock,
  UserCheck,
  Building,
  Target,
  Activity,
  CheckCircle,
  XCircle,
  CalendarIcon,
  Shield,
  AlertTriangle,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Analytics() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Check if user has analytics access
  if (!user || !canAccessReports(user)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">{t('accessDenied')}</h3>
            <p className="text-slate-500 mb-4">
              {t('analyticsAccessDenied')}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{t('contactAdminForAccess')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Get available periods from the database
  const { data: availablePeriods = [], isLoading: periodsLoading, error: periodsError } = useQuery({
    queryKey: ['/api/analytics/available-periods'],
    retry: (failureCount, error: { status?: number }) => {
      // Don't retry if it's a 403 Forbidden error
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });

  // Set default values when periods are loaded
  useEffect(() => {
    if (!selectedMonth && !selectedYear) {
      const today = new Date();
      const currentYear = today.getFullYear().toString();
      const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');

      if ((availablePeriods as any[]).length > 0) {
        // Use actual data periods if available
        const latest = (availablePeriods as any[])[0];
        setSelectedMonth(latest.month);
        setSelectedYear(latest.year);
      } else {
        // Fallback to current month if no data
        setSelectedMonth(currentMonth);
        setSelectedYear(currentYear);
      }
    }
  }, [availablePeriods, selectedMonth, selectedYear]);

  // Get unique years and months - provide fallbacks if no data
  const getCurrentYearAndMonths = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1].map(y => y.toString());

    const monthNames = [
      t('january'), t('february'), t('march'), t('april'), t('may'), t('june'),
      t('july'), t('august'), t('september'), t('october'), t('november'), t('december')
    ];

    const months = Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString().padStart(2, '0'),
      label: monthNames[i]
    }));

    return { years, months };
  };

  const availableYears = (availablePeriods as PeriodData[]).length > 0 ?
    [...new Set((availablePeriods as PeriodData[]).map((p: PeriodData) => p.year.toString()))].sort().reverse() :
    getCurrentYearAndMonths().years;

  const availableMonths = (availablePeriods as PeriodData[]).length > 0 && selectedYear ?
    (availablePeriods as PeriodData[])
      .filter((p: PeriodData) => p.year.toString() === selectedYear)
      .map((p: PeriodData) => ({ value: p.month.toString(), label: p.monthName })) :
    getCurrentYearAndMonths().months;

  // Current time data (general)
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/analytics/dashboard'],
    retry: (failureCount, error: { status?: number }) => {
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });

  // Month-specific data - only fetch if we have selected period
  const { data: monthlyDashboardStats, isLoading: monthlyStatsLoading, error: monthlyStatsError } = useQuery({
    queryKey: ['/api/analytics/dashboard-by-month', selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/dashboard-by-month?month=${selectedMonth}&year=${selectedYear}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedMonth && !!selectedYear,
    retry: (failureCount, error: { message?: string }) => {
      if (error?.message?.includes('403')) return false;
      return failureCount < 2;
    },
  });

  const { data: monthlyConversionFunnel, isLoading: monthlyFunnelLoading, error: monthlyFunnelError } = useQuery({
    queryKey: ['/api/analytics/conversion-funnel-by-month', selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/conversion-funnel-by-month?month=${selectedMonth}&year=${selectedYear}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedMonth && !!selectedYear,
    retry: (failureCount, error: { message?: string }) => {
      if (error?.message?.includes('403')) return false;
      return failureCount < 2;
    },
  });

  const { data: monthlyRejectionsByStage, isLoading: monthlyRejectionsLoading, error: monthlyRejectionsError } = useQuery({
    queryKey: ['/api/analytics/rejections-by-stage', selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/rejections-by-stage?month=${selectedMonth}&year=${selectedYear}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedMonth && !!selectedYear,
    retry: (failureCount, error: { message?: string }) => {
      if (error?.message?.includes('403')) return false;
      return failureCount < 2;
    },
  });

  const { data: hiringTrends = [], isLoading: trendsLoading, error: trendsError } = useQuery({
    queryKey: ['/api/analytics/hiring-trends'],
    retry: (failureCount, error: { message?: string; status?: number }) => {
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });

  // Hired and dismissed analytics
  const { data: hiredDismissedStats = {} as HiredDismissedStats, isLoading: hiredDismissedLoading, error: hiredDismissedError } = useQuery<HiredDismissedStats>({
    queryKey: ['/api/analytics/hired-dismissed-stats'],
    retry: (failureCount, error: { message?: string; status?: number }) => {
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });

  const { data: hiredDismissedByMonth = [] as HiredDismissedData[], isLoading: hiredDismissedMonthLoading, error: hiredDismissedMonthError } = useQuery<HiredDismissedData[]>({
    queryKey: ['/api/analytics/hired-dismissed-by-month'],
    retry: (failureCount, error: { message?: string; status?: number }) => {
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });

  const { data: hiredDismissedByYear = [] as HiredDismissedData[], isLoading: hiredDismissedYearLoading, error: hiredDismissedYearError } = useQuery<HiredDismissedData[]>({
    queryKey: ['/api/analytics/hired-dismissed-by-year'],
    retry: (failureCount, error: { message?: string; status?: number }) => {
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });

  const { data: departmentStats = [], isLoading: deptLoading, error: deptError } = useQuery({
    queryKey: ['/api/analytics/department-stats'],
    retry: (failureCount, error: { message?: string; status?: number }) => {
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });

  const { data: timeToHireStats = {} as TimeToHireStats, isLoading: timeLoading, error: timeError } = useQuery<TimeToHireStats>({
    queryKey: ['/api/analytics/time-to-hire'],
    retry: (failureCount, error: { message?: string; status?: number }) => {
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
  });

  // Use monthly data when available, fallback to general data
  const displayDashboardStats = monthlyDashboardStats || dashboardStats;
  const displayConversionFunnel = monthlyConversionFunnel;
  const displayRejectionsByStage = monthlyRejectionsByStage;

  // Check for any errors that indicate access issues
  const hasAccessError = periodsError || statsError || monthlyStatsError ||
    monthlyFunnelError || monthlyRejectionsError ||
    trendsError || deptError || timeError;

  if (hasAccessError) {
    const errorMessage = (hasAccessError as { message?: string })?.message || 'Unknown error';
    const isAccessDenied = errorMessage.includes('403') || errorMessage.includes('Forbidden');

    if (isAccessDenied) {
      return (
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">{t('accessDenied')}</h3>
              <p className="text-slate-500 mb-4">
                {t('analyticsAccessDenied')}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{t('contactAdminForAccess')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    } else {
      return (
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">{t('errorLoadingData')}</h3>
              <p className="text-slate-500 mb-4">
                {t('analyticsDataLoadError')}
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{errorMessage}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (statsLoading || monthlyStatsLoading || monthlyFunnelLoading || trendsLoading || deptLoading || timeLoading || monthlyRejectionsLoading || periodsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const dashboardMetrics = [
    {
      title: t('activeVacanciesMetric'),
      value: displayDashboardStats?.activeVacancies || 0,
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('activeCandidatesMetric'),
      value: displayDashboardStats?.activeCandidates || 0,
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: t('monthlyInterviews'),
      value: displayDashboardStats?.monthlyInterviews || displayDashboardStats?.todayInterviews || 0,
      icon: Calendar,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: t('hiredThisMonthMetric'),
      value: displayDashboardStats?.hiredThisMonth || 0,
      icon: UserCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  // ONLY Dynamic stages - no "Applications" or "Hired"
  const funnelData = (displayConversionFunnel?.stages || []).map((stage: { stageNumber?: number; count?: number }, index: number) => ({
    name: `${stage.stageNumber || index + 1} ${t('stage')}`, // Format with translation, use index as fallback
    value: stage.count || 0,
    fill: COLORS[index % COLORS.length]
  }));

  const conversionRates = funnelData.map((item: { name: string; value: number; fill: string }, index: number) => {
    const totalApplications = funnelData[0].value;

    // If no applications, all stages should show 0%
    if (totalApplications === 0) {
      return { ...item, rate: 0 };
    }

    // Applications stage shows 100% only when there are actual applications
    if (index === 0) {
      return { ...item, rate: 100 };
    }

    // Other stages show percentage relative to total applications
    const rate = (item.value / totalApplications) * 100;
    return { ...item, rate: Math.round(rate * 10) / 10 };
  });

  const hiringTrendData = (hiringTrends as any[]) || [];
  const departmentData = (departmentStats as any[]) || [];
  const avgTimeToHire = timeToHireStats?.averageDays || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('analyticsAndReports')}</h1>
          <p className="text-sm text-slate-500">
            {t('trackRecruitmentPerformance')}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-slate-500" />
            <Select value={selectedYear} onValueChange={(year) => {
              setSelectedYear(year);
              // Reset month when year changes and set to first available month for that year
              if ((availablePeriods as PeriodData[]).length > 0) {
                const firstMonthInYear = (availablePeriods as PeriodData[]).find((p: PeriodData) => p.year.toString() === year);
                if (firstMonthInYear) {
                  setSelectedMonth(firstMonthInYear.month.toString());
                } else {
                  setSelectedMonth('01'); // Fallback to January
                }
              } else {
                setSelectedMonth('01'); // Fallback to January
              }
            }}>
              <SelectTrigger className="w-20">
                <SelectValue placeholder={t('year')} />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('month')} />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month.value} value={String(month.value)}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-slate-500" />
            <span className="text-sm text-slate-600">
              {selectedMonth && selectedYear ?
                `${availableMonths.find(m => m.value === selectedMonth)?.label} ${selectedYear}` :
                t('selectPeriod')
              }
            </span>
          </div>

          {(availablePeriods as any[]).length === 0 && (
            <div className="flex items-center space-x-2 bg-amber-50 px-3 py-1 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-amber-700">
                {t('noDataAvailable')}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {dashboardMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{metric.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>{t('conversionFunnel')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversionRates.map((stage: { name: string; value: number; rate: number; fill: string }, index: number) => (
                <div key={stage.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{stage.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-600">{stage.value}</span>
                      <Badge variant="secondary" className="text-xs">
                        {stage.rate}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={stage.rate} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time to Hire */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>{t('timeToHire')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {avgTimeToHire}
              </div>
              <p className="text-sm text-slate-600">{t('averageDaysToHire')}</p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-emerald-600">
                    {timeToHireStats?.fastest || 0}
                  </div>
                  <p className="text-xs text-slate-600">{t('fastest')}</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-amber-600">
                    {timeToHireStats?.median || 0}
                  </div>
                  <p className="text-xs text-slate-600">{t('median')}</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-600">
                    {timeToHireStats?.slowest || 0}
                  </div>
                  <p className="text-xs text-slate-600">{t('slowest')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hiring Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>{t('hiringTrends')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hiringTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hiringTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="hired"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="applications"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>{t('noTrendDataAvailable')}</p>
                  <p className="text-xs">{t('trendDataWillAppear')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>{t('hiringByDepartment')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <div className="text-center">
                  <Building className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>{t('noDepartmentDataAvailable')}</p>
                  <p className="text-xs">{t('departmentDataWillAppear')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>{t('keyInsights')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 mb-2">
                {displayConversionFunnel?.applications > 0
                  ? Math.round((displayConversionFunnel.hired / displayConversionFunnel.applications) * 100 * 10) / 10
                  : 0
                }%
              </div>
              <p className="text-sm text-slate-600">{t('monthlyConversionRate')}</p>
              <p className="text-xs text-slate-500 mt-1">
                {t('fromApplicationToHire')}
              </p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {displayDashboardStats?.monthlyInterviews || displayDashboardStats?.todayInterviews || 0}
              </div>
              <p className="text-sm text-slate-600">{t('monthlyInterviews')}</p>
              <p className="text-xs text-slate-500 mt-1">
                {t('scheduledForSelectedMonth')}
              </p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {displayDashboardStats?.activeVacancies || 0}
              </div>
              <p className="text-sm text-slate-600">{t('openPositions')}</p>
              <p className="text-xs text-slate-500 mt-1">
                {t('currentlyHiringFor')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hired and Dismissed Analytics */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5" />
              <span>{t('hiredAndDismissedAnalytics')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">
                  {hiredDismissedStats?.totalHired || 0}
                </div>
                <p className="text-sm text-slate-600">{t('totalHiredCandidates')}</p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {hiredDismissedStats?.totalDismissed || 0}
                </div>
                <p className="text-sm text-slate-600">{t('totalDismissedCandidates')}</p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {hiredDismissedStats?.currentlyEmployed || 0}
                </div>
                <p className="text-sm text-slate-600">{t('currentlyEmployed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Hiring and Dismissal Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>{t('monthlyHiringTrends')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hiredDismissedByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hiredDismissedByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="monthName"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      value,
                      name === 'hired' ? t('hiredEmployees') :
                        name === 'dismissed' ? t('dismissedEmployees') :
                          name === 'netChange' ? t('netChange') : name
                    ]}
                  />
                  <Bar dataKey="hired" fill="#10b981" name="hired" />
                  <Bar dataKey="dismissed" fill="#ef4444" name="dismissed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>{t('noDataAvailable')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Yearly Hiring and Dismissal Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>{t('yearlyHiringTrends')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hiredDismissedByYear.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hiredDismissedByYear}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      value,
                      name === 'hired' ? t('hiredEmployees') :
                        name === 'dismissed' ? t('dismissedEmployees') :
                          name === 'netChange' ? t('netChange') : name
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="hired"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="dismissed"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netChange"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>{t('noDataAvailable')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rejections by Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <XCircle className="h-5 w-5" />
            <span>{t('rejectionsByStage')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayRejectionsByStage && displayRejectionsByStage.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={displayRejectionsByStage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${t('stage')} ${value}`}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} ${t('rejections')}`,
                      props.payload.stageName
                    ]}
                    labelFormatter={(label) => `${t('stage')} ${label}`}
                  />
                  <Bar dataKey="rejections" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-1 gap-2">
                {displayRejectionsByStage.map((stage: RejectionStageData) => (
                  <div key={stage.stage} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm font-medium">{stage.stageName}</span>
                    <Badge variant={stage.rejections > 0 ? "destructive" : "secondary"}>
                      {stage.rejections} {t('rejections')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noRejectionData')}</h3>
              <p className="text-slate-500">
                {t('rejectionDataWillAppear')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}