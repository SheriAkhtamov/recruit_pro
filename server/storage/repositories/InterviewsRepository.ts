/**
 * InterviewsRepository - завершенная миграция из storage.ts
 * С исправлениями: транзакции, race condition fix, soft delete
 */

import { db } from '../../db';
import { interviews, interviewStages, candidates, users, notifications } from '@shared/schema';
import type { Interview, InsertInterview, InterviewStage, InsertInterviewStage } from '@shared/schema';
import { eq, and, gte, lte, desc, asc, isNull } from 'drizzle-orm';
import { t } from '../../lib/i18n';

interface InterviewStageWithInterviewer extends InterviewStage {
    interviewer: Pick<typeof users.$inferSelect, 'id' | 'fullName' | 'email' | 'position'> | null;
    interviewId: number | null;
}

export class InterviewsRepository {
    /**
     * Get interview stages by candidate (with proper typing)
     */
    async getInterviewStagesByCandidate(candidateId: number): Promise<InterviewStageWithInterviewer[]> {
        return await db
            .select({
                id: interviewStages.id,
                candidateId: interviewStages.candidateId,
                stageIndex: interviewStages.stageIndex,
                stageName: interviewStages.stageName,
                interviewerId: interviewStages.interviewerId,
                status: interviewStages.status,
                scheduledAt: interviewStages.scheduledAt,
                completedAt: interviewStages.completedAt,
                comments: interviewStages.comments,
                rating: interviewStages.rating,
                deletedAt: interviewStages.deletedAt,
                createdAt: interviewStages.createdAt,
                updatedAt: interviewStages.updatedAt,
                interviewer: {
                    id: users.id,
                    fullName: users.fullName,
                    email: users.email,
                    position: users.position,
                },
                interviewId: interviews.id,
            })
            .from(interviewStages)
            .leftJoin(users, eq(interviewStages.interviewerId, users.id))
            .leftJoin(interviews, eq(interviews.stageId, interviewStages.id))
            .where(and(eq(interviewStages.candidateId, candidateId), isNull(interviewStages.deletedAt)))
            .orderBy(asc(interviewStages.stageIndex));
    }

    /**
     * Create interview stage
     */
    async createInterviewStage(stage: InsertInterviewStage): Promise<InterviewStage> {
        const [newStage] = await db.insert(interviewStages).values(stage).returning();
        return newStage;
    }

    /**
     * Update interview stage
     */
    async updateInterviewStage(id: number, stage: Partial<InsertInterviewStage>): Promise<InterviewStage> {
        const updateData = { ...stage };

        if (updateData.scheduledAt && typeof updateData.scheduledAt === 'string') {
            updateData.scheduledAt = new Date(updateData.scheduledAt);
        }
        if (updateData.completedAt && typeof updateData.completedAt === 'string') {
            updateData.completedAt = new Date(updateData.completedAt);
        }

        const [updatedStage] = await db
            .update(interviewStages)
            .set({ ...updateData, updatedAt: new Date() })
            .where(eq(interviewStages.id, id))
            .returning();

        if (!updatedStage) {
            throw new Error('Interview stage not found');
        }

        // Auto-progress candidate when stage is passed
        if (updatedStage && stage.status === 'passed') {
            const candidate = await db
                .select()
                .from(candidates)
                .where(eq(candidates.id, updatedStage.candidateId))
                .limit(1);

            if (candidate[0]) {
                const nextStageIndex = updatedStage.stageIndex + 1;

                await db
                    .update(candidates)
                    .set({ currentStageIndex: nextStageIndex, updatedAt: new Date() })
                    .where(eq(candidates.id, updatedStage.candidateId));

                const nextStage = await db
                    .select()
                    .from(interviewStages)
                    .where(
                        and(
                            eq(interviewStages.candidateId, updatedStage.candidateId),
                            eq(interviewStages.stageIndex, nextStageIndex)
                        )
                    )
                    .limit(1);

                if (nextStage[0]) {
                    // Notify next interviewer
                    if (nextStage[0].interviewerId) {
                        await db.insert(notifications).values({
                            userId: nextStage[0].interviewerId,
                            type: 'interview_assigned',
                            title: t('newInterview'),
                            message: t('candidatePassedStage', 'ru', { stageName: nextStage[0].stageName }),
                            relatedEntityType: 'interview_stage',
                            relatedEntityId: nextStage[0].id,
                            isRead: false,
                        });
                    }
                } else {
                    // No more stages, move to documentation
                    await db
                        .update(candidates)
                        .set({ status: 'documentation', updatedAt: new Date() })
                        .where(eq(candidates.id, updatedStage.candidateId));
                }
            }
        } else if (updatedStage && stage.status === 'failed') {
            // Mark candidate as rejected
            await db
                .update(candidates)
                .set({
                    status: 'rejected',
                    rejectionStage: updatedStage.stageName,
                    rejectionReason: stage.comments || 'Failed interview stage',
                    updatedAt: new Date(),
                })
                .where(eq(candidates.id, updatedStage.candidateId));
        }

        return updatedStage;
    }

    /**
     * Sync interview stages with transaction support
     * FIXED: Added transaction to prevent data inconsistency
     */
    async syncInterviewStages(
        candidateId: number,
        stages: (InsertInterviewStage & { id?: number })[]
    ): Promise<void> {
        await db.transaction(async (tx: typeof db) => {
            // Get existing stages
            const existingStages = await tx
                .select()
                .from(interviewStages)
                .where(eq(interviewStages.candidateId, candidateId));

            const existingStageIds = new Set(existingStages.map((s: InterviewStage) => s.id));
            const newStageIds = new Set(stages.filter((s) => s.id).map((s) => s.id as number));

            // Delete stages that no longer exist
            const stagesToDelete = existingStages.filter((s: InterviewStage) => !newStageIds.has(s.id));

            for (const stage of stagesToDelete) {
                // Soft delete interviews first
                await tx
                    .update(interviews)
                    .set({ deletedAt: new Date() })
                    .where(eq(interviews.stageId, stage.id));

                // Soft delete the stage
                await tx
                    .update(interviewStages)
                    .set({ deletedAt: new Date() })
                    .where(eq(interviewStages.id, stage.id));
            }

            // Upsert stages
            for (let i = 0; i < stages.length; i++) {
                const stage = stages[i];

                if (stage.id && existingStageIds.has(stage.id)) {
                    // Update existing stage
                    await tx
                        .update(interviewStages)
                        .set({
                            stageIndex: i,
                            stageName: stage.stageName,
                            interviewerId: stage.interviewerId,
                            updatedAt: new Date(),
                        })
                        .where(eq(interviewStages.id, stage.id));
                } else {
                    // Create new stage
                    await tx.insert(interviewStages).values({
                        candidateId,
                        stageIndex: i,
                        stageName: stage.stageName,
                        interviewerId: stage.interviewerId,
                        status: stage.status || 'waiting',
                    });
                }
            }
        });
    }

    /**
     * Schedule interview with race condition fix
     * FIXED: Added transaction and locking to prevent double-booking
     */
    async scheduleInterview(
        stageId: number,
        interviewerId: number,
        scheduledAt: Date,
        duration: number = 30
    ): Promise<Interview> {
        return await db.transaction(async (tx: typeof db) => {
            const startTime = new Date(scheduledAt);
            const endTime = new Date(scheduledAt.getTime() + duration * 60000);

            // Get existing interviews with pessimistic locking (FOR UPDATE)
            const existingInterviews = await tx
                .select()
                .from(interviews)
                .where(
                    and(
                        eq(interviews.interviewerId, interviewerId),
                        eq(interviews.status, 'scheduled'),
                        isNull(interviews.deletedAt),
                        gte(
                            interviews.scheduledAt,
                            new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate())
                        ),
                        lte(
                            interviews.scheduledAt,
                            new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate(), 23, 59, 59)
                        )
                    )
                )
                .for('update'); // Pessimistic lock to prevent race condition

            // Check for time conflicts
            const conflicts = existingInterviews.filter((interview: Interview) => {
                const existingStart = new Date(interview.scheduledAt);
                const interviewDuration = interview.duration ?? 30; // Default 30 if null
                const existingEnd = new Date(interview.scheduledAt.getTime() + interviewDuration * 60000);
                return startTime < existingEnd && endTime > existingStart;
            });

            if (conflicts.length > 0) {
                const conflictTime = conflicts[0].scheduledAt.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                });
                throw new Error(`Интервьюер занят в это время. Конфликт с собеседованием в ${conflictTime}`);
            }

            // Get stage info
            const stage = await tx
                .select({
                    candidateId: interviewStages.candidateId,
                    stageName: interviewStages.stageName,
                })
                .from(interviewStages)
                .where(eq(interviewStages.id, stageId))
                .limit(1);

            if (!stage[0]) {
                throw new Error('Stage not found');
            }

            // Create interview
            const [interview] = await tx
                .insert(interviews)
                .values({
                    stageId,
                    candidateId: stage[0].candidateId,
                    interviewerId,
                    scheduledAt,
                    duration,
                    status: 'scheduled',
                })
                .returning();

            // Update stage status
            await tx
                .update(interviewStages)
                .set({
                    status: 'in_progress',
                    scheduledAt: scheduledAt,
                    updatedAt: new Date(),
                })
                .where(eq(interviewStages.id, stageId));

            // Create notification
            await tx.insert(notifications).values({
                userId: interviewerId,
                type: 'interview_scheduled',
                title: t('newInterview'),
                message: t('interviewScheduledOn', 'ru', {
                    stageName: stage[0].stageName,
                    date: scheduledAt.toLocaleString('ru-RU'),
                }),
                relatedEntityType: 'interview',
                relatedEntityId: interview.id,
                isRead: false,
            });

            return interview;
        });
    }

    /**
     * Get all interviews
     */
    async getInterviews(workspaceId?: number): Promise<Interview[]> {
        let query = db
            .select()
            .from(interviews)
            .where(isNull(interviews.deletedAt));

        if (workspaceId) {
            query = query
                .innerJoin(candidates, eq(interviews.candidateId, candidates.id))
                .where(and(eq(candidates.workspaceId, workspaceId), isNull(interviews.deletedAt)));
        }

        return await query.orderBy(desc(interviews.scheduledAt));
    }
}

export const interviewsRepository = new InterviewsRepository();
