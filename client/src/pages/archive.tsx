import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input as UiInput } from '@/components/ui/input';
import { Archive, CheckCircle, XCircle, User, Building, Calendar, Phone, Mail, MapPin, LogOut, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from '@/hooks/useTranslation';
import CandidateDetailsModal from '@/components/modals/CandidateDetailsModal';
import { CandidatePhoto } from '@/components/CandidatePhoto';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import type { Candidate } from '@shared/schema';

export default function ArchivePage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const locale = language === 'en' ? enUS : ru;

  // Access control check
  if (!user) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('accessDenied')}</h2>
        <p className="text-slate-600">{t('pleaseLogin')}</p>
      </div>
    );
  }

  // Check if user has permission to access archive
  const canAccess = user.role === 'admin' || user.role === 'hr_manager';
  if (!canAccess) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('accessDenied')}</h2>
        <p className="text-slate-600">{t('noPermissionToAccessThisSection')}</p>
      </div>
    );
  }
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [dismissalReason, setDismissalReason] = useState('');
  const [dismissalDate, setDismissalDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);

  const { data: archivedCandidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates/archived'],
  });

  const filteredCandidates = archivedCandidates.filter((candidate: Candidate) => {
    const matchesSearch =
      (candidate.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (candidate.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (candidate.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && candidate.status === filterStatus;
  });

  const hiredCandidates = filteredCandidates.filter((c: Candidate) => c.status === 'hired');
  const rejectedCandidates = filteredCandidates.filter((c: Candidate) => c.status === 'rejected');
  const dismissedCandidates = filteredCandidates.filter((c: Candidate) => c.status === 'dismissed');

  const dismissCandidateMutation = useMutation({
    mutationFn: async ({ id, dismissalReason, dismissalDate }: { id: number; dismissalReason: string; dismissalDate: string }) => {
      return apiRequest('PUT', `/api/candidates/${id}/dismiss`, {
        dismissalReason,
        dismissalDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/archived'] });
      toast({
        title: t('candidateDismissed'),
        description: t('candidateDismissedSuccess'),
      });
      setShowDismissDialog(false);
      setDismissalReason('');
    },
    onError: (error: any) => {
      toast({
        title: t('errorOccurred'),
        description: error.message || t('failedToDismissCandidate'),
        variant: 'destructive',
      });
    },
  });

  // Delete candidate mutation
  const deleteCandidateMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      return apiRequest('DELETE', `/api/candidates/${candidateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      setShowDeleteDialog(false);
      setCandidateToDelete(null);
      toast({
        title: t('candidateDeleted'),
        description: t('candidateDeletedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('errorOccurred'),
        description: error.message || t('failedToDeleteCandidate'),
        variant: 'destructive',
      });
    },
  });

  const handleDismissCandidate = (candidate: any) => {
    setSelectedCandidate(candidate);
    setShowDismissDialog(true);
  };

  const confirmDismissal = () => {
    if (!dismissalReason.trim()) {
      toast({
        title: t('errorOccurred'),
        description: t('dismissalReasonRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (!selectedCandidate) return;

    dismissCandidateMutation.mutate({
      id: selectedCandidate.id,
      dismissalReason,
      dismissalDate,
    });
  };

  const handleDeleteCandidate = (candidate: any) => {
    setCandidateToDelete(candidate);
    setShowDeleteDialog(true);
  };

  const confirmDeleteCandidate = () => {
    if (candidateToDelete) {
      deleteCandidateMutation.mutate(candidateToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Archive className="h-6 w-6 text-slate-600" />
          <h1 className="text-2xl font-semibold text-slate-900">{t('candidateArchive')}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-slate-600">{t('hired')}: {hiredCandidates.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm text-slate-600">{t('rejected')}: {rejectedCandidates.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <LogOut className="h-5 w-5 text-gray-600" />
            <span className="text-sm text-slate-600">{t('dismissed')}: {dismissedCandidates.length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Input
          placeholder={t('searchCandidates')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allCandidates')}</SelectItem>
            <SelectItem value="hired">{t('hiredCandidates')}</SelectItem>
            <SelectItem value="rejected">{t('rejectedCandidates')}</SelectItem>
            <SelectItem value="dismissed">{t('dismissedCandidates')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Archive Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">{t('all')} ({filteredCandidates.length})</TabsTrigger>
          <TabsTrigger value="hired">{t('hiredCandidates')} ({hiredCandidates.length})</TabsTrigger>
          <TabsTrigger value="rejected">{t('rejectedCandidates')} ({rejectedCandidates.length})</TabsTrigger>
          <TabsTrigger value="dismissed">{t('dismissedCandidates')} ({dismissedCandidates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CandidateGrid
            candidates={filteredCandidates}
            onCandidateClick={(candidate) => {
              setSelectedCandidate(candidate);
              setShowDetailsModal(true);
            }}
            onDismissClick={handleDismissCandidate}
            onDeleteClick={handleDeleteCandidate}
            user={user}
          />
        </TabsContent>

        <TabsContent value="hired">
          <CandidateGrid
            candidates={hiredCandidates}
            onCandidateClick={(candidate) => {
              setSelectedCandidate(candidate);
              setShowDetailsModal(true);
            }}
            onDismissClick={handleDismissCandidate}
            onDeleteClick={handleDeleteCandidate}
            user={user}
          />
        </TabsContent>

        <TabsContent value="rejected">
          <CandidateGrid
            candidates={rejectedCandidates}
            onCandidateClick={(candidate) => {
              setSelectedCandidate(candidate);
              setShowDetailsModal(true);
            }}
            onDismissClick={undefined}
            onDeleteClick={handleDeleteCandidate}
            user={user}
          />
        </TabsContent>

        <TabsContent value="dismissed">
          <CandidateGrid
            candidates={dismissedCandidates}
            onCandidateClick={(candidate) => {
              setSelectedCandidate(candidate);
              setShowDetailsModal(true);
            }}
            onDismissClick={undefined}
            onDeleteClick={handleDeleteCandidate}
            user={user}
          />
        </TabsContent>
      </Tabs>

      {/* Candidate Details Modal */}
      {selectedCandidate && (
        <CandidateDetailsModal
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
          candidate={selectedCandidate}
        />
      )}

      {/* Dismiss Candidate Dialog */}
      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dismissCandidate')}</DialogTitle>
            <DialogDescription>
              {t('dismissCandidateDescription')} {selectedCandidate?.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('dismissalReason')}</Label>
              <Textarea
                value={dismissalReason}
                onChange={(e) => setDismissalReason(e.target.value)}
                placeholder={t('specifyDismissalReason')}
                rows={4}
              />
            </div>

            <div>
              <Label>{t('dismissalDate')}</Label>
              <UiInput
                type="date"
                value={dismissalDate}
                onChange={(e) => setDismissalDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDismissDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDismissal}
              disabled={dismissCandidateMutation.isPending}
            >
              {t('dismiss')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">{t('deleteCandidate')}</DialogTitle>
            <DialogDescription>
              {t('deleteCandidateConfirmation')} <strong>{candidateToDelete?.fullName}</strong>?
              <br /><br />
              <span className="text-red-600 font-medium">{t('deleteCandidateWarning')}</span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCandidate}
              disabled={deleteCandidateMutation.isPending}
            >
              {deleteCandidateMutation.isPending ? t('deleting') : t('deleteCandidate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CandidateGrid({ candidates, onCandidateClick, onDismissClick, onDeleteClick, user }: { candidates: any[]; onCandidateClick: (candidate: any) => void; onDismissClick?: (candidate: any) => void; onDeleteClick?: (candidate: any) => void; user: any }) {
  const { t } = useTranslation();

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12">
        <Archive className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noCandidates')}</h3>
        <p className="text-slate-500">{t('noArchiveCandidates')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {candidates.map((candidate: any) => (
        <CandidateCard key={candidate.id} candidate={candidate} onCandidateClick={onCandidateClick} onDismissClick={onDismissClick} onDeleteClick={onDeleteClick} user={user} />
      ))}
    </div>
  );
}

function CandidateCard({ candidate, onCandidateClick, onDismissClick, onDeleteClick, user }: { candidate: any; onCandidateClick: (candidate: any) => void; onDismissClick?: (candidate: any) => void; onDeleteClick?: (candidate: any) => void; user: any }) {
  const { t, language } = useTranslation();
  const locale = language === 'en' ? enUS : ru;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'hired':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: t('hiredStatus'),
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: t('rejectedStatus'),
        };
      case 'dismissed':
        return {
          icon: LogOut,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: t('dismissedStatus'),
        };
      default:
        return {
          icon: User,
          color: 'text-slate-600',
          bgColor: 'bg-slate-100',
          label: status,
        };
    }
  };

  const statusInfo = getStatusInfo(candidate.status);
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onCandidateClick(candidate)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <CandidatePhoto
              photoUrl={candidate.photoUrl}
              name={candidate.fullName}
              size="md"
            />
            <div className="space-y-1">
              <CardTitle className="text-lg">{candidate.fullName}</CardTitle>
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">ID: {candidate.id}</span>
              </div>
            </div>
          </div>
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${statusInfo.bgColor}`}>
            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
            <span className={`text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">{candidate.email}</span>
          </div>

          {candidate.phone && (
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">{candidate.phone}</span>
            </div>
          )}

          {candidate.city && (
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">{candidate.city}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500">
              {t('updated')}: {format(new Date(candidate.updatedAt), 'dd MMMM yyyy', { locale })}
            </span>
          </div>

          {candidate.rejectionReason && candidate.status === 'rejected' && (
            <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
              <div className="font-medium">{t('rejectionReason')}:</div>
              <div>{candidate.rejectionReason}</div>
              {candidate.rejectionStage && (
                <div className="text-red-600 mt-1">{t('stageLabel')}: {candidate.rejectionStage}</div>
              )}
            </div>
          )}

          {candidate.dismissalReason && candidate.status === 'dismissed' && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
              <div className="font-medium">{t('dismissalReason')}:</div>
              <div>{candidate.dismissalReason}</div>
              {candidate.dismissalDate && (
                <div className="text-gray-600 mt-1">
                  {t('dismissalDate')}: {format(new Date(candidate.dismissalDate), 'dd MMMM yyyy', { locale })}
                </div>
              )}
            </div>
          )}

          {candidate.source && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                {t('sourceLabel')}: {candidate.source}
              </Badge>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-2">
          {/* Dismiss Button for Hired Candidates */}
          {candidate.status === 'hired' && onDismissClick && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onDismissClick(candidate);
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('dismiss')}
            </Button>
          )}

          {/* Delete Button for Admin Users */}
          {user?.role === 'admin' && onDeleteClick && (
            <Button
              variant="destructive"
              size="sm"
              className={candidate.status === 'hired' && onDismissClick ? '' : 'w-full'}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(candidate);
              }}
            >
              <Trash2 className="h-4 w-4" />
              {candidate.status === 'hired' && onDismissClick ? '' : ' ' + t('deleteCandidate')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}