// src/app/(app)/courses/[courseId]/page.tsx
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';

const CourseViewer = dynamic(() => import('@/components/course-viewer').then(mod => mod.CourseViewer), {
    ssr: false,
    loading: () => <CourseViewerSkeleton />
});

const CourseViewerSkeleton = () => (
    <div className="flex h-full">
        <div className="hidden md:block w-80 flex-shrink-0 border-r bg-card p-4 space-y-4">
            <Skeleton className="h-9 w-full" />
            <div className="space-y-6 pt-4">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-5/6" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-5 w-5/6" />
                </div>
            </div>
        </div>
        <div className="flex-1 p-8 space-y-6">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-96 w-full rounded-xl" />
            <Skeleton className="h-24 w-full" />
        </div>
    </div>
)

export default function CourseDetailPage({ params }: { params: { courseId: string } }) {
    const { courseId } = params;

    return (
        <CourseViewer courseId={courseId} />
    );
}