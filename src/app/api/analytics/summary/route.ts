
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { subDays, startOfDay } from 'date-fns';

export interface AnalyticsSummary {
    totalUsers: number;
    userTrend: number;
    totalCourses: number;
    courseTrend: number;
    totalPublishedCourses: number;
    totalEnrollments: number;
}

const calculateTrend = (currentPeriodCount: number, previousPeriodCount: number): number => {
    if (previousPeriodCount === 0) {
        return currentPeriodCount > 0 ? 100 : 0;
    }
    return ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100;
};

export async function GET(req: NextRequest) {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMINISTRATOR') {
        return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    try {
        const today = new Date();
        const sevenDaysAgo = startOfDay(subDays(today, 7));
        const fourteenDaysAgo = startOfDay(subDays(today, 14));

        const [
            totalUsers,
            newUsersLast7Days,
            newUsersPrevious7Days,
            totalCourses,
            newCoursesLast7Days,
            newCoursesPrevious7Days,
            totalPublishedCourses,
            totalEnrollments,
        ] = await prisma.$transaction([
            prisma.user.count(),
            prisma.user.count({ where: { registeredDate: { gte: sevenDaysAgo } } }),
            prisma.user.count({ where: { registeredDate: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
            prisma.course.count(),
            prisma.course.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            prisma.course.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
            prisma.course.count({ where: { status: 'PUBLISHED' } }),
            prisma.enrollment.count(),
        ]);
        
        const summary: AnalyticsSummary = {
            totalUsers,
            userTrend: calculateTrend(newUsersLast7Days, newUsersPrevious7Days),
            totalCourses,
            courseTrend: calculateTrend(newCoursesLast7Days, newCoursesPrevious7Days),
            totalPublishedCourses,
            totalEnrollments,
        };

        return NextResponse.json(summary);
    } catch (error) {
        console.error('[ANALYTICS_SUMMARY_ERROR]', error);
        return NextResponse.json({ message: 'Error al obtener el resumen de analíticas' }, { status: 500 });
    }
}
