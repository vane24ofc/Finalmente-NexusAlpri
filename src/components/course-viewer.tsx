// @ts-nocheck
'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, PlayCircle, FileText as FileTextIcon, Layers, Clock, UserCircle2 as UserIcon, Download, ExternalLink, Loader2, AlertTriangle, Tv2, BookOpenText, Lightbulb, CheckCircle, Image as ImageIcon, File as FileGenericIcon, Award, PencilRuler, XCircle, Circle, Eye, Check, Search, PanelLeft, LineChart, Notebook, ScreenShare, ChevronRight, Palette, X, GraduationCap, Expand, Edit, Smartphone, Lock } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { Course as AppCourse, Module as AppModule, Lesson as AppLesson, ContentBlock, LessonType, Quiz as AppQuiz, Question as AppQuestion, AnswerOption as AppAnswerOption, CourseProgress, LessonCompletionRecord, UserNote } from '@/types';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { QuizViewer } from '@/components/quiz-viewer';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTitle } from '@/contexts/title-context';
import { useDebounce } from '@/hooks/use-debounce';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import YouTube from 'react-youtube';
import mammoth from 'mammoth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import dynamic from 'next/dynamic';
import { getYoutubeVideoId } from '@/lib/resource-utils';
import { AnimatePresence, motion } from 'framer-motion';
import { ColorfulLoader } from './ui/colorful-loader';

const RichTextEditor = dynamic(
    () => import('./ui/rich-text-editor').then((mod) => mod.RichTextEditor),
    { ssr: false, loading: () => <div className="h-40 bg-muted animate-pulse rounded-md" /> }
);

const PdfViewer = dynamic(
    () => import('@/components/pdf-viewer').then((mod) => mod.PdfViewer),
    { ssr: false, loading: () => <div className="h-96 bg-muted animate-pulse rounded-md" /> }
);

const noteColors = [
    { value: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/40', border: 'border-yellow-200 dark:border-yellow-800/50' },
    { value: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-200 dark:border-blue-800/50' },
    { value: 'green', bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-200 dark:border-green-800/50' },
    { value: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/40', border: 'border-pink-200 dark:border-pink-800/50' },
    { value: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-200 dark:border-purple-800/50' },
];

const DocxPreviewer = ({ url }: { url: string }) => {
    const [html, setHtml] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDocx = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('No se pudo cargar la previsualización del documento.');
                const arrayBuffer = await response.arrayBuffer();
                const { value: htmlContent } = await mammoth.convertToHtml({ arrayBuffer });
                setHtml(htmlContent);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Error desconocido.");
            } finally {
                setIsLoading(false);
            }
        };
        loadDocx();
    }, [url]);

    if (isLoading) return <div className="p-4 text-center"><div className="w-6 h-6 mx-auto"><ColorfulLoader /></div></div>;
    if (error) return <div className="p-4 text-center text-destructive">{error}</div>;
    return <div className="prose prose-sm dark:prose-invert max-w-none my-4 p-3 border rounded-lg bg-card" dangerouslySetInnerHTML={{ __html: html || '' }} />;
};

// --- Note Taking Component ---
const LessonNotesPanel = ({ lessonId, isOpen, onClose }: { lessonId: string, isOpen: boolean, onClose: () => void }) => {
    const { user } = useAuth();
    const [note, setNote] = useState<Partial<UserNote>>({ content: '', color: 'yellow' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const debouncedContent = useDebounce(note.content, 1000);
    const isInitialLoad = useRef(true);

    useEffect(() => {
        if (!isOpen || !user) return;
        isInitialLoad.current = true;
        const fetchNote = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/notes/${lessonId}`);
                const data: UserNote = res.ok ? await res.json() : { content: '', color: 'yellow' };
                setNote({ content: data.content, color: data.color || 'yellow' });
            } catch (error) {
                setNote({ content: '', color: 'yellow' });
            } finally {
                setIsLoading(false);
                setTimeout(() => { isInitialLoad.current = false; }, 500);
            }
        };
        fetchNote();
    }, [lessonId, user, isOpen]);

    const saveNote = useCallback(async (content: string, color: string) => {
        if (!user) return;
        setIsSaving(true);
        try {
            await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId, content, color }),
            });
        } catch (error) {
            console.error("Failed to save note:", error);
        } finally {
            setTimeout(() => setIsSaving(false), 500);
        }
    }, [lessonId, user]);

    useEffect(() => {
        if (!isInitialLoad.current && !isLoading && debouncedContent !== undefined) {
            saveNote(debouncedContent, note.color);
        }
    }, [debouncedContent, note.color, saveNote, isLoading]);

    const handleColorChange = (newColor: string) => {
        setNote(prev => ({ ...prev, color: newColor }));
        // Save color change immediately
        if (!isInitialLoad.current && !isLoading) {
            saveNote(note.content, newColor);
        }
    };


    const activeColor = noteColors.find(c => c.value === note.color) || noteColors[0];

    return (
        <div className={cn("flex flex-col h-full border-l transition-colors", activeColor.bg, activeColor.border)}>
            <div className="p-4 border-b flex flex-row items-center justify-between h-16 shrink-0 bg-background/30">
                <h3 className="font-semibold flex items-center gap-2">
                    <Notebook className="h-5 w-5" />
                    <span>Mis Apuntes</span>
                </h3>
                <div className="flex items-center gap-2">
                    {isSaving && <p className="text-xs text-muted-foreground flex items-center gap-1"><div className="w-3 h-3"><ColorfulLoader /></div>Guardando...</p>}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Palette className="h-4 w-4" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1">
                            <div className="flex gap-1">
                                {noteColors.map(color => (
                                    <button
                                        key={color.value}
                                        onClick={() => handleColorChange(color.value)}
                                        className={cn("h-6 w-6 rounded-full border-2 transition-transform", color.bg)}
                                        style={{ borderColor: note.color === color.value ? 'hsl(var(--primary))' : 'transparent' }}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="w-6 h-6"><ColorfulLoader /></div>
                    </div>
                ) : (
                    <RichTextEditor
                        value={note.content}
                        onChange={(content) => setNote(prev => ({ ...prev, content }))}
                        placeholder="Escribe tus notas privadas para esta lección aquí. Se guardarán automáticamente..."
                        className="w-full h-full bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                )}
            </div>
        </div>
    );
};


const VideoPlayer = ({ videoUrl, lessonTitle, onVideoEnd }: { videoUrl: string, lessonTitle?: string, onVideoEnd: () => void }) => {
    const videoId = getYoutubeVideoId(videoUrl);
    const [error, setError] = useState(false);
    const [showSuggestion, setShowSuggestion] = useState(true);
    const isMobile = useIsMobile();
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (isMobile) {
            const timer = setTimeout(() => setShowSuggestion(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [isMobile]);

    // If it's a YouTube video
    if (videoId) {
        const onPlayerError = (event: any) => {
            console.error("Error en el reproductor de YouTube:", event.data);
            setError(true);
        };

        const opts = {
            height: '100%',
            width: '100%',
            playerVars: {
                autoplay: 0,
                rel: 0,
                modestbranding: 1,
                origin: typeof window !== 'undefined' ? window.location.origin : '',
            },
        };

        return (
            <div className="aspect-video w-full max-w-4xl mx-auto my-4 rounded-lg overflow-hidden shadow-md relative group bg-black">
                <AnimatePresence>
                    {isMobile && showSuggestion && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white z-10 pointer-events-none"
                        >
                            <motion.div
                                initial={{ rotate: 0 }}
                                animate={{ rotate: [0, -90, -90, 0, 0], y: [0, 10, 10, 0, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                            >
                                <Smartphone className="h-16 w-16" />
                            </motion.div>
                            <p className="mt-4 font-semibold">Gira tu teléfono para una mejor experiencia</p>
                        </motion.div>
                    )}
                </AnimatePresence>
                {error ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-destructive text-destructive-foreground p-4">
                        <AlertTriangle className="h-8 w-8 mb-2" />
                        <p className="font-semibold">Video no disponible</p>
                        <p className="text-sm">El propietario ha deshabilitado la reproducción en otros sitios web.</p>
                    </div>
                ) : (
                    <YouTube
                        videoId={videoId}
                        className="w-full h-full"
                        onEnd={onVideoEnd}
                        onError={onPlayerError}
                        opts={opts}
                    />
                )}
            </div>
        );
    }

    // Default to native HTML5 video player for other sources (Supabase Storage, etc)
    return (
        <div className="aspect-video w-full max-w-4xl mx-auto my-4 rounded-lg overflow-hidden shadow-md relative bg-black group">
            <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full h-full outline-none"
                onEnded={onVideoEnd}
                controlsList="nodownload"
            >
                Tu navegador no soporta el reproductor de video.
            </video>
        </div>
    );
}

// --- MAIN COMPONENT ---
interface CourseViewerProps {
    courseId: string;
}

export function CourseViewer({ courseId }: CourseViewerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useAuth();
    const isMobile = useIsMobile();
    const { setPageTitle, setShowBackButton } = useTitle();

    const [course, setCourse] = useState<AppCourse | null>(null);
    const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);

    const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
    const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
    const [isConsolidating, setIsConsolidating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const lessonIdFromQuery = searchParams.get('lesson');
    const firstLessonId = course?.modules?.[0]?.lessons?.[0]?.id;

    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(lessonIdFromQuery || null);
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [isSidebarVisible, setIsSidebarVisible] = useState(!isMobile);
    const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
    const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false);
    const [imageToView, setImageToView] = useState<string | null>(null);

    const allLessons = useMemo(() => course?.modules.flatMap(m => m.lessons) || [], [course]);
    const totalLessonsCount = allLessons.length;

    const completedLessonIds = useMemo(() => {
        return new Set(courseProgress?.completedLessons?.map(l => l.lessonId) || []);
    }, [courseProgress]);

    const isCreatorViewingCourse = useMemo(() => {
        if (!user || !course) return false;
        return user.role === 'ADMINISTRATOR' || (user.role === 'INSTRUCTOR' && user.id === course.instructorId);
    }, [user, course]);

    const isLessonLocked = useCallback((lessonId: string) => {
        if (isCreatorViewingCourse) return false;
        const currentLessonIndex = allLessons.findIndex(l => l.id === lessonId);
        if (currentLessonIndex === -1) return false;

        // Strict linear progression: all previous lessons must be completed
        return allLessons.slice(0, currentLessonIndex).some(l => !completedLessonIds.has(l.id));
    }, [allLessons, completedLessonIds, isCreatorViewingCourse]);

    const fetchProgress = useCallback(async (userId: string, courseId: string) => {
        try {
            const progressRes = await fetch(`/api/progress/${userId}/${courseId}`);
            if (progressRes.ok) {
                const progressData: CourseProgress = await progressRes.json();
                setCourseProgress(progressData);
            } else {
                console.error("Failed to fetch progress, setting to default.");
                setCourseProgress({
                    id: '',
                    userId,
                    courseId,
                    completedLessons: [],
                    progressPercentage: 0
                });
            }
        } catch (e) {
            console.error("Error fetching progress:", e);
        }
    }, []);

    const recordInteraction = useCallback(async (lessonId: string, type: 'view' | 'quiz' | 'video') => {
        if (isCreatorViewingCourse || !user || !courseId || !isEnrolled || completedLessonIds.has(lessonId)) {
            return;
        }

        // Optimistic UI update
        setCourseProgress(prev => {
            if (!prev) return null;
            if (prev.completedLessons.some(l => l.lessonId === lessonId)) return prev;

            const newCompletedLesson = { lessonId, type, score: null };
            const newCompletedLessons = [...prev.completedLessons, newCompletedLesson];
            const newPercentage = totalLessonsCount > 0 ? Math.round((newCompletedLessons.length / totalLessonsCount) * 100) : 0;

            return {
                ...prev,
                completedLessons: newCompletedLessons,
                progressPercentage: newPercentage
            };
        });

        try {
            const response = await fetch(`/api/progress/${user.id}/${courseId}/lesson`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId, type }),
            });

            if (!response.ok) {
                throw new Error('Failed to record interaction');
            }

            const lesson = allLessons.find(l => l.id === lessonId);
            if (lesson && type !== 'video') { // Don't toast for video end to avoid being intrusive
                toast({ description: `Progreso guardado: "${lesson.title}"`, duration: 2000 });
            }
            // No need to fetchProgress here, optimistic update is enough for the frontend
        } catch (e) {
            console.error("Failed to record interaction:", e);
            // Revert on error by re-fetching the source of truth
            fetchProgress(user.id, courseId);
            toast({ title: 'Error de Sincronización', description: 'No se pudo guardar tu progreso. Inténtalo de nuevo.', variant: 'destructive' });
        }
    }, [user, courseId, isEnrolled, isCreatorViewingCourse, toast, allLessons, completedLessonIds, totalLessonsCount, fetchProgress]);


    const handleConsolidateProgress = useCallback(async () => {
        if (!user || !courseId || isConsolidating) return;
        setIsConsolidating(true);
        try {
            const response = await fetch(`/api/progress/${user.id}/${courseId}/consolidate`, { method: 'POST' });
            if (!response.ok) throw new Error((await response.json()).message || "Failed to consolidate progress");

            const finalProgressData = await response.json();
            setCourseProgress(finalProgressData);
            toast({
                title: "¡Curso Finalizado!",
                description: finalProgressData.message,
                duration: 5000,
            });
        } catch (error) {
            toast({ title: "Error", description: `No se pudo calcular tu progreso: ${(error as Error).message}`, variant: "destructive" });
        } finally {
            setIsConsolidating(false);
        }
    }, [user, courseId, toast, isConsolidating]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const courseRes = await fetch(`/api/courses/${courseId}`);
                if (!courseRes.ok) throw new Error("Course not found");
                const courseData = await courseRes.json();
                setCourse(courseData);

                if (user) {
                    const enrollmentRes = await fetch(`/api/enrollment/status/${user.id}/${courseId}`);
                    if (enrollmentRes.ok) {
                        const { isEnrolled: enrolledStatus, enrollmentId: id } = await enrollmentRes.json();
                        setIsEnrolled(enrolledStatus);
                        setEnrollmentId(id);

                        if (enrolledStatus) {
                            await fetchProgress(user.id, courseId);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch course data", error);
                toast({ title: 'Error', description: 'No se pudo cargar el curso.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [courseId, user, toast, fetchProgress]);

    useEffect(() => {
        setShowBackButton(true);
        return () => setShowBackButton(false);
    }, [setShowBackButton]);

    useEffect(() => {
        if (isLoading || !course) return;

        setPageTitle(course.title);

        const lessonToSelect = lessonIdFromQuery || firstLessonId;
        if (lessonToSelect && selectedLessonId !== lessonToSelect) {
            setSelectedLessonId(lessonToSelect);
        }

        const lesson = allLessons.find(l => l.id === lessonToSelect);
        if (!lesson) return;

        const isVideoLesson = lesson.contentBlocks.some(b => b.type === 'VIDEO');
        const isLocked = isLessonLocked(lessonToSelect);

        if (user && isEnrolled && !isCreatorViewingCourse && !isVideoLesson && !isLocked && lessonToSelect) {
            // Record interaction only if lesson is not already completed
            if (!completedLessonIds.has(lessonToSelect)) {
                recordInteraction(lessonToSelect, 'view');
            }
        }
    }, [isLoading, course, lessonIdFromQuery, firstLessonId, user, isEnrolled, recordInteraction, isCreatorViewingCourse, selectedLessonId, allLessons, setPageTitle, completedLessonIds, isLessonLocked]);

    const handleQuizSubmitted = useCallback(async (lessonId: string) => {
        if (user && courseId) {
            await fetchProgress(user.id, courseId);
        }
    }, [user, courseId, fetchProgress]);

    const handleVideoEnd = useCallback(() => {
        if (selectedLessonId) {
            recordInteraction(selectedLessonId, 'video');
        }
    }, [recordInteraction, selectedLessonId]);

    const selectedLesson = useMemo(() => {
        if (!selectedLessonId || !course) return null;
        let foundModule: AppModule | undefined;
        const lesson = course.modules.flatMap(m => {
            const found = m.lessons.find(l => l.id === selectedLessonId);
            if (found) foundModule = m;
            return found ? [found] : [];
        })[0];

        if (lesson && foundModule) {
            return { ...lesson, moduleTitle: foundModule.title };
        }
        return null;
    }, [selectedLessonId, course]);


    const filteredModules = useMemo(() => {
        if (!course) return [];
        if (!sidebarSearch.trim()) return course.modules;

        const searchTerm = sidebarSearch.toLowerCase();
        return course.modules.map(module => {
            const filteredLessons = module.lessons.filter(lesson =>
                lesson.title.toLowerCase().includes(searchTerm)
            );
            return { ...module, lessons: filteredLessons };
        }).filter(module =>
            module.title.toLowerCase().includes(searchTerm) || module.lessons.length > 0
        );
    }, [course, sidebarSearch]);

    const handleLessonSelect = (lesson: AppLesson, isLocked: boolean) => {
        if (isLocked) {
            toast({ title: "Lección Bloqueada", description: "Debes completar la lección anterior para continuar.", variant: "default" });
            return;
        }
        setSelectedLessonId(lesson.id);
        if (isMobile) {
            setIsMobileSheetOpen(false);
        }
        const isVideoLesson = lesson.contentBlocks.some(b => b.type === 'VIDEO');
        if (!isVideoLesson) {
            recordInteraction(lesson.id, 'view');
        }
        router.push(`/courses/${courseId}?lesson=${lesson.id}`, { scroll: false });
    };

    const renderContentBlock = (block: ContentBlock, index: number, allBlocks: ContentBlock[]) => {
        const url = block.content || '';
        const isTextFollowedByImage = block.type === 'TEXT' && allBlocks[index + 1]?.type === 'FILE' && /\.(jpg|jpeg|png|gif|webp)$/i.test(allBlocks[index + 1].content || '');

        if (isTextFollowedByImage) {
            const textBlock = block;
            const imageBlock = allBlocks[index + 1];
            return (
                <div key={textBlock.id + '-' + imageBlock.id} className="grid grid-cols-1 md:grid-cols-10 gap-8 my-4 items-center">
                    <div className="md:col-span-6 prose dark:prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: textBlock.content || '' }} />
                    <div className="md:col-span-4 relative aspect-square p-2 cursor-pointer" onClick={() => setImageToView(imageBlock.content)}>
                        <Image src={imageBlock.content!} alt="Visual support for lesson content" fill className="object-contain rounded-lg" priority quality={100} data-ai-hint="lesson visual aid" />
                    </div>
                </div>
            );
        }

        const isImagePrecededByText = block.type === 'FILE' && allBlocks[index - 1]?.type === 'TEXT' && /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        if (isImagePrecededByText) {
            return null; // Don't render this image block separately, it's handled with the text block.
        }

        if (block.type === 'VIDEO') return <VideoPlayer key={block.id} videoUrl={url} lessonTitle={selectedLesson?.title} onVideoEnd={handleVideoEnd} />;
        if (block.type === 'QUIZ') return <QuizViewer key={block.id} quiz={block.quiz} lessonId={selectedLessonId!} courseId={courseId} isEnrolled={isEnrolled} isCreatorPreview={isCreatorViewingCourse} onQuizCompleted={handleQuizSubmitted} />;

        if (block.type === 'TEXT') {
            const isExternalUrl = /^(https?:\/\/)/.test(url.trim());
            if (isExternalUrl) {
                return (
                    <div key={block.id} className="my-4 p-4 border rounded-md bg-card hover:bg-muted/50 transition-colors">
                        <a href={url.trim()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-primary font-semibold group">
                            <ExternalLink className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors" />
                            <span className="group-hover:underline underline-offset-4">{url.trim()}</span>
                        </a>
                    </div>
                );
            }
            return <div key={block.id} className="prose dark:prose-invert prose-sm max-w-none my-4" dangerouslySetInnerHTML={{ __html: url }} />;
        }

        if (block.type === 'FILE') {
            const isPdf = url.toLowerCase().endsWith('.pdf');
            if (isPdf) return <div key={block.id} className="my-4"><PdfViewer url={url} /></div>;

            const isOfficeDoc = url.toLowerCase().endsWith('.docx');

            if (isOfficeDoc) return <div key={block.id} className="my-4"><DocxPreviewer url={url} /></div>;

            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url.toLowerCase());
            if (isImage) {
                return (
                    <div key={block.id} className="my-4 p-2 bg-muted/30 rounded-md flex justify-center group relative cursor-pointer" onClick={() => setImageToView(url)}>
                        <div className="relative aspect-video w-full max-w-4xl p-2">
                            <Image src={url} alt={`Preview: ${selectedLesson?.title}`} fill className="object-contain p-2" priority quality={100} data-ai-hint="lesson file" />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Expand className="h-12 w-12 text-white" />
                        </div>
                    </div>
                );
            }

            const isNativeVideo = /\.(mp4|webm|ogg)$/i.test(url.toLowerCase());
            if (isNativeVideo) {
                return (
                    <div key={block.id} className="my-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Tv2 className="h-4 w-4" />
                            <span>Video de la lección</span>
                        </div>
                        <VideoPlayer videoUrl={url} lessonTitle={selectedLesson?.title} onVideoEnd={handleVideoEnd} />
                    </div>
                );
            }

            return (
                <div key={block.id} className="my-4 p-4 bg-muted/50 rounded-md text-center border-t">
                    <p className="text-sm text-muted-foreground mb-2">Este recurso es un archivo descargable:</p>
                    <Button asChild size="sm" variant="secondary">
                        <Link href={url} target="_blank" rel="noopener noreferrer" download>
                            <Download className="mr-2 h-4 w-4" /> Descargar Archivo
                        </Link>
                    </Button>
                </div>
            );
        }

        return null;
    };

    const renderLessonContent = () => {
        if (!selectedLesson) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <BookOpenText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">Selecciona una lección</h3>
                    <p className="text-muted-foreground">Elige una lección del menú para comenzar a aprender.</p>
                </div>
            )
        }

        if (isLessonLocked(selectedLesson.id)) {
            return (
                <Card className="p-12 text-center flex flex-col items-center justify-center space-y-4 border-dashed bg-muted/30">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-2">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold italic opacity-80">Lección Bloqueada</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Debes completar todas las lecciones anteriores de este curso para poder acceder a este contenido.
                    </p>
                    <Button variant="outline" onClick={() => {
                        const firstIncomplete = allLessons.find(l => !completedLessonIds.has(l.id));
                        if (firstIncomplete) handleLessonSelect(firstIncomplete, false);
                    }}>
                        Ir a la lección pendiente
                    </Button>
                </Card>
            )
        }

        const hasContent = selectedLesson.contentBlocks && selectedLesson.contentBlocks.length > 0 && selectedLesson.contentBlocks.some(b => b.content || b.type === 'QUIZ');

        if (hasContent) {
            return (
                <Card className="p-4 sm:p-6">
                    <CardContent className="p-0">
                        <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            <h2>{selectedLesson.title}</h2>
                        </div>
                        {selectedLesson.contentBlocks.map((block, index, allBlocks) => renderContentBlock(block, index, allBlocks))}
                    </CardContent>
                </Card>
            )
        }

        if (isCreatorViewingCourse) {
            return (
                <Card className="text-center p-8 border-dashed">
                    <CardHeader>
                        <CardTitle>Esta lección está vacía</CardTitle>
                        <CardDescription>Como instructor, puedes añadir contenido para tus estudiantes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href={`/manage-courses/${courseId}/edit`}>
                                <Edit className="mr-2 h-4 w-4" /> Ir al Editor de Curso
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            );
        } else {
            return (
                <div className="text-center p-8 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">El contenido de esta lección estará disponible próximamente.</p>
                </div>
            );
        }
    }

    const SidebarContent = () => {
        let lessonCounter = 0;
        return (
            <div className="flex flex-col h-full bg-card">
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar lección..."
                            className="pl-9 h-9"
                            value={sidebarSearch}
                            onChange={(e) => setSidebarSearch(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <Accordion type="multiple" defaultValue={course?.modules.map(m => m.id)} className="w-full p-2">
                        {filteredModules.map((moduleItem) => {
                            const lessonsInModule = allLessons.filter(l => l.moduleId === moduleItem.id);
                            return (
                                <AccordionItem value={moduleItem.id} key={moduleItem.id} className="border-b-0 mb-1">
                                    <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2 px-2 hover:bg-muted/50 rounded-md">
                                        <span className="text-left">{moduleItem.title}</span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-1 pb-1 pr-0 pl-2">
                                        {moduleItem.lessons.length > 0 ? (
                                            <ul className="space-y-1 border-l-2 border-primary/20 ml-2 pl-4">
                                                {moduleItem.lessons.map(lesson => {
                                                    const isCompleted = completedLessonIds.has(lesson.id);
                                                    const isLocked = isLessonLocked(lesson.id);

                                                    return (
                                                        <li key={lesson.id} className="py-0.5">
                                                            <button
                                                                onClick={() => handleLessonSelect(lesson, isLocked)}
                                                                disabled={isLocked}
                                                                className={cn(
                                                                    "w-full text-left text-sm flex items-start gap-2 p-2 rounded-md transition-colors",
                                                                    selectedLessonId === lesson.id
                                                                        ? "bg-primary/10 text-primary font-medium"
                                                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                                                    isLocked && "opacity-50 cursor-not-allowed hover:bg-transparent"
                                                                )}
                                                            >
                                                                <div className="flex-shrink-0 mt-0.5">
                                                                    {isLocked ? <Lock className="h-4 w-4 text-muted-foreground" />
                                                                        : isCompleted ? <CheckCircle className="h-4 w-4 text-green-500" />
                                                                            : <BookOpenText className="h-4 w-4 text-primary/70" />}
                                                                </div>
                                                                <span className="flex-grow">{lesson.title}</span>
                                                            </button>
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        ) : (
                                            <p className="text-muted-foreground text-xs text-center py-2 italic">No hay lecciones en este módulo.</p>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                    {filteredModules.length === 0 && (
                        <p className="text-muted-foreground text-xs text-center py-4 px-2">No se encontraron lecciones que coincidan con la búsqueda.</p>
                    )}
                </ScrollArea>
                {!isCreatorViewingCourse && isEnrolled && (
                    <div className="p-4 border-t space-y-3">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full">
                                    <LineChart className="mr-2 h-4 w-4" /> Ver Mi Progreso
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-sm text-center p-6">
                                <DialogHeader>
                                    <DialogTitle>Tu Progreso en {course.title}</DialogTitle>
                                    <DialogDescription>
                                        {courseProgress?.progressPercentage === 100
                                            ? "¡Felicidades! Has completado el curso."
                                            : "Este es tu avance actual. ¡Sigue así!"
                                        }
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                                    <CircularProgress value={courseProgress?.progressPercentage || 0} size={150} strokeWidth={12} />
                                    {completedLessonIds.size === totalLessonsCount && !courseProgress?.completedAt && (
                                        <Button onClick={handleConsolidateProgress} disabled={isConsolidating}>
                                            {isConsolidating ? <div className="w-4 h-4 mr-2"><ColorfulLoader /></div> : <CheckCircle className="mr-2 h-4 w-4" />}
                                            Calcular Puntuación Final
                                        </Button>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                        {courseProgress?.completedAt && course.certificateTemplateId && enrollmentId && (
                            <Button asChild size="sm" className="w-full bg-amber-500 hover:bg-amber-600">
                                <Link href={`/certificates/${enrollmentId}/view`} target="_blank">
                                    <Award className="mr-2 h-4 w-4" /> Ver Certificado
                                </Link>
                            </Button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-12 h-12 mb-4"><ColorfulLoader /></div>
                <h3 className="text-xl font-semibold">Cargando curso...</h3>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-semibold">Error</h3>
                <p className="text-muted-foreground">No se pudo cargar el curso.</p>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-5rem)] md:h-auto md:relative">
            {!isMobile && isSidebarVisible && (
                <aside className="w-80 flex-shrink-0 border-r bg-card flex flex-col sticky top-20 self-start max-h-[calc(100vh-5rem)]">
                    <SidebarContent />
                </aside>
            )}

            <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                <SheetContent side="left" className="p-0 w-full max-w-sm">
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle>Contenido del Curso</SheetTitle>
                    </SheetHeader>
                    <SidebarContent />
                </SheetContent>
            </Sheet>

            <div className={cn(
                "flex-1 flex flex-col min-w-0 transition-[margin-right] duration-300 ease-in-out",
                isNotesPanelOpen && !isMobile && "mr-[28rem]"
            )}>
                <main className="flex-1 overflow-y-auto thin-scrollbar">
                    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
                        {renderLessonContent()}
                    </div>
                </main>
            </div>

            {isNotesPanelOpen && !isMobile && (
                <aside className="w-full max-w-md md:w-[28rem] flex-shrink-0 fixed top-20 right-0 z-20 h-[calc(100vh-5rem)]">
                    {selectedLessonId && isEnrolled && (
                        <LessonNotesPanel
                            lessonId={selectedLessonId}
                            isOpen={isNotesPanelOpen}
                            onClose={() => setIsNotesPanelOpen(false)}
                        />
                    )}
                </aside>
            )}

            <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-3">
                {isMobile && (
                    <Button size="icon" className="rounded-full h-12 w-12 shadow-lg" onClick={() => setIsMobileSheetOpen(true)}>
                        <PanelLeft className="h-5 w-5" />
                    </Button>
                )}
                {!isMobile && (
                    <Button size="icon" className="rounded-full h-12 w-12 shadow-lg" onClick={() => setIsSidebarVisible(!isSidebarVisible)}>
                        <PanelLeft className="h-5 w-5" />
                    </Button>
                )}
                {isEnrolled && !isCreatorViewingCourse && (
                    <Sheet open={isMobile && isNotesPanelOpen} onOpenChange={setIsNotesPanelOpen}>
                        <SheetTrigger asChild>
                            <Button
                                size="icon"
                                className={cn(
                                    "rounded-full h-12 w-12 shadow-lg transition-colors",
                                    isNotesPanelOpen && "bg-primary text-primary-foreground"
                                )}
                                onClick={() => !isMobile && setIsNotesPanelOpen(!isNotesPanelOpen)}>
                                <Notebook className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        {isMobile && (
                            <SheetContent side="right" className="p-0 w-full max-w-sm">
                                {selectedLessonId && (
                                    <LessonNotesPanel
                                        lessonId={selectedLessonId}
                                        isOpen={isNotesPanelOpen}
                                        onClose={() => setIsNotesPanelOpen(false)}
                                    />
                                )}
                            </SheetContent>
                        )}
                    </Sheet>
                )}
            </div>

            <Dialog open={!!imageToView} onOpenChange={(isOpen) => !isOpen && setImageToView(null)}>
                <DialogContent className="w-screen h-screen max-w-full max-h-full p-2 flex items-center justify-center bg-black/80 backdrop-blur-sm border-0 rounded-none">
                    <DialogHeader>
                        <DialogTitle className="sr-only">Visor de Imagen</DialogTitle>
                    </DialogHeader>
                    <div className="absolute top-4 right-4 z-50">
                        <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-white/20" onClick={() => setImageToView(null)}>
                            <X className="h-6 w-6" />
                            <span className="sr-only">Cerrar</span>
                        </Button>
                    </div>
                    <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
                        <Image
                            src={imageToView || ''}
                            alt="Vista ampliada de la imagen de la lección"
                            fill
                            className="object-contain"
                            quality={100}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
