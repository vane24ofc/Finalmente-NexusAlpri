// src/components/resources/resource-editor-modal.tsx
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, FileUp, Link as LinkIcon, FilePenLine, ArrowLeft, ArrowRight, UploadCloud, FileText as FileGenericIcon, Edit, BrainCircuit, PlusCircle, Trash2, Calendar as CalendarIcon, FileText } from 'lucide-react';
import type { AppResourceType, User as AppUser, Process, ResourceSharingMode, Quiz as AppQuiz } from '@/types';
import { UploadArea } from '@/components/ui/upload-area';
import { uploadWithProgress } from '@/lib/upload-with-progress';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { formatFileSize, cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FolderContentView } from '@/components/resources/folder-content-view';
import { QuizEditorModal } from '@/components/quizz-it/quiz-editor-modal';
import { ResourcePermissions } from './shared/resource-permissions';

interface ResourceEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    resource: AppResourceType | null;
    parentId: string | null;
    onSave: () => void;
}

interface FlatProcess {
    id: string;
    name: string;
    level: number;
}

const STEPS = [
    { id: 'info', name: 'Información Básica' },
    { id: 'content', name: 'Contenido y Visibilidad' },
];

const ProgressBar = ({ currentStep }: { currentStep: number }) => {
    return (
        <div className="flex w-full px-12 pb-4">
            {STEPS.map((step, index) => {
                const stepIndex = index + 1;
                const isCompleted = currentStep > stepIndex;
                const isActive = currentStep === stepIndex;

                return (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center relative z-10 group">
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 shadow-sm",
                                    isActive ? "bg-primary border-primary text-primary-foreground scale-110 shadow-primary/25" : isCompleted ? "bg-primary/90 border-primary/90 text-primary-foreground" : "bg-card border-border text-muted-foreground"
                                )}
                            >
                                {isCompleted ? '✓' : stepIndex}
                            </div>
                            <p className={cn("text-xs mt-2 font-medium transition-colors duration-300 absolute -bottom-6 w-32 text-center", isActive ? "text-primary font-bold" : "text-muted-foreground")}>{step.name}</p>
                        </div>
                        {stepIndex < STEPS.length && (
                            <div className="flex-1 h-0.5 relative mx-2 top-[-10px]">
                                <div className="absolute inset-0 bg-border" />
                                <motion.div
                                    className="absolute inset-0 bg-primary"
                                    initial={{ width: "0%" }}
                                    animate={{ width: isCompleted ? "100%" : "0%" }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};


export function ResourceEditorModal({ isOpen, onClose, resource, parentId, onSave }: ResourceEditorModalProps) {
    const { toast } = useToast();
    const { user, settings } = useAuth();
    const isEditing = !!resource;
    const isEditingFolder = isEditing && resource?.type === 'FOLDER';

    // Step management for CREATION
    const [creationStep, setCreationStep] = useState(1);
    const [activeEditTab, setActiveEditTab] = useState('info');

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
    const [resourceType, setResourceType] = useState<AppResourceType['type']>('DOCUMENT');

    // Content state
    const [externalLink, setExternalLink] = useState('');
    const [editableContent, setEditableContent] = useState('');
    const [observations, setObservations] = useState('');
    const [tags, setTags] = useState<string[]>([]);

    // Upload state
    const [upload, setUpload] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Quiz state
    const [quiz, setQuiz] = useState<AppQuiz | null>(null);
    const [isQuizEditorOpen, setIsQuizEditorOpen] = useState(false);

    // Permissions state
    const [sharingMode, setSharingMode] = useState<ResourceSharingMode>('PUBLIC');
    const [sharedWithUserIds, setSharedWithUserIds] = useState<string[]>([]);
    const [sharedWithProcessIds, setSharedWithProcessIds] = useState<string[]>([]);
    const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);

    // API data
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [allProcesses, setAllProcesses] = useState<Process[]>([]);
    const [folderContent, setFolderContent] = useState<AppResourceType[]>([]);
    const [isLoadingFolderContent, setIsLoadingFolderContent] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    const resetForm = useCallback(() => {
        setCreationStep(1);
        setTitle(''); setDescription('');
        setCategory(settings?.resourceCategories[0] || 'General');
        setExpiresAt(undefined); setResourceType('DOCUMENT');
        setExternalLink(''); setEditableContent(''); setObservations('');
        setUpload(null); setSharingMode('PUBLIC');
        setTags([]);
        setSharedWithUserIds([]); setSharedWithProcessIds([]); setCollaboratorIds([]);
        setQuiz(null);
    }, [settings]);

    const flattenProcesses = useCallback((processList: any[], level = 0): FlatProcess[] => {
        let list: FlatProcess[] = [];
        processList.forEach(p => {
            list.push({ id: p.id, name: p.name, level });
            if ('children' in p && Array.isArray(p.children) && p.children.length > 0) {
                list.push(...flattenProcesses(p.children, level + 1));
            }
        });
        return list;
    }, []);
    const flattenedProcesses = useMemo(() => flattenProcesses(allProcesses), [allProcesses, flattenProcesses]);

    useEffect(() => {
        if (isOpen) {
            if (isEditing && resource) {
                setTitle(resource.title || '');
                setDescription(resource.description || '');
                setCategory(resource.category || settings?.resourceCategories[0] || 'General');
                setExpiresAt(resource.expiresAt ? new Date(resource.expiresAt) : undefined);
                setResourceType(resource.type);
                setSharingMode(resource.sharingMode);
                setSharedWithUserIds(resource.sharedWith?.map(u => u.id) || []);
                setSharedWithProcessIds(resource.sharedWithProcesses?.map(p => p.id) || []);
                setCollaboratorIds(resource.collaborators?.map(c => c.id) || []);
                setObservations(resource.observations || '');
                setTags(resource.tags || []);
                setQuiz(resource.quiz || null);

                if (resource.type === 'EXTERNAL_LINK') setExternalLink(resource.url || '');
                if (resource.type === 'DOCUMENTO_EDITABLE') setEditableContent(resource.content || '');
                if ((resource.type === 'DOCUMENT' || resource.type === 'VIDEO') && resource.url) {
                    setUpload({ url: resource.url, file: { name: resource.title, type: resource.filetype, size: resource.size }, status: 'completed' });
                } else {
                    setUpload(null);
                }
                setActiveEditTab(isEditingFolder ? 'config' : 'info');

                if (isEditingFolder) {
                    setIsLoadingFolderContent(true);
                    fetch(`/api/resources?parentId=${resource.id}`)
                        .then(res => res.json())
                        .then(data => setFolderContent(data.resources || []))
                        .catch(console.error)
                        .finally(() => setIsLoadingFolderContent(false));
                }

            } else {
                resetForm();
            }

            if (user?.role === 'ADMINISTRATOR' || user?.role === 'INSTRUCTOR') {
                Promise.all([
                    fetch('/api/users/list').then(res => res.json()),
                    fetch('/api/processes').then(res => res.json())
                ]).then(([usersData, processesData]) => {
                    setAllUsers(usersData.users || []);
                    setAllProcesses(processesData || []);
                }).catch(console.error);
            }
        }
    }, [isEditing, resource, isOpen, resetForm, settings, user, isEditingFolder]);

    const handleFileSelect = async (file: File | null) => {
        if (!file) return;
        setIsUploading(true);
        const newUpload = {
            id: `upload-${file.name}-${Date.now()}`,
            file,
            progress: 0,
            error: null,
            status: 'uploading' as const,
        };
        setUpload(newUpload);

        try {
            const result = await uploadWithProgress('/api/upload/resource-file', file, (p) => {
                setUpload((prev: any) => ({ ...prev, progress: p }));
            });
            setUpload((prev: any) => ({ ...prev, url: result.url, status: 'completed' }));
            if (!title) setTitle(file.name.split('.').slice(0, -1).join('.'));
        } catch (err) {
            setUpload((prev: any) => ({ ...prev, status: 'error', error: (err as Error).message }));
            toast({ title: 'Error de Subida', description: (err as Error).message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            toast({ title: 'Validación fallida', description: "El título es obligatorio.", variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            let url: string | undefined = undefined;
            let fileType: string | undefined = undefined;
            let size: number | undefined = undefined;

            if (resourceType === 'EXTERNAL_LINK') url = externalLink;
            if ((resourceType === 'DOCUMENT' || resourceType === 'VIDEO') && upload) {
                url = upload.url;
                fileType = upload.file.type;
                size = upload.file.size;
            }

            const payload: any = {
                title, description, category, type: resourceType, url, filetype: fileType, size,
                content: resourceType === 'DOCUMENTO_EDITABLE' ? editableContent : null,
                sharingMode, sharedWithUserIds, sharedWithProcessIds, collaboratorIds,
                parentId, expiresAt: expiresAt?.toISOString() || null,
                observations, tags, quiz,
            };

            const endpoint = isEditing ? `/api/resources/${resource!.id}` : '/api/resources';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error((await response.json()).message || 'No se pudo guardar.');

            toast({ title: "¡Éxito!", description: `Recurso ${isEditing ? 'actualizado' : 'creado'}.` });
            onSave();
            onClose();

        } catch (err) {
            toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const isStep1Valid = !!title.trim() && !!category;
    const isStep2Valid = (
        (resourceType === 'DOCUMENT' && upload?.status === 'completed') ||
        (resourceType === 'EXTERNAL_LINK' && externalLink) ||
        (resourceType === 'DOCUMENTO_EDITABLE' && editableContent) ||
        (isEditingFolder)
    );

    const InfoStep = () => {
        const [tagInput, setTagInput] = useState('');
        const handleAddTag = () => {
            if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
                setTagInput('');
            }
        };

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" /> Datos Básicos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Título del Recurso</Label>
                                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-10" placeholder="Ej: Manual de Procedimientos" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Categoría</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger id="category" className="h-10"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>{(settings?.resourceCategories || []).map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción (Opcional)</Label>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción breve..." className="min-h-[80px] resize-none" />
                        </div>

                        <div className="space-y-2">
                            <Label>Etiquetas</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Nueva etiqueta..."
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                                    className="h-9"
                                />
                                <Button type="button" variant="secondary" onClick={handleAddTag} size="sm" className="shrink-0">Añadir</Button>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {tags.map(tag => (
                                    <span key={tag} className="bg-muted text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                                        {tag} <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-destructive transition-colors ml-1">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm bg-muted/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" /> Ciclo de Vida
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Vencimiento (Opcional)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal h-10 border-dashed">
                                            {expiresAt ? format(expiresAt, "PPP", { locale: es }) : <span className="text-muted-foreground">Sin fecha de expiración</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={expiresAt} onSelect={setExpiresAt} initialFocus locale={es} />
                                        {expiresAt && <div className="p-2 border-t text-center"><Button variant="ghost" size="sm" onClick={() => setExpiresAt(undefined)} className="h-8 text-xs text-destructive">Limpiar</Button></div>}
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="observations">Notas Internas</Label>
                                <Input id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Solo administradores..." className="h-10" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const ContentStep = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">Tipo de Recurso</CardTitle>
                    <CardDescription>Elige cómo entregar este contenido.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SelectionCard
                            id="type-doc"
                            value="DOCUMENT"
                            current={resourceType}
                            onChange={setResourceType}
                            icon={FileUp}
                            title="Archivo"
                            description="Sube PDF, PPT, Word, etc."
                        />
                        <SelectionCard
                            id="type-link"
                            value="EXTERNAL_LINK"
                            current={resourceType}
                            onChange={setResourceType}
                            icon={LinkIcon}
                            title="Enlace Externo"
                            description="Website o recurso online"
                        />
                        <SelectionCard
                            id="type-editable"
                            value="DOCUMENTO_EDITABLE"
                            current={resourceType}
                            onChange={setResourceType}
                            icon={FilePenLine}
                            title="Documento"
                            description="Crear contenido enriquecido"
                        />
                    </div>

                    <div className="p-4 bg-muted/30 rounded-xl border border-dashed">
                        {resourceType === 'DOCUMENT' && (
                            upload ? (
                                <div className="flex items-center gap-4 p-3 bg-background border rounded-lg shadow-sm">
                                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                        <FileGenericIcon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate text-sm">{upload.file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatFileSize(upload.file.size)}</p>
                                        {upload.status === 'uploading' && <Progress value={upload.progress} className="h-1 mt-1.5" />}
                                        {upload.status === 'error' && <p className="text-xs text-destructive mt-1">{upload.error}</p>}
                                    </div>
                                    {upload.status === 'completed' && (
                                        <Button variant="ghost" size="icon" onClick={() => setUpload(null)} className="hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    )}
                                </div>
                            ) : (
                                <UploadArea onFileSelect={(files) => files && handleFileSelect(files[0])} disabled={isUploading} className="min-h-[150px]" />
                            )
                        )}
                        {resourceType === 'EXTERNAL_LINK' && (
                            <div className="space-y-2">
                                <Label>URL del Recurso</Label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input type="url" value={externalLink} onChange={e => setExternalLink(e.target.value)} placeholder="https://..." className="pl-9 h-11" />
                                </div>
                            </div>
                        )}
                        {resourceType === 'DOCUMENTO_EDITABLE' && <RichTextEditor value={editableContent} onChange={setEditableContent} className="min-h-[250px] bg-background" />}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
                <CardContent className="p-0">
                    <ResourcePermissions
                        className="p-6"
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
                </CardContent>
            </Card>

            <Card className="border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/10">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-full transition-colors", quiz ? "bg-indigo-100 text-indigo-600" : "bg-background border")}>
                            <BrainCircuit className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Validación del Conocimiento</p>
                            <p className="text-xs text-muted-foreground">{quiz ? 'Evaluación configurada' : 'Añadir quiz opcional al finalizar'}</p>
                        </div>
                    </div>
                    <Button
                        variant={quiz ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsQuizEditorOpen(true)}
                        type="button"
                        className={cn("transition-all", quiz ? "bg-indigo-600 hover:bg-indigo-700" : "")}
                    >
                        {quiz ? <Edit className="mr-2 h-3.5 w-3.5" /> : <PlusCircle className="mr-2 h-3.5 w-3.5" />}
                        {quiz ? 'Editar Quiz' : 'Añadir Quiz'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );

    const SelectionCard = ({ value, current, onChange, icon: Icon, title, description, id }: any) => (
        <div
            onClick={() => onChange(value)}
            className={cn(
                "cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:scale-[1.02] flex flex-col items-center text-center gap-3 relative",
                current === value ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md" : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
        >
            <div className={cn("p-3 rounded-full transition-colors", current === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <h4 className={cn("font-bold text-sm", current === value ? "text-primary" : "text-foreground")}>{title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{description}</p>
            </div>
            {current === value && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />}
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[98vw] sm:max-w-4xl p-0 gap-0 rounded-2xl max-h-[92vh] flex flex-col bg-background/95 backdrop-blur-xl border-border/50">
                <DialogHeader className="px-8 py-5 border-b flex-shrink-0 bg-background/50">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            {isEditing ? <Edit className="h-6 w-6 text-primary" /> : <PlusCircle className="h-6 w-6 text-primary" />}
                        </div>
                        {isEditing ? (isEditingFolder ? 'Editar Carpeta' : 'Editar Recurso') : 'Nuevo Recurso'}
                    </DialogTitle>
                    {!isEditing && <div className="pt-6"><ProgressBar currentStep={creationStep} /></div>}
                </DialogHeader>

                {isEditing ? (
                    <form id="resource-form" onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
                        <Tabs value={activeEditTab} onValueChange={setActiveEditTab} className="flex-1 min-h-0 flex flex-col">
                            <div className="px-6 py-2 border-b bg-muted/20">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="info">Información</TabsTrigger>
                                    <TabsTrigger value="content">Contenido</TabsTrigger>
                                </TabsList>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-6 md:p-8">
                                    <TabsContent value="info" className="mt-0 focus-visible:outline-none"><InfoStep /></TabsContent>
                                    <TabsContent value="content" className="mt-0 focus-visible:outline-none"><ContentStep /></TabsContent>
                                    <TabsContent value="config" className="mt-0"><ContentStep /></TabsContent>
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 flex-row justify-end gap-2 bg-background/50">
                                <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                                <Button type="submit" disabled={isSaving || !isStep1Valid} className="shadow-lg shadow-primary/20">
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Guardar Cambios
                                </Button>
                            </DialogFooter>
                        </Tabs>
                    </form>
                ) : (
                    <form id="resource-form" onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
                        <ScrollArea className="flex-1">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={creationStep}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="p-6 md:p-8"
                                >
                                    {creationStep === 1 && <InfoStep />}
                                    {creationStep === 2 && <ContentStep />}
                                </motion.div>
                            </AnimatePresence>
                        </ScrollArea>
                        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 flex-row justify-between bg-background/50 backdrop-blur-sm">
                            <Button type="button" variant="outline" onClick={() => creationStep === 1 ? onClose() : setCreationStep(p => p - 1)} disabled={isSaving}>
                                {creationStep > 1 && <ArrowLeft className="mr-2 h-4 w-4" />} {creationStep === 1 ? 'Cancelar' : 'Anterior'}
                            </Button>
                            {creationStep < STEPS.length ? (
                                <Button type="button" onClick={() => setCreationStep(p => p + 1)} disabled={!isStep1Valid}>
                                    Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button type="submit" disabled={isSaving || !isStep2Valid} className="shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Crear Recurso
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>

            {isQuizEditorOpen && (
                <QuizEditorModal
                    isOpen={isQuizEditorOpen}
                    onClose={() => setIsQuizEditorOpen(false)}
                    quiz={quiz || {
                        id: `new-quiz-${Date.now()}`,
                        title: `Evaluación de ${title || 'el recurso'}`,
                        questions: [],
                        maxAttempts: null,
                    }}
                    onSave={(updatedQuiz) => {
                        setQuiz(updatedQuiz);
                        setIsQuizEditorOpen(false);
                    }}
                />
            )}
        </Dialog>
    );
}

const UserOrProcessList = ({ type, items, selectedIds, onSelectionChange }: { type: 'user' | 'process', items: any[], selectedIds: string[], onSelectionChange: (ids: string[]) => void }) => {
    // Legacy mapping if needed, or replace usages with UserOrProcessList from shared
    return null;
};
