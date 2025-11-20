export interface StageCountData {
  stageIndex: number;
  stageName: string;
  count: string | number;
}

export interface DashboardStats {
  totalCandidates: number;
  activeCandidates: number;
  totalVacancies: number;
  activeVacancies: number;
  totalInterviews: number;
  scheduledInterviews: number;
  completedInterviews: number;
  hiredCandidates: number;
  rejectedCandidates: number;
}

export interface ConversionFunnelData {
  stage: string;
  count: number;
  percentage: number;
}

export interface RejectionStageData {
  stage: string;
  stageName: string;
  rejections: number;
}

export interface HiringTrendData {
  month: string;
  year: number;
  hired: number;
  rejected: number;
}

export interface HiredDismissedStats {
  totalHired: number;
  totalDismissed: number;
  currentlyEmployed: number;
}

export interface TimeToHireStats {
  averageDays: number;
  fastest: number;
  median: number;
  slowest: number;
}

export interface DepartmentStats {
  department: string;
  totalCandidates: number;
  hiredCandidates: number;
  rejectedCandidates: number;
  activeVacancies: number;
}

export interface InterviewConflictData {
  candidateId: number;
  candidateName: string;
  interviewerId: number;
  interviewerName: string;
  scheduledTime: Date;
  duration: number;
}
