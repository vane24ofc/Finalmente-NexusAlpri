
import prisma from '@/lib/prisma';
import type { LessonCompletionRecord } from '@/types';
import type { JsonValue } from "@prisma/client/runtime/library";


interface RecordInteractionParams {
    userId: string;
    courseId: string;
    lessonId: string;
    type: 'view' | 'quiz';
    score?: number;
}

async function calculateWeightedProgress(completedRecords: LessonCompletionRecord[], courseId: string): Promise<number> {
    const allLessonsInCourse = await prisma.lesson.findMany({
        where: { module: { courseId } },
        select: { id: true, type: true }
    });

    if (allLessonsInCourse.length === 0) return 0;

    let totalPossibleScore = 0;
    let achievedScore = 0;

    for (const lesson of allLessonsInCourse) {
        totalPossibleScore += 100; // Each lesson is worth 100 points
        const completionRecord = completedRecords.find(r => r.lessonId === lesson.id);

        if (completionRecord) {
            if (completionRecord.type === 'quiz' && typeof completionRecord.score === 'number') {
                achievedScore += completionRecord.score; // Quiz score contributes directly
            } else if (completionRecord.type === 'view') {
                achievedScore += 100; // A viewed lesson contributes full points
            }
        }
    }

    return totalPossibleScore > 0 ? (achievedScore / totalPossibleScore) * 100 : 0;
}

/**
 * Records a user's interaction with a lesson without calculating the final progress.
 * This is used for incremental updates.
 */
export async function recordLessonInteraction({ userId, courseId, lessonId, type, score }: RecordInteractionParams) {
    const progress = await prisma.courseProgress.findUnique({
        where: { userId_courseId: { userId, courseId } },
    });

    let currentRecords: LessonCompletionRecord[] = [];
    if (progress?.completedLessonIds) {
        if (Array.isArray(progress.completedLessonIds)) {
            currentRecords = progress.completedLessonIds as unknown as LessonCompletionRecord[];
        }
    }
    
    const existingRecordIndex = currentRecords.findIndex(r => r.lessonId === lessonId);
    const newRecord: LessonCompletionRecord = { lessonId, type, score };

    if (existingRecordIndex !== -1) {
        currentRecords[existingRecordIndex] = newRecord;
    } else {
        currentRecords.push(newRecord);
    }
    
    await prisma.courseProgress.upsert({
        where: { userId_courseId: { userId, courseId } },
        update: {
            completedLessonIds: currentRecords as unknown as JsonValue,
        },
        create: {
            userId,
            courseId,
            completedLessonIds: currentRecords as unknown as JsonValue,
            progressPercentage: 0, // Initial progress is 0 until consolidated
        },
    });
}


/**
 * Calculates the final weighted progress for a course and saves it to the database.
 * This should be called only at the end of the course.
 */
export async function consolidateCourseProgress({ userId, courseId }: { userId: string, courseId: string }) {
    const progress = await prisma.courseProgress.findUnique({
        where: { userId_courseId: { userId, courseId } },
    });

    if (!progress) {
        throw new Error("No progress found for this user and course to consolidate.");
    }
    
    let currentRecords: LessonCompletionRecord[] = [];
    if (progress.completedLessonIds && Array.isArray(progress.completedLessonIds)) {
        currentRecords = progress.completedLessonIds as unknown as LessonCompletionRecord[];
    }

    const finalPercentage = await calculateWeightedProgress(currentRecords, courseId);

    const updatedProgress = await prisma.courseProgress.update({
        where: { userId_courseId: { userId, courseId } },
        data: {
            progressPercentage: finalPercentage,
        },
    });

    return updatedProgress;
}
