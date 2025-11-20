import { Check, X, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStage {
  id: number;
  stageIndex: number;
  stageName: string;
  status: 'pending' | 'in_progress' | 'passed' | 'failed';
  interviewerId?: number;
  interviewer?: {
    fullName: string;
  };
  scheduledAt?: string;
  completedAt?: string;
  comments?: string;
  rating?: number;
}

interface ProgressTimelineProps {
  stages: TimelineStage[];
  currentStageIndex: number;
  className?: string;
}

export function ProgressTimeline({ stages, currentStageIndex, className }: ProgressTimelineProps) {
  const getStageIcon = (stage: TimelineStage, index: number) => {
    if (stage.status === 'passed') {
      return <Check className="h-4 w-4 text-white" />;
    }
    if (stage.status === 'failed') {
      return <X className="h-4 w-4 text-white" />;
    }
    if (stage.status === 'in_progress' || index === currentStageIndex) {
      return <Clock className="h-4 w-4 text-white" />;
    }
    return <User className="h-4 w-4 text-slate-400" />;
  };

  const getStageColor = (stage: TimelineStage, index: number) => {
    if (stage.status === 'passed') {
      return 'bg-emerald-500';
    }
    if (stage.status === 'failed') {
      return 'bg-red-500';
    }
    if (stage.status === 'in_progress' || index === currentStageIndex) {
      return 'bg-blue-500';
    }
    return 'bg-slate-300';
  };

  const getLineColor = (index: number) => {
    if (index < currentStageIndex) {
      return 'bg-emerald-500';
    }
    if (index === currentStageIndex) {
      return 'bg-blue-500';
    }
    return 'bg-slate-300';
  };

  if (!stages || stages.length === 0) {
    return (
      <div className={cn("text-center text-slate-500 py-8", className)}>
        <User className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p>No interview stages configured</p>
        <p className="text-xs">Contact HR to set up interview process</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-medium text-slate-900">Interview Progress</h3>
        <span className="text-xs text-slate-500">
          Stage {currentStageIndex + 1} of {stages.length}
        </span>
      </div>
      
      <div className="relative">
        {stages.map((stage, index) => (
          <div key={stage.id} className="relative flex items-start pb-8 last:pb-0">
            {/* Connecting Line */}
            {index < stages.length - 1 && (
              <div
                className={cn(
                  "absolute left-4 top-8 w-0.5 h-8",
                  getLineColor(index)
                )}
              />
            )}
            
            {/* Stage Icon */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
                getStageColor(stage, index)
              )}
            >
              {getStageIcon(stage, index)}
            </div>
            
            {/* Stage Content */}
            <div className="ml-4 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-900">
                  {stage.stageName}
                </h4>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  stage.status === 'passed' && "bg-emerald-100 text-emerald-800",
                  stage.status === 'failed' && "bg-red-100 text-red-800",
                  stage.status === 'in_progress' && "bg-blue-100 text-blue-800",
                  stage.status === 'pending' && "bg-slate-100 text-slate-800"
                )}>
                  {stage.status === 'passed' && 'Passed'}
                  {stage.status === 'failed' && 'Failed'}
                  {stage.status === 'in_progress' && 'In Progress'}
                  {stage.status === 'pending' && 'Pending'}
                </span>
              </div>
              
              {stage.interviewer && (
                <p className="text-xs text-slate-600 mt-1">
                  Interviewer: {stage.interviewer.fullName}
                </p>
              )}
              
              {stage.scheduledAt && (
                <p className="text-xs text-slate-600 mt-1">
                  Scheduled: {new Date(stage.scheduledAt).toLocaleString()}
                </p>
              )}
              
              {stage.completedAt && (
                <p className="text-xs text-slate-600 mt-1">
                  Completed: {new Date(stage.completedAt).toLocaleString()}
                </p>
              )}
              
              {stage.comments && (
                <p className="text-xs text-slate-600 mt-2 italic">
                  "{stage.comments}"
                </p>
              )}
              
              {stage.rating && (
                <div className="flex items-center mt-2">
                  <span className="text-xs text-slate-600 mr-2">Rating:</span>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div
                        key={star}
                        className={cn(
                          "h-3 w-3 rounded-full",
                          star <= stage.rating! ? "bg-yellow-400" : "bg-slate-300"
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}