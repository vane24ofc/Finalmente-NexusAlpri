// src/components/resources/playlist-creator-modal.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Video, Trash2, Edit, Save, PlusCircle, PlaySquare, GripVertical, UploadCloud, BrainCircuit, Youtube } from 'lucide-react';
import type { AppResourceType, User as AppUser, Process, ResourceSharingMode, Quiz as AppQuiz } from '@/types';
import { DndContext, DragEndEvent, closestCenter, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getYoutubeVideoId } from '@/lib/resource-utils';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileIcon } from '@/components/ui/file-icon';
import { UploadArea } from '@/components/ui/upload-area';
import { uploadWithProgress } from '@/lib/upload-with-progress';
import { Progress } from '@/components/ui/progress';
import { QuizEditorModal } from '@/components/quizz-it/quiz-editor-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResourcePermissions } from './shared/resource-permissions';

const generateUniqueId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

interface ContentBlock {
    id: string;
    type: 'VIDEO' | 'QUIZ';
    title: string;
    url?: string; // Para videos
    quiz?: AppQuiz; // Para quizzes
}


const SortableItem = ({ block, onRemove }: { block: ContentBlock, onRemove: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

    // Smooth transition style
    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    const isVideo = block.type === 'VIDEO';
    const youtubeId = isVideo ? getYoutubeVideoId(block.url) : null;
    const isYoutube = !!youtubeId;
    const fileExtension = youtubeId ? 'youtube' : (block.url?.split('.').pop() || 'mp4');

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative p-3 bg-card border rounded-xl flex items-center gap-3 touch-none transition-all shadow-sm hover:shadow-md hover:border-primary/30",
                isDragging && "shadow-xl border-primary ring-2 ring-primary/10 scale-[1.02] opacity-90"
            )}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                <GripVertical className="h-5 w-5" />
            </div>

            <div className="w-24 h-16 flex-shrink-0 bg-muted/30 rounded-lg overflow-hidden relative border flex items-center justify-center">
                {isVideo ? (
                    isYoutube ? (
                        <div className="relative w-full h-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                                alt="Thumbnail"
                                className="object-cover w-full h-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Youtube className="h-6 w-6 text-white drop-shadow-md" />
                            </div>
                        </div>
                    ) : (
                        <FileIcon displayMode="grid" type={fileExtension} thumbnailUrl={block.url} className="w-10 h-10" />
                    )
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500">
                        <BrainCircuit className="h-8 w-8 opacity-80" />
                    </div>
                )}
            </div>

            <div className="flex-grow min-w-0 flex flex-col justify-center gap-0.5">
                <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full select-none",
                        isVideo ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                    )}>
                        {isVideo ? (isYoutube ? 'YouTube' : 'Video Local') : 'Evaluación'}
                    </span>
                </div>
                <p className="font-medium text-sm truncate leading-snug">{block.title}</p>
                {isVideo && <p className="text-xs text-muted-foreground truncate opacity-70 font-mono">{block.url}</p>}
            </div>

            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={onRemove}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
};


interface PlaylistCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentId: string | null;
    onSave: () => void;
    playlistToEdit?: AppResourceType & { children?: AppResourceType[] } | null;
}

interface FlatProcess {
    id: string;
    name: string;
    level: number;
}


export function PlaylistCreatorModal({ isOpen, onClose, parentId, onSave, playlistToEdit }: PlaylistCreatorModalProps) {
    const { toast } = useToast();
    const { user, settings } = useAuth();
    const isEditing = !!playlistToEdit;

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);

    // Adding content state
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [uploads, setUploads] = useState<any[]>([]);
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);

    // Quiz state
    const [quizToEdit, setQuizToEdit] = useState<AppQuiz | null>(null);
    const [isQuizEditorOpen, setIsQuizEditorOpen] = useState(false);

    // Permissions state
    const [sharingMode, setSharingMode] = useState<ResourceSharingMode>('PUBLIC');
    const [sharedWithUserIds, setSharedWithUserIds] = useState<string[]>([]);
    const [sharedWithProcessIds, setSharedWithProcessIds] = useState<string[]>([]);
    const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);

    // API data
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [allProcesses, setAllProcesses] = useState<Process[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('info');


    const flattenProcesses = (processList: Process[], level = 0): FlatProcess[] => {
        let list: FlatProcess[] = [];
        processList.forEach(p => {
            list.push({ id: p.id, name: p.name, level });
            if (p.children && p.children.length > 0) {
                list.push(...flattenProcesses(p.children, level + 1));
            }
        });
        return list;
    };
    const flattenedProcesses = flattenProcesses(allProcesses);


    useEffect(() => {
        if (isOpen) {
            if (isEditing && playlistToEdit) {
                setTitle(playlistToEdit.title);
                setDescription(playlistToEdit.description || '');
                setCategory(playlistToEdit.category || (settings?.resourceCategories[0] || 'General'));
                const videoBlocks: ContentBlock[] = (playlistToEdit.children || [])
                    .map(c => ({ id: c.id, type: 'VIDEO', title: c.title, url: c.url || '' }));
                const quizBlock = playlistToEdit.quiz ? [{ id: `quiz-${playlistToEdit.quiz.id}`, type: 'QUIZ' as const, title: playlistToEdit.quiz.title, quiz: playlistToEdit.quiz }] : [];
                setContentBlocks([...videoBlocks, ...quizBlock]);

                setSharingMode(playlistToEdit.sharingMode);
                setSharedWithUserIds(playlistToEdit.sharedWith?.map(u => u.id) || []);
                setSharedWithProcessIds(playlistToEdit.sharedWithProcesses?.map(p => p.id) || []);
                setCollaboratorIds(playlistToEdit.collaborators?.map(u => u.id) || []);
                setActiveTab('content'); // Focus on content usually for playlists
            } else {
                setTitle('');
                setDescription('');
                setCategory(settings?.resourceCategories[0] || 'General');
                setContentBlocks([]);
                setSharingMode('PUBLIC');
                setSharedWithUserIds([]);
                setSharedWithProcessIds([]);
                setCollaboratorIds([]);
                setActiveTab('info');
            }
            setUploads([]);

            if (user?.role === 'ADMINISTRATOR' || user?.role === 'INSTRUCTOR') {
                Promise.all([
                    fetch('/api/users/list').then(res => res.json()),
                    fetch('/api/processes?format=flat').then(res => res.json())
                ]).then(([usersData, processesData]) => {
                    setAllUsers(usersData.users || []);
                    setAllProcesses(processesData || []);
                }).catch(console.error);
            }
        }
    }, [playlistToEdit, isOpen, isEditing, user, settings]);

    const handleAddYoutubeVideo = async () => {
        if (!newVideoUrl.trim()) return;
        const videoId = getYoutubeVideoId(newVideoUrl);
        if (!videoId) {
            toast({ title: 'URL Inválida', description: 'Por favor, ingresa una URL de YouTube válida.', variant: 'destructive' });
            return;
        }
        setIsFetchingInfo(true);
        try {
            const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            if (!response.ok) throw new Error('No se pudo obtener la información del video.');
            const data = await response.json();
            const newVideoBlock: ContentBlock = { id: generateUniqueId('vid'), type: 'VIDEO', title: data.title, url: newVideoUrl };
            setContentBlocks(prev => [...prev, newVideoBlock]);
            setNewVideoUrl('');
            toast({ description: "Video añadido correctamente." });
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        } finally {
            setIsFetchingInfo(false);
        }
    }

    const handleFileUpload = async (file: File) => {
        const newUpload = {
            id: `upload-${file.name}-${Date.now()}`,
            file,
            progress: 0,
            error: null,
        };
        setUploads(prev => [...prev, newUpload]);

        try {
            const result = await uploadWithProgress('/api/upload/resource-file', file, (progress) => {
                setUploads(prev => prev.map(up => up.id === newUpload.id ? { ...up, progress } : up));
            });
            const newVideoBlock: ContentBlock = { id: generateUniqueId('vid'), type: 'VIDEO', title: file.name, url: result.url };
            setContentBlocks(prev => [...prev, newVideoBlock]);
            setUploads(prev => prev.filter(up => up.id !== newUpload.id));
            toast({ description: "Video subido correctamente." });
        } catch (err) {
            setUploads(prev => prev.map(up => up.id === newUpload.id ? { ...up, error: (err as Error).message, progress: 100 } : up));
            toast({ title: "Error de subida", description: (err as Error).message, variant: 'destructive' });
        }
    };

    const handleRemoveBlock = (idToRemove: string) => {
        setContentBlocks(prev => prev.filter(v => v.id !== idToRemove));
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setContentBlocks((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const videosToSave = contentBlocks.filter(b => b.type === 'VIDEO');
        const quizToSave = contentBlocks.find(b => b.type === 'QUIZ')?.quiz || null;

        try {
            const endpoint = isEditing ? `/api/resources/${playlistToEdit!.id}` : '/api/resources';
            const method = isEditing ? 'PUT' : 'POST';

            const payload = {
                title, description, category, parentId,
                type: 'VIDEO_PLAYLIST',
                videos: videosToSave.map(v => ({ id: v.id, title: v.title, url: v.url })),
                quiz: quizToSave,
                sharingMode, sharedWithUserIds, sharedWithProcessIds, collaboratorIds
            };

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error((await response.json()).message || 'No se pudo guardar la lista.');

            toast({ title: '¡Éxito!', description: `Lista de videos ${isEditing ? 'actualizada' : 'creada'}.` });
            onSave();
            onClose();
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveQuiz = (updatedQuiz: AppQuiz) => {
        const quizExists = contentBlocks.some(b => b.type === 'QUIZ');

        if (quizExists) {
            setContentBlocks(prev => prev.map(block =>
                block.type === 'QUIZ' ? { ...block, title: updatedQuiz.title, quiz: updatedQuiz } : block
            ));
        } else {
            const newQuizBlock: ContentBlock = { id: `quiz-${updatedQuiz.id}`, type: 'QUIZ', title: updatedQuiz.title, quiz: updatedQuiz };
            setContentBlocks(prev => [...prev, newQuizBlock]);
        }

        setIsQuizEditorOpen(false);
        toast({ description: "Quiz actualizado. Recuerda guardar los cambios de la lista." });
    };

    const handleEditQuiz = () => {
        const existingQuiz = contentBlocks.find(b => b.type === 'QUIZ')?.quiz;
        setQuizToEdit(existingQuiz || {
            id: generateUniqueId('quiz'),
            title: `Evaluación de ${title || 'la lista'}`,
            questions: [],
            maxAttempts: null,
        });
        setIsQuizEditorOpen(true);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-4xl p-0 gap-0 rounded-2xl h-[90vh] flex flex-col bg-background/95 backdrop-blur-xl border-border/50 transition-all duration-300">
                <DialogHeader className="p-6 pb-4 border-b flex-shrink-0 bg-background/50">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                        <div className="p-2 rounded-xl bg-orange-500/10">
                            <PlaySquare className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        {isEditing ? 'Editar Lista de Videos' : 'Nueva Lista de Videos'}
                    </DialogTitle>
                </DialogHeader>

                <form id="playlist-form" onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
                        <div className="px-6 pt-4 flex-shrink-0">
                            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
                                <TabsTrigger value="info" className="rounded-lg">Información</TabsTrigger>
                                <TabsTrigger value="content" className="rounded-lg">Videos y Quiz</TabsTrigger>
                                <TabsTrigger value="access" className="rounded-lg">Acceso</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 min-h-0">
                            <ScrollArea className="h-full">
                                <div className="p-6 space-y-6">
                                    <TabsContent value="main" className="space-y-6 m-0 focus-visible:ring-0">
                                        {/* Legacy value mapping */}
                                    </TabsContent>
                                    <TabsContent value="info" className="space-y-4 m-0 focus-visible:ring-0 animate-in slide-in-from-left-4 fade-in duration-300">
                                        <div className="space-y-2">
                                            <Label htmlFor="title" className="text-sm font-semibold">Título de la Lista</Label>
                                            <Input
                                                id="title"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                required
                                                className="h-11 bg-muted/30 focus:bg-background transition-all"
                                                placeholder="Ej: Curso de Introducción a React"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description" className="text-sm font-semibold">Descripción</Label>
                                            <Textarea
                                                id="description"
                                                value={description}
                                                onChange={e => setDescription(e.target.value)}
                                                className="min-h-[100px] resize-none bg-muted/30 focus:bg-background transition-all"
                                                placeholder="Describe el objetivo de aprendizaje de esta lista..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="category" className="text-sm font-semibold">Categoría</Label>
                                            <Select value={category} onValueChange={setCategory} required>
                                                <SelectTrigger className="h-11 bg-muted/30 focus:bg-background">
                                                    <SelectValue placeholder="Selecciona..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(settings?.resourceCategories || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="content" className="space-y-6 m-0 focus-visible:ring-0 animate-in slide-in-from-right-4 fade-in duration-300">
                                        <Card className="border-border/50 shadow-sm">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                                    <PlusCircle className="h-4 w-4 text-primary" /> Añadir Contenido
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <div className="flex-1 flex gap-2">
                                                        <Input
                                                            value={newVideoUrl}
                                                            onChange={e => setNewVideoUrl(e.target.value)}
                                                            placeholder="Pega una URL de YouTube..."
                                                            className="h-10 bg-background"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={handleAddYoutubeVideo}
                                                            disabled={isFetchingInfo || !newVideoUrl}
                                                            className="h-10 shrink-0"
                                                        >
                                                            {isFetchingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Añadir'}
                                                        </Button>
                                                    </div>
                                                    <div className="shrink-0 flex items-center gap-2 border-l pl-3 ml-1">
                                                        <Label className="text-xs text-muted-foreground hidden sm:block">O sube un video:</Label>
                                                        <UploadArea onFileSelect={(files) => files && handleFileUpload(files[0])} disabled={isSaving} className="h-10 w-10 p-0 shrink-0" >
                                                            <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                        </UploadArea>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-sm font-semibold">Secuencia de Aprendizaje</Label>
                                                <span className="text-xs text-muted-foreground">{contentBlocks.length} items</span>
                                            </div>

                                            <div className="space-y-3 min-h-[200px] rounded-xl bg-muted/20 border p-3">
                                                {uploads.map(up => (
                                                    <div key={up.id} className="p-3 border rounded-xl bg-background relative animate-in fade-in slide-in-from-bottom-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-muted rounded-lg"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{up.file.name}</p>
                                                                <Progress value={up.progress} className="h-1.5 mt-2 rounded-full" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                                    <SortableContext items={contentBlocks.map(v => v.id)} strategy={verticalListSortingStrategy}>
                                                        <div className="flex flex-col gap-2">
                                                            {contentBlocks.map((block) => (
                                                                <SortableItem key={block.id} block={block} onRemove={() => handleRemoveBlock(block.id)} />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </DndContext>

                                                {contentBlocks.length === 0 && uploads.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg border-muted">
                                                        <PlaySquare className="h-10 w-10 mb-3 opacity-20" />
                                                        <p>La lista está vacía.</p>
                                                        <p className="text-xs">Añade videos o evaluaciones arriba.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <Card className={cn("transition-all duration-300", contentBlocks.some(b => b.type === 'QUIZ') ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20" : "border-dashed")}>
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("p-2 rounded-full", contentBlocks.some(b => b.type === 'QUIZ') ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground")}>
                                                        <BrainCircuit className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">Evaluación Final</p>
                                                        <p className="text-xs text-muted-foreground">Validar el conocimiento.</p>
                                                    </div>
                                                </div>
                                                <Button variant={contentBlocks.some(b => b.type === 'QUIZ') ? "default" : "outline"} size="sm" onClick={handleEditQuiz} type="button">
                                                    {contentBlocks.some(b => b.type === 'QUIZ') ? <Edit className="mr-2 h-3.5 w-3.5" /> : <PlusCircle className="mr-2 h-3.5 w-3.5" />}
                                                    {contentBlocks.some(b => b.type === 'QUIZ') ? 'Editar Quiz' : 'Añadir Quiz'}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="access" className="m-0 focus-visible:ring-0 animate-in slide-in-from-right-4 fade-in duration-300">
                                        <ResourcePermissions
                                            sharingMode={sharingMode}
                                            setSharingMode={setSharingMode}
                                            sharedWithUserIds={sharedWithUserIds}
                                            setSharedWithUserIds={setSharedWithUserIds}
                                            sharedWithProcessIds={sharedWithProcessIds}
                                            setSharedWithProcessIds={setSharedWithProcessIds}
                                            collaboratorIds={collaboratorIds}
                                            setCollaboratorIds={setCollaboratorIds}
                                            allUsers={allUsers}
                                            flattenedProcesses={flattenedProcesses}
                                        />
                                    </TabsContent>
                                </div>
                            </ScrollArea>
                        </div>

                        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 flex-row justify-end gap-2 bg-background/50 backdrop-blur-sm">
                            <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                            <Button type="submit" form="playlist-form" disabled={isSaving || !title.trim() || contentBlocks.filter(b => b.type === 'VIDEO').length === 0} className="min-w-[140px] shadow-lg shadow-orange-500/20 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-none">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {isEditing ? 'Guardar Cambios' : 'Crear Lista'}
                            </Button>
                        </DialogFooter>
                    </Tabs>
                </form>
            </DialogContent>

            {isQuizEditorOpen && (
                <QuizEditorModal
                    isOpen={isQuizEditorOpen}
                    onClose={() => setIsQuizEditorOpen(false)}
                    quiz={contentBlocks.find(b => b.type === 'QUIZ')?.quiz || {
                        id: `new-quiz-${Date.now()}`,
                        title: `Evaluación de ${title || 'la lista'}`,
                        questions: [],
                        maxAttempts: null,
                    }}
                    onSave={handleSaveQuiz}
                />
            )}
        </Dialog>
    );
}
