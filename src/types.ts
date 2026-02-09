// src/types.ts
import type { Prisma, User as PrismaUser, Course as PrismaCourse, EnterpriseResource as PrismaEnterpriseResource, Form as PrismaForm, FormField as PrismaFormField, RecurrenceType } from '@prisma/client';

// --- USER & AUTH ---
export type UserRole = 'ADMINISTRATOR' | 'INSTRUCTOR' | 'STUDENT';

export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: UserRole;
    isTwoFactorEnabled?: boolean;
    registeredDate?: string | Date;
    theme?: string | null;
    xp?: number | null;
    isActive?: boolean;
    showInLeaderboard?: boolean;
    customPermissions?: string[]; // Para permisos granulares
}

export interface PlatformSettings {
    platformName: string;
    projectVersion?: string | null;
    allowPublicRegistration: boolean;
    enableEmailNotifications: boolean;
    emailWhitelist: string;
    require2faForAdmins: boolean;
    idleTimeoutMinutes: number;
    enableIdleTimeout: boolean;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumber: boolean;
    passwordRequireSpecialChar: boolean;
    resourceCategories: string[];
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColorLight?: string;
    fontHeadline?: string;
    fontBody?: string;
    primaryColorDark?: string;
    backgroundColorDark?: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    watermarkUrl?: string | null;
    landingImageUrl?: string | null;
    authImageUrl?: string | null;
    aboutImageUrl?: string | null;
    benefitsImageUrl?: string | null;
    announcementsImageUrl?: string | null;
    publicPagesBgUrl?: string | null;
    securityAuditImageUrl?: string | null;
    tourMascotUrl?: string | null;
    dashboardImageUrlAdmin?: string | null;
    dashboardImageUrlInstructor?: string | null;
    dashboardImageUrlStudent?: string | null;
    emptyStateCoursesUrl?: string | null;
    emptyStateMyCoursesUrl?: string | null;
    emptyStateFormsUrl?: string | null;
    emptyStateMyNotesUrl?: string | null;
    emptyStateResourcesUrl?: string | null;
    emptyStateCertificatesUrl?: string | null;
    emptyStateMotivationsUrl?: string | null;
    emptyStateUsersUrl?: string | null;
    emptyStateLeaderboardUrl?: string | null;
    emptyStateAnnouncementsUrl?: string | null;
    roadmapPhases?: string[];
    roadmapVisibleTo?: UserRole[];
    roadmapImageUrl?: string | null;
}

// --- NAVIGATION ---
export interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    roles: UserRole[];
    path?: string;
    badge?: string;
    color?: string;
    children?: NavItem[];
}


// --- COURSE CONTENT ---
export type LessonType = 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type QuestionType = 'MULTIPLE_CHOICE' | 'SINGLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ENDED';


export interface AnswerOption {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback?: string | null;
    points: number;
    imageUrl?: string | null;
}

export interface Question {
    id: string;
    text: string;
    type: QuestionType;
    order: number;
    options: AnswerOption[];
    imageUrl?: string | null;
    template?: string | null;
    timestamp?: number; // Para quizzes interactivos con video
}

export interface Quiz {
    id: string;
    title: string;
    description?: string;
    maxAttempts?: number | null;
    remedialContent?: string | null;
    questions: Question[];
    contentBlockId?: string | null; // From original schema
    resourceId?: string | null; // New for resource quizzes
    timerStyle?: string | null;
}


export interface ContentBlock {
    id: string;
    type: LessonType;
    content?: string;
    order: number;
    quiz?: Quiz;
}

export interface Lesson {
    id: string;
    title: string;
    order: number;
    contentBlocks: ContentBlock[];
}

export interface Module {
    id: string;
    title: string;
    order: number;
    lessons: Lesson[];
}

export type CoursePrerequisiteInfo = {
    id: string;
    title: string;
} | null;

export interface Course extends Omit<PrismaCourse, 'instructor' | 'prerequisite' | 'isMandatory' | 'startDate' | 'endDate' | 'certificateTemplateId' | 'publicationDate'> {
    instructor: {
        id: string;
        name: string;
        avatar: string | null;
    };
    modulesCount: number;
    lessonsCount?: number;
    modules: Module[];
    isEnrolled?: boolean;
    enrollmentsCount?: number;
    averageCompletion?: number;
    publicationDate?: Date | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    prerequisite: CoursePrerequisiteInfo;
    userProgress?: {
        completedAt: Date | null;
    }[] | null;
    prerequisiteCompleted?: boolean;
    isMandatory: boolean;
    certificateTemplateId?: string | null;
}


export interface EnrolledCourse extends Course {
    enrollmentId: string;
    enrolledAt: string;
    progressPercentage?: number;
}

export type LessonCompletionRecord = {
    lessonId: string;
    type: 'view' | 'quiz' | 'video';
    score?: number | null;
};

export interface CourseProgress {
    userId: string;
    courseId: string;
    completedLessons: LessonCompletionRecord[];
    progressPercentage: number;
    completedAt?: Date | null;
    id: string;
}

export interface UserNote {
    id: string;
    userId: string;
    lessonId: string;
    content: string;
    color: string;
    createdAt: string;
    updatedAt: string;
}

export type CourseAssignment = Prisma.CourseAssignmentGetPayload<{}>;


// --- RESOURCES ---
export type ResourceType = 'FOLDER' | 'DOCUMENT' | 'GUIDE' | 'MANUAL' | 'POLICY' | 'VIDEO' | 'EXTERNAL_LINK' | 'OTHER' | 'DOCUMENTO_EDITABLE' | 'VIDEO_PLAYLIST';
export type ResourceStatus = 'ACTIVE' | 'ARCHIVED';
export type ResourceSharingMode = 'PUBLIC' | 'PRIVATE' | 'PROCESS';

export interface AppResourceType extends Omit<PrismaEnterpriseResource, 'tags' | 'status' | 'filetype' | 'quiz'> {
    tags: string[];
    uploaderName: string;
    hasPin: boolean;
    status: ResourceStatus;
    filetype: string | null;
    sharingMode: ResourceSharingMode;
    uploader?: { id: string, name: string | null, avatar: string | null } | null;
    sharedWith?: Pick<User, 'id' | 'name' | 'avatar'>[];
    sharedWithProcesses?: Pick<Process, 'id' | 'name'>[];
    collaborators?: Pick<User, 'id' | 'name' | 'avatar'>[]; // Added for playlist collaborators
    quiz?: Quiz | null;
    version: number;
}



// --- ANNOUNCEMENTS ---
export interface Reaction {
    userId: string;
    reaction: string;
    user: {
        id: string;
        name: string | null;
        avatar?: string | null;
    };
}

export interface Attachment {
    id?: string;
    name: string;
    url: string;
    type: string;
    size: number;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    date: string;
    author: { id: string; name: string | null; avatar?: string | null; role?: string } | null;
    audience: UserRole[] | 'ALL' | string;
    priority?: 'Normal' | 'Urgente';
    isPinned: boolean;
    attachments: Attachment[];
    reads: { id: string; name: string | null; avatar?: string | null; }[];
    reactions: Reaction[];
    _count: {
        reads: number;
        reactions: number;
    };
}

// --- NOTIFICATIONS ---
export interface Notification {
    id: string;
    userId: string;
    title: string;
    description?: string;
    date: string; // ISO string from DB
    link?: string;
    read: boolean;
    isMotivational?: boolean;
    motivationalMessageId?: string | null;
    interactiveEventId?: string | null;
    interactiveEventOccurrence?: Date | string | null;
}

// --- CALENDAR ---
export type EventAudienceType = 'ALL' | UserRole | 'SPECIFIC';

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    description?: string | null;
    location?: string | null;
    audienceType: EventAudienceType;
    attendees: Pick<User, 'id' | 'name' | 'email'>[];
    color: string;
    creatorId: string;
    creator?: { id: string, name: string | null };
    videoConferenceLink?: string | null;
    attachments: Attachment[];
    recurrence: RecurrenceType;
    recurrenceEndDate?: string | null;
    parentId?: string | null;
    isInteractive: boolean;
    imageUrl?: string | null;
}

// --- SECURITY ---
export type SecurityLogEvent =
    | 'SUCCESSFUL_LOGIN'
    | 'FAILED_LOGIN_ATTEMPT'
    | 'PASSWORD_CHANGE_SUCCESS'
    | 'TWO_FACTOR_ENABLED'
    | 'TWO_FACTOR_DISABLED'
    | 'USER_ROLE_CHANGED'
    | 'COURSE_CREATED'
    | 'COURSE_UPDATED'
    | 'COURSE_DELETED'
    | 'USER_SUSPENDED';

export type SecurityLog = Prisma.SecurityLogGetPayload<{
    include: { user: { select: { id: true, name: true, avatar: true, email: true } } }
}> & {
    userAgent: string | null;
    city: string | null;
    country: string | null;
    lat?: number | null;
    lng?: number | null;
};

export type SecurityStats = {
    successfulLogins: number;
    failedLogins: number;
    roleChanges: number;
    courseModifications: number;
    browsers: { name: string, count: number }[];
    os: { name: string, count: number }[];
    topIps: { ip: string, count: number, country: string }[];
    topCountries: { name: string, count: number }[];
    securityScore: number;
    twoFactorAdoptionRate: number;
    atRiskUsers: { userId: string, name: string | null, email: string, avatar: string | null, failedAttempts: number }[];
};


// --- ANALYTICS ---
type TrendData = { date: string, count: number };
export interface AdminDashboardStats {
    totalUsers: number;
    totalCourses: number;
    totalPublishedCourses: number;
    totalEnrollments: number;
    totalResources: number;
    totalAnnouncements: number;
    totalForms: number;
    averageCompletionRate: number;
    userRegistrationTrend: TrendData[];
    contentActivityTrend: { date: string, newCourses: number, newEnrollments: number }[];
    enrollmentTrend: TrendData[];
    usersByRole: { role: UserRole; count: number }[];
    coursesByStatus: { status: CourseStatus; count: number }[];
    topCoursesByEnrollment: any[];
    topCoursesByCompletion: any[];
    lowestCoursesByCompletion: any[];
    topStudentsByEnrollment: any[];
    topStudentsByCompletion: any[];
    topInstructorsByCourses: any[];
}

// --- TEMPLATES ---
export type TemplateType = 'SYSTEM' | 'USER';
export { type LessonTemplate, type TemplateBlock, type CertificateTemplate } from '@prisma/client';

// --- GAMIFICATION ---
export type UserAchievement = Prisma.UserAchievementGetPayload<{
    include: {
        achievement: true;
    }
}>;
export { type AchievementSlug } from '@prisma/client';

// --- MOTIVATIONAL MESSAGES ---
export type MotivationalMessage = Prisma.MotivationalMessageGetPayload<{}>;
export { type MotivationalMessageTriggerType } from '@prisma/client';


// --- FORMS ---
export type FormFieldOption = {
    id: string;
    label?: string;
    value?: string;
    [key: string]: any;
};

export type AppQuestion = Omit<PrismaFormField, 'options' | 'id'> & {
    id: string; // Client-side ID
    options: FormFieldOption[];
    text: string;
};


export type AppForm = Omit<PrismaForm, 'fields'> & {
    fields: AppQuestion[];
    timerStyle?: string | null;
    _count?: { responses: number };
    creator?: { name: string | null };
    sharedWith?: { id: string; name: string | null; avatar: string | null }[];
};

// --- PROCESSES ---
export type Process = Prisma.ProcessGetPayload<{
    include: {
        children: true,
        users: true
    }
}> & {
    children?: Process[];
};

// --- ROADMAP ---
export type RoadmapItem = Omit<Prisma.RoadmapItemGetPayload<{}>, 'color'>;


export { type FormStatus, type FormFieldType, type AnnouncementAttachment, type RecurrenceType, type ChatAttachment, type QuizAttempt, type ResourceVersion } from '@prisma/client';
