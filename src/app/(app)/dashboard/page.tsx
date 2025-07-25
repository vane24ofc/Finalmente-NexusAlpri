

'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  ArrowRight, 
  BookOpen, 
  Users, 
  Megaphone, 
  Folder, 
  BookMarked, 
  Settings, 
  CheckCircle, 
  ShieldAlert, 
  Loader2, 
  AlertTriangle, 
  BookOpenCheck, 
  Edit,
  GraduationCap,
  UsersRound,
  Activity,
  UserPlus,
  BarChart,
  Server,
  KeyRound,
  UserCog,
} from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { AdminDashboardStats, SecurityLog as AppSecurityLog } from '@/types';
import type { Announcement as AnnouncementType, UserRole, Course as AppCourseType, EnrolledCourse } from '@/types';
import { AnnouncementCard } from '@/components/announcement-card';
import type { Announcement as PrismaAnnouncement, Course as PrismaCourse, SecurityLog, User as PrismaUser } from '@prisma/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard } from '@/components/course-card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, ComposedChart, Legend } from "recharts";
import { useAnimatedCounter } from '@/hooks/use-animated-counter';
import { getEventDetails, getInitials } from '@/lib/security-log-utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';


// --- TYPE DEFINITIONS & MAPPERS ---
interface DisplayAnnouncement extends Omit<PrismaAnnouncement, 'author' | 'audience'> {
  author: { id: string; name: string; email?: string } | null;
  audience: UserRole[] | 'ALL' | string;
}

interface ApiCourseForManage extends Omit<PrismaCourse, 'instructor' | '_count' | 'status'> {
  instructor: { id: string; name: string } | null;
  _count: { modules: number };
  status: AppCourseType['status'];
}

function mapApiCourseToAppCourse(apiCourse: ApiCourseForManage): AppCourseType {
  return {
    id: apiCourse.id,
    title: apiCourse.title,
    description: apiCourse.description || '',
    instructor: apiCourse.instructor?.name || 'N/A',
    instructorId: apiCourse.instructorId || undefined,
    imageUrl: apiCourse.imageUrl || undefined,
    modulesCount: apiCourse._count?.modules ?? 0,
    status: apiCourse.status,
    modules: [],
  };
}

interface SecurityLogWithUser extends AppSecurityLog {
    user: Pick<PrismaUser, 'id' | 'name' | 'avatar'> | null;
}

interface DashboardData {
    adminStats: AdminDashboardStats | null;
    studentStats: { enrolled: number; completed: number } | null;
    instructorStats: { taught: number } | null;
    recentAnnouncements: DisplayAnnouncement[];
    securityLogs: SecurityLogWithUser[];
    taughtCourses: AppCourseType[];
    myDashboardCourses: EnrolledCourse[];
}


// --- DASHBOARD COMPONENTS PER ROLE ---

const MetricCard = ({ title, value: finalValue, icon: Icon, description }: { title: string; value: number; icon: React.ElementType; description?: string }) => {
    const animatedValue = useAnimatedCounter(finalValue);
    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{animatedValue}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
};

const activityChartConfig = {
  newCourses: { label: "Nuevos Cursos", color: "hsl(var(--chart-2))" },
  publishedCourses: { label: "Cursos Publicados", color: "hsl(var(--chart-1))" },
  newEnrollments: { label: "Nuevas Inscripciones", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const formatDateTick = (tick: string) => {
    try {
        const date = parseISO(tick);
        // Format to "Month Day", e.g., "Jul 15"
        return format(date, "MMM d", { locale: es });
    } catch (e) {
        return tick;
    }
};

function AdminDashboard({ stats, logs, announcements }: { stats: AdminDashboardStats, logs: SecurityLogWithUser[], announcements: DisplayAnnouncement[] }) {

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <MetricCard title="Total Usuarios" value={stats.totalUsers} icon={UsersRound} />
            <MetricCard title="Cursos Publicados" value={stats.totalPublishedCourses} icon={BookOpenCheck} />
            <MetricCard title="Usuarios Activos" value={stats.recentLogins} icon={Activity} description="En los últimos 7 días" />
            <MetricCard title="Nuevos Registros" value={stats.newUsersLast7Days} icon={UserPlus} description="En los últimos 7 días"/>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <main className="lg:col-span-2 space-y-6">
            <Card className="card-border-animated">
              <CardHeader>
                  <CardTitle>Actividad de los Cursos (Últimos 30 días)</CardTitle>
                  <CardDescription>Resumen de creación, publicación e inscripciones.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] p-0 pr-4">
                  <ChartContainer config={activityChartConfig} className="w-full h-full">
                    <ResponsiveContainer>
                      <ComposedChart data={stats.courseActivity} margin={{ top: 20, right: 20, bottom: 40, left: 0 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                          <XAxis 
                              dataKey="date" 
                              tickLine={false} 
                              axisLine={false} 
                              tickMargin={10} 
                              angle={-45} 
                              textAnchor="end" 
                              interval={5} 
                              tickFormatter={formatDateTick}
                          />
                          <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                          <Legend verticalAlign="top" height={36}/>
                          <Bar dataKey="newCourses" name="Nuevos Cursos" fill="var(--color-newCourses)" radius={[4, 4, 0, 0]} barSize={20} />
                          <Bar dataKey="publishedCourses" name="Cursos Publicados" fill="var(--color-publishedCourses)" radius={[4, 4, 0, 0]} barSize={20} />
                          <Bar dataKey="newEnrollments" name="Nuevas Inscripciones" fill="var(--color-newEnrollments)" radius={[4, 4, 0, 0]} barSize={20} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </ChartContainer>
              </CardContent>
            </Card>
             <section>
              <h2 className="text-2xl font-semibold">Anuncios Recientes</h2>
              {announcements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {announcements.map(announcement => (
                    <AnnouncementCard key={announcement.id} announcement={announcement} />
                  ))}
                </div>
              ) : (
                <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground"><p>No hay anuncios recientes.</p></CardContent></Card>
              )}
            </section>
          </main>
          
          <aside className="lg:col-span-1 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldAlert className="text-primary"/>Última Actividad de Seguridad</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {logs.slice(0, 5).map(log => {
                           const eventUI = getEventDetails(log.event, log.details);
                           return (
                            <li key={log.id} className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-full">{eventUI.icon}</div>
                                <div className="text-sm">
                                    <p className="font-semibold">{log.user?.name || log.emailAttempt}</p>
                                    <p className="text-muted-foreground">{eventUI.label}</p>
                                </div>
                            </li>
                           )
                        })}
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="secondary" size="sm" className="w-full">
                        <Link href="/security-audit">Ver Auditoría Completa <ArrowRight className="ml-2 h-4 w-4"/></Link>
                    </Button>
                </CardFooter>
             </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Accesos Rápidos</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        <li>
                            <Link href="/manage-courses" className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <span className="flex items-center gap-3 font-medium"><BookMarked className="h-5 w-5 text-primary"/>Gestionar Cursos</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                        </li>
                        <li>
                            <Link href="/users" className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <span className="flex items-center gap-3 font-medium"><Users className="h-5 w-5 text-primary"/>Gestionar Usuarios</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                        </li>
                         <li>
                            <Link href="/settings" className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <span className="flex items-center gap-3 font-medium"><Settings className="h-5 w-5 text-primary"/>Configuración</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                        </li>
                    </ul>
                </CardContent>
            </Card>
          </aside>
        </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shouldSetup2fa = useMemo(() => {
    return user?.role === 'ADMINISTRATOR' && !user.isTwoFactorEnabled;
  }, [user]);
  
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
        const promises: Promise<any>[] = [fetch('/api/announcements')];
        
        if (user.role === 'ADMINISTRATOR') {
            promises.push(fetch('/api/dashboard/admin-stats'));
            promises.push(fetch('/api/security/logs'));
        }
        if (user.role === 'INSTRUCTOR') {
            const queryParams = new URLSearchParams({ manageView: 'true', userId: user.id, userRole: user.role });
            promises.push(fetch(`/api/courses?${queryParams.toString()}`));
        }
        if (user.role === 'STUDENT') {
            promises.push(fetch(`/api/enrollment/${user.id}`));
        }

        const responses = await Promise.all(promises);
        
        for (const res of responses) {
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: `Error en la petición: ${res.statusText}` }));
                throw new Error(errorData.message || 'Una de las peticiones de datos falló');
            }
        }
        
        const [announcementsRes, ...roleSpecificRes] = responses;
        const announcementsJson = await announcementsRes.json();
        const announcementsData = Array.isArray(announcementsJson) ? announcementsJson : announcementsJson.announcements || [];

        const dashboardPayload: DashboardData = {
            adminStats: null,
            studentStats: null,
            instructorStats: null,
            recentAnnouncements: announcementsData.map((ann: any) => ({
                ...ann,
                audience: ann.audience as any,
                author: ann.author ? { id: (ann.author as any).id, name: (ann.author as any).name } : null,
            })),
            taughtCourses: [],
            myDashboardCourses: [],
            securityLogs: [],
        };

        if (user.role === 'ADMINISTRATOR') {
            dashboardPayload.adminStats = await roleSpecificRes[0].json();
            const securityLogsJson = await roleSpecificRes[1].json();
            dashboardPayload.securityLogs = securityLogsJson.logs || [];
        } else if (user.role === 'INSTRUCTOR') {
            const taughtCoursesResponse = await roleSpecificRes[0].json();
            const taughtCoursesData = Array.isArray(taughtCoursesResponse) ? taughtCoursesResponse : (taughtCoursesResponse.courses || []);
            dashboardPayload.instructorStats = { taught: taughtCoursesData.length };
            dashboardPayload.taughtCourses = taughtCoursesData.map(mapApiCourseToAppCourse).slice(0, 4);
        } else if (user.role === 'STUDENT') {
            const enrolledData: any[] = await roleSpecificRes[0].json();
            const mappedCourses: EnrolledCourse[] = enrolledData.map(item => ({
              id: item.id, title: item.title, description: item.description, instructor: item.instructorName || 'N/A',
              imageUrl: item.imageUrl, modulesCount: item.modulesCount || 0, enrolledAt: item.enrolledAt, isEnrolled: true, instructorId: item.instructorId, status: 'PUBLISHED', modules: [],
              progressPercentage: item.progressPercentage || 0,
            }));
            const completedCount = mappedCourses.filter(c => c.progressPercentage === 100).length;
            dashboardPayload.studentStats = { enrolled: mappedCourses.length, completed: completedCount };
            dashboardPayload.myDashboardCourses = mappedCourses.slice(0, 4);
        }
        
        setData(dashboardPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error fetching dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  
  const filteredAnnouncements = useMemo(() => {
    if (!user || !data?.recentAnnouncements) return [];
    return data.recentAnnouncements
      .filter(ann => {
        if (ann.audience === 'ALL') return true;
        if (Array.isArray(ann.audience) && ann.audience.includes(user.role)) return true;
        if (typeof ann.audience === 'string') { try { const parsed = JSON.parse(ann.audience); if (Array.isArray(parsed) && parsed.includes(user.role)) return true; } catch (e) {} }
        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3); 
  }, [data?.recentAnnouncements, user]);

  if (!user) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Cargando...</div>;
  }
  
  if (isLoading) {
      return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-64" />
                </div>
                <div className="lg:col-span-1"><Skeleton className="h-[400px]" /></div>
            </div>
        </div>
      )
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-destructive">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="font-semibold">Error al Cargar Dashboard</p>
            <p className="text-sm">{error}</p>
            <Button onClick={fetchDashboardData} variant="outline" className="mt-4">Reintentar</Button>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Hola, {user.name}! 👋</h1>
          <p className="text-muted-foreground">Bienvenido de nuevo a tu plataforma de aprendizaje.</p>
        </div>
      </div>

      {user.role === 'STUDENT' && data?.studentStats && (
        <section>
            <h2 className="text-2xl font-semibold mb-4">Tu Progreso</h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cursos Inscritos</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.studentStats.enrolled}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cursos Completados</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.studentStats.completed}</div>
                </CardContent>
              </Card>
            </div>
        </section>
      )}

      {user.role === 'INSTRUCTOR' && data?.instructorStats && (
         <section>
            <h2 className="text-2xl font-semibold mb-4">Resumen de Instructor</h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
               <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cursos Impartidos</CardTitle>
                  <BookMarked className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.instructorStats.taught}</div>
                </CardContent>
              </Card>
               <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Estudiantes</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                  <p className="text-xs text-muted-foreground">Próximamente</p>
                </CardContent>
              </Card>
            </div>
        </section>
      )}
      
      {user.role === 'ADMINISTRATOR' && data?.adminStats && <AdminDashboard stats={data.adminStats} logs={data.securityLogs} announcements={filteredAnnouncements}/>}

      {user.role !== 'ADMINISTRATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {user.role === 'INSTRUCTOR' && (
                <section>
                  <h2 className="text-2xl font-semibold mb-4">Mis Cursos Impartidos Recientemente</h2>
                  {data?.taughtCourses && data.taughtCourses.length > 0 ? (
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                        {data.taughtCourses.map(course => (
                          <Card key={course.id} className="shadow-sm hover:shadow-md transition-shadow">
                            {course.imageUrl && <div className="aspect-video relative w-full rounded-t-lg overflow-hidden"><Image src={course.imageUrl} alt={course.title} fill style={{objectFit: "cover"}} data-ai-hint="online learning teacher" sizes="(max-width: 768px) 100vw, 50vw"/></div>}
                            <CardHeader><CardTitle className="text-lg">{course.title}</CardTitle><CardDescription className="text-xs">{course.modulesCount} módulos. Estado: <span className="capitalize">{course.status.toLowerCase()}</span></CardDescription></CardHeader>
                            <CardFooter><Button asChild className="w-full" size="sm"><Link href={`/manage-courses/${course.id}/edit`}><Edit className="mr-2"/> Editar Contenido</Link></Button></CardFooter>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <Card><CardContent className="pt-6 text-center text-muted-foreground"><p>No has creado cursos aún.</p></CardContent></Card>
                  )}
                </section>
            )}

            {user.role === 'STUDENT' && (
                <section>
                  <h2 className="text-2xl font-semibold mb-4">Continuar Aprendiendo</h2>
                  {data?.myDashboardCourses && data.myDashboardCourses.length > 0 ? (
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                      {data.myDashboardCourses.map((course, index) => (
                        <CourseCard key={course.id} course={course} userRole={user.role} priority={index < 2}/>
                      ))}
                    </div>
                  ) : (
                    <Card><CardContent className="pt-6 text-center text-muted-foreground"><p>No estás inscrito en ningún curso.</p></CardContent></Card>
                  )}
                </section>
            )}
            
              <section>
                <h2 className="text-2xl font-semibold mb-4">Anuncios Recientes</h2>
                {filteredAnnouncements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAnnouncements.map(announcement => (
                      <AnnouncementCard key={announcement.id} announcement={announcement} />
                    ))}
                  </div>
                ) : (
                  <Card><CardContent className="pt-6 text-center text-muted-foreground"><p>No hay anuncios recientes.</p></CardContent></Card>
                )}
              </section>
          </div>
          
              <div className="lg:col-span-1">
                  <Card>
                      <CardHeader>
                      <CardTitle>Accesos Rápidos</CardTitle>
                      </CardHeader>
                      <CardContent>
                      <ul className="space-y-3">
                          <li>
                          <Link href="/courses" className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50">
                              <span className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-primary"/>Catálogo de Cursos</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                          </li>
                          <li>
                          <Link href="/my-courses" className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50">
                              <span className="flex items-center gap-3"><GraduationCap className="h-5 w-5 text-primary"/>Mis Cursos</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                          </li>
                          {(user.role === 'ADMINISTRATOR' || user.role === 'INSTRUCTOR') && (
                              <li>
                                  <Link href="/manage-courses" className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50">
                                      <span className="flex items-center gap-3"><BookMarked className="h-5 w-5 text-primary"/>Gestionar Cursos</span>
                                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  </Link>
                              </li>
                          )}
                      </ul>
                      </CardContent>
                  </Card>
              </div>
        </div>
      )}
    </div>
  );
}
