import type { Course as AppCourseType, CourseStatus } from '@/types';
import type { Course as PrismaCourse } from '@prisma/client';

// Interfaz actualizada para incluir el conteo de lecciones desde la API [cite: 17, 19]
interface ApiCourseForManage extends Omit<PrismaCourse, 'instructor' | 'status' | 'prerequisite' | 'isMandatory'> {
  instructor?: { id: string; name: string | null; avatar?: string | null; } | null;
  _count?: {
    modules?: number;
    enrollments?: number;
    lessons?: number; // Añadido para capturar el conteo directo de lecciones [cite: 19]
  };
  modules?: { id: string; lessons: { id: string }[] }[];
  status: CourseStatus;
  averageCompletion?: number;
  isMandatory: boolean;
  enrollments?: {
    id: string;
    user: { id: string; name: string | null; email: string; avatar: string | null };
    progress: { progressPercentage: number; completedLessons: any[] } | null;
  }[];
  prerequisite?: { id: string; title: string } | null;
  prerequisiteCompleted?: boolean;
}

export function mapApiCourseToAppCourse(apiCourse: ApiCourseForManage): AppCourseType {
  // CORRECCIÓN: Priorizar el conteo de lecciones de _count si el array de módulos no viene completo
  const totalLessons = (Array.isArray(apiCourse.modules) && apiCourse.modules.length > 0)
    ? apiCourse.modules.reduce((acc, mod) => acc + (mod?.lessons?.length || 0), 0)
    : (apiCourse._count?.lessons || 0);

  let computedAverageCompletion = apiCourse.averageCompletion;

  // Lógica para calcular el promedio si no viene pre-calculado [cite: 32]
  if (computedAverageCompletion === undefined && apiCourse.enrollments && apiCourse.enrollments.length > 0) {
    const validProgress = apiCourse.enrollments
      .map((e) => e.progress?.progressPercentage)
      .filter((p): p is number => p !== null && p !== undefined);

    if (validProgress.length > 0) {
      computedAverageCompletion = validProgress.reduce((acc, curr) => acc + curr, 0) / validProgress.length;
    } else {
      computedAverageCompletion = 0;
    }
  }

  return {
    id: apiCourse.id,
    title: apiCourse.title,
    createdAt: apiCourse.createdAt,
    updatedAt: apiCourse.updatedAt,
    publicationDate: apiCourse.publicationDate,
    // Importante: La limpieza de HTML (<p>) se hace en el COMPONENTE (CourseCard) 
    // usando dangerouslySetInnerHTML para que no aparezcan las etiquetas [cite: 84]
    description: apiCourse.description || '',
    category: apiCourse.category ?? null,
    instructor: apiCourse.instructor ? {
      id: apiCourse.instructor.id,
      name: apiCourse.instructor.name || 'Sin instructor', // [cite: 94]
      avatar: apiCourse.instructor.avatar ?? null,
    } : {
      id: 'unknown',
      name: 'Sin instructor',
      avatar: null,
    },
    instructorId: apiCourse.instructorId,
    imageUrl: apiCourse.imageUrl ?? null,
    // Aseguramos que tome el conteo de la propiedad correcta [cite: 18, 96, 100]
    modulesCount: (apiCourse._count?.modules ?? (Array.isArray(apiCourse.modules) ? apiCourse.modules.length : 0)),
    lessonsCount: totalLessons,
    enrollmentsCount: (apiCourse._count?.enrollments ?? (Array.isArray(apiCourse.enrollments) ? apiCourse.enrollments.length : 0)),
    averageCompletion: computedAverageCompletion ?? 0,
    status: apiCourse.status,
    modules: [],
    isEnrolled: undefined,
    isMandatory: apiCourse.isMandatory || false,
    prerequisiteId: apiCourse.prerequisiteId,
    prerequisite: apiCourse.prerequisite || null,
    prerequisiteCompleted: apiCourse.prerequisiteCompleted,
    certificateTemplateId: apiCourse.certificateTemplateId
  };
}