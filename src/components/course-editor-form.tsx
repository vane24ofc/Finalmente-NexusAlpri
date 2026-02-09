'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, PlusCircle, Trash2, UploadCloud, GripVertical, Loader2, AlertTriangle, ShieldAlert, ImagePlus, X, Replace, Pencil, Eye, FilePlus2, ChevronDown, BookOpenText, Video, FileText, File as FileGenericIcon, Layers3, Sparkles, Award, CheckCircle, Calendar as CalendarIcon, Info, Settings2, Globe as GlobeIcon, Target, Shield, Clock3, Layout, Sparkles as SparklesIcon, BookOpen, Zap, Target as TargetIcon, BarChart, Users, Tag, Hash, Lock, Unlock, Filter, Palette, EyeOff, ArrowRight, Check, Plus, Minus, Grid3x3, List, Eye as EyeIcon, Maximize2, Minimize2, FolderPlus, FolderOpen, Calendar, Timer, TrendingUp, BarChart2, PieChart, Download, Share2, Bell, Star, Edit, Copy, MoreHorizontal, ExternalLink, HelpCircle, AlertCircle, Info as InfoIcon, ChevronRight, ChevronLeft, FlipVertical, FlipHorizontal, SquareStack, PanelLeft, PanelRight, PanelsTopLeft, Layers } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, ChangeEvent, useMemo } from 'react';
import type { Course as AppCourse, Module as AppModule, Lesson as AppLesson, LessonType, CourseStatus, Quiz as AppQuiz, ContentBlock } from '@/types';
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { UploadArea } from '@/components/ui/upload-area';
import { uploadWithProgress } from '@/lib/upload-with-progress';
import { CourseAssignmentModal } from '@/components/course-assignment-modal';
import { QuizEditorModal } from '@/components/quizz-it/quiz-editor-modal';
import { useTitle } from '@/contexts/title-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';

// === TIPOS E INTERFACES OPTIMIZADOS ===
interface InteractiveComponentData {
  type: 'accordion' | 'flipCards' | 'tabs';
  items: InteractiveItem[];
  settings?: {
    allowMultipleOpen?: boolean;
    flipDirection?: 'horizontal' | 'vertical';
    tabPosition?: 'top' | 'left' | 'right' | 'bottom';
  };
}

interface InteractiveItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  imagePreview?: string;
}

interface ApiTemplate {
  id: string;
  name: string;
  description: string;
  templateBlocks: any[];
  creator: { name: string | null } | null;
}

interface PrismaCertificateTemplate {
  id: string;
  name: string;
}

// === UTILIDADES ===
const generateUniqueId = (prefix: string): string => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${randomPart}`;
};

// === COMPONENTES REUTILIZABLES ===

// Componente para carga de imágenes
const ImageUploader: React.FC<{
  imageUrl: string | null;
  onImageChange: (file: File) => Promise<void>;
  onImageRemove: () => void;
  isUploading: boolean;
  uploadProgress: number;
  aspectRatio?: string;
  className?: string;
}> = ({ imageUrl, onImageChange, onImageRemove, isUploading, uploadProgress, aspectRatio = "aspect-[4/3]", className = "" }) => {
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    await onImageChange(file);
  };

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  return (
    <div className={`${aspectRatio} rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 overflow-hidden group relative bg-gray-50 dark:bg-gray-800/50 ${className}`}>
      {isUploading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-2" />
            <p className="text-xs text-white font-medium">{uploadProgress}%</p>
          </div>
        </div>
      )}

      {(localPreview || imageUrl) ? (
        <>
          <Image
            src={localPreview || imageUrl!}
            alt="Imagen"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <UploadArea
              onFileSelect={handleFileSelect}
              accept="image/*"
              className="absolute inset-0 cursor-pointer"
              inputId={`image-upload-${Date.now()}`}
            />
            <div className="flex gap-2 z-20">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById(`image-upload-${Date.now()}`)?.click();
                }}
              >
                <Replace className="h-3.5 w-3.5 mr-1" />
                Cambiar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageRemove();
                  setLocalPreview(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Eliminar
              </Button>
            </div>
          </div>
        </>
      ) : (
        <UploadArea
          onFileSelect={handleFileSelect}
          accept="image/*"
          className="h-full flex flex-col items-center justify-center p-4 text-center cursor-pointer"
          inputId={`image-upload-${Date.now()}`}
        >
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <ImagePlus className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Subir imagen</p>
          <p className="text-[10px] text-gray-400 mt-1">Recomendado: 1600x1200px</p>
        </UploadArea>
      )}
    </div>
  );
};

// Componente para estadísticas del curso
const CourseStats: React.FC<{ course: AppCourse }> = ({ course }) => {
  const stats = useMemo(() => ({
    totalModules: course?.modules?.length || 0,
    totalLessons: course?.modules?.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0) || 0,
    totalBlocks: course?.modules?.reduce((acc, mod) =>
      acc + (mod.lessons?.reduce((lessonAcc, lesson) =>
        lessonAcc + (lesson.contentBlocks?.length || 0), 0) || 0), 0) || 0,
    hasCertificate: !!course?.certificateTemplateId,
    isMandatory: course?.isMandatory || false,
    hasPrerequisite: !!course?.prerequisiteId,
  }), [course]);

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className="bg-white dark:bg-gray-800 px-3 py-1 font-bold">
        {stats.totalModules} Módulos
      </Badge>
      <Badge variant="outline" className="bg-white dark:bg-gray-800 px-3 py-1 text-muted-foreground font-medium">
        {stats.totalLessons} Lecciones
      </Badge>
      <Badge variant="outline" className="bg-white dark:bg-gray-800 px-3 py-1 text-muted-foreground font-medium">
        {stats.totalBlocks} Elementos
      </Badge>
      {stats.hasCertificate && (
        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
          <Award className="h-3 w-3 mr-1" />
          Certificado
        </Badge>
      )}
      {stats.isMandatory && (
        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
          <Shield className="h-3 w-3 mr-1" />
          Obligatorio
        </Badge>
      )}
    </div>
  );
};

// Componente para la barra de acciones del curso
const CourseActionBar: React.FC<{
  course: AppCourse;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onPreview: () => void;
  onDelete: () => void;
  onExport: () => void;
  isExporting: boolean;
}> = ({ course, isDirty, isSaving, onSave, onPreview, onDelete, onExport, isExporting }) => {
  return (
    <div className="flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b transition-all duration-300">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/manage-courses"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Volver a la gestión de cursos</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="group flex items-center gap-2">
              <div className="flex flex-col">
                <h1 className="text-sm font-bold truncate max-w-[200px] group-hover:max-w-md transition-all duration-500">
                  {course.title}
                </h1>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                <Edit className="h-3 w-3" />
                {course.id === 'new' ? 'Creando' : 'Editando'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={onPreview}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Vista previa del curso</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={onExport}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar plan de estudios</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9",
                      isDirty && "text-primary bg-primary/5 animate-pulse"
                    )}
                    onClick={onSave}
                    disabled={isSaving || !isDirty}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isSaving ? 'Guardando...' : 'Guardar cambios'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-800 mx-1" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:bg-destructive/10"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Eliminar curso</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de carga optimizado
const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <div className="relative">
      <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
      <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
    </div>
    <p className="mt-4 text-lg font-medium text-muted-foreground animate-pulse">
      Cargando editor de cursos...
    </p>
  </div>
);

// Componente de acceso denegado
const AccessDenied: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
    <div className="bg-destructive/10 p-6 rounded-full mb-6">
      <ShieldAlert className="h-16 w-16 text-destructive" />
    </div>
    <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
    <p className="text-muted-foreground mb-6 max-w-md">
      No tienes los permisos necesarios para editar este curso.
    </p>
    <Link href="/manage-courses" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
      <ArrowLeft className="mr-2 h-4 w-4" />
      Volver a mis cursos
    </Link>
  </div>
);

// === COMPONENTES PRINCIPALES OPTIMIZADOS ===

const ContentBlockItem = React.memo(React.forwardRef<HTMLDivElement, {
  block: ContentBlock;
  blockIndex: number;
  onUpdate: (field: string, value: any) => void;
  onEditQuiz: () => void;
  isSaving: boolean;
  onDelete: () => void;
  dragHandleProps: any;
}>(
  ({ block, blockIndex, onUpdate, onEditQuiz, isSaving, onDelete, dragHandleProps, ...rest }, ref) => {
    const [isFileUploading, setIsFileUploading] = useState(false);
    const [fileUploadProgress, setFileUploadProgress] = useState(0);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const [selectedComponent, setSelectedComponent] = useState<'text' | 'accordion' | 'flipCards' | 'tabs'>('text');
    const { toast } = useToast();

    const getInteractiveData = useCallback((): InteractiveComponentData => {
      const defaultData: InteractiveComponentData = { type: 'accordion', items: [], settings: {} };
      if (!block.content) return defaultData;
      try {
        if (block.content.trim().startsWith('{')) {
          return JSON.parse(block.content) as InteractiveComponentData;
        }
      } catch (e) {
        // No es JSON
      }
      return defaultData;
    }, [block.content]);

    const interactiveData = getInteractiveData();

    useEffect(() => {
      if (block.content && block.content.trim().startsWith('{')) {
        try {
          const data = JSON.parse(block.content);
          if (data.type && (data.type === 'accordion' || data.type === 'flipCards' || data.type === 'tabs')) {
            setSelectedComponent(data.type);
          }
        } catch (e) { }
      } else if (block.type === 'TEXT') {
        setSelectedComponent('text');
      }
    }, [block.id]);

    const handleFileSelect = useCallback(async (file: File | null) => {
      if (!file) return;

      if (file.type.startsWith('image/')) {
        setLocalPreview(URL.createObjectURL(file));
      }

      setIsFileUploading(true);
      setFileUploadProgress(0);

      try {
        const result = await uploadWithProgress('/api/upload/lesson-file', file, setFileUploadProgress);
        onUpdate('content', result.url);
        toast({ title: 'Archivo Subido', description: `El archivo ${file.name} se ha subido correctamente.` });
      } catch (err) {
        toast({ title: 'Error de Subida', description: (err as Error).message, variant: 'destructive' });
        if (localPreview) URL.revokeObjectURL(localPreview);
        setLocalPreview(null);
      } finally {
        setIsFileUploading(false);
      }
    }, [onUpdate, toast, localPreview]);

    const handleInteractiveComponentChange = useCallback((data: InteractiveComponentData) => {
      onUpdate('content', JSON.stringify(data));
    }, [onUpdate]);

    const handleComponentTypeChange = useCallback((type: 'accordion' | 'flipCards' | 'tabs') => {
      const newData: InteractiveComponentData = {
        type,
        items: [],
        settings: type === 'accordion' ? { allowMultipleOpen: false } :
          type === 'flipCards' ? { flipDirection: 'horizontal' } :
            { tabPosition: 'top' }
      };
      onUpdate('content', JSON.stringify(newData));
      setSelectedComponent(type);
    }, [onUpdate]);

    const renderBlockContent = useMemo(() => {
      if (block.type === 'TEXT') {
        if (selectedComponent === 'text') {
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Contenido de Texto</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Layers className="h-4 w-4" />
                      Componentes Interactivos
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedComponent('text')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Texto Simple
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleComponentTypeChange('accordion')}>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Acordeón
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleComponentTypeChange('flipCards')}>
                      <FlipVertical className="h-4 w-4 mr-2" />
                      Tarjetas de Volteo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleComponentTypeChange('tabs')}>
                      <SquareStack className="h-4 w-4 mr-2" />
                      Pestañas de Información
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <RichTextEditor
                value={block.content || ''}
                onChange={value => onUpdate('content', value)}
                placeholder="Escribe aquí el contenido de la lección..."
                className="min-h-[200px] border rounded-lg"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500">Usa el editor para añadir formato, imágenes, enlaces, etc.</p>
            </div>
          );
        } else {
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedComponent('text')}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a Texto
                  </Button>
                  <Badge variant="outline" className="capitalize">
                    {selectedComponent === 'accordion' && 'Acordeón'}
                    {selectedComponent === 'flipCards' && 'Tarjetas de Volteo'}
                    {selectedComponent === 'tabs' && 'Pestañas de Información'}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {selectedComponent === 'accordion' && 'Los estudiantes podrán expandir y contraer secciones.'}
                {selectedComponent === 'flipCards' && 'Los estudiantes podrán voltear las tarjetas para ver más información.'}
                {selectedComponent === 'tabs' && 'Los estudiantes podrán cambiar entre pestañas de información.'}
              </p>
            </div>
          );
        }
      }

      if (block.type === 'VIDEO') return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">URL del Video</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Video className="h-4 w-4" />
            </div>
            <Input
              value={block.content || ''}
              onChange={e => onUpdate('content', e.target.value)}
              placeholder="URL del video (YouTube, Vimeo, etc.)"
              className="pl-10 h-10"
              disabled={isSaving}
            />
          </div>
          <p className="text-xs text-gray-500">Pega la URL completa del video. Ej: https://www.youtube.com/watch?v=...</p>
        </div>
      );

      if (block.type === 'FILE') {
        const displayUrl = localPreview || block.content;
        const isImage = displayUrl?.match(/\.(jpeg|jpg|gif|png|webp)$/) != null || localPreview?.startsWith('blob:');

        if (displayUrl && !isFileUploading) {
          const fileName = block.content?.split('/').pop()?.split('-').slice(2).join('-') || 'Archivo adjunto';
          return (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Archivo Subido</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  {isImage ? (
                    <div className="w-10 h-10 relative rounded overflow-hidden">
                      <Image src={displayUrl} alt="Preview" fill className="object-cover" sizes="40px" />
                    </div>
                  ) : (
                    <FileGenericIcon className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <p className="text-xs text-gray-500">Haz clic en los botones para previsualizar o eliminar</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => window.open(displayUrl, '_blank')}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Ver
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => { onUpdate('content', ''); setLocalPreview(null); }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Subir Archivo</Label>
            <UploadArea
              onFileSelect={handleFileSelect}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              disabled={isSaving || isFileUploading}
              className="py-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-primary transition-colors"
            >
              <div className="text-center">
                <UploadCloud className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="font-medium mb-1">Arrastra y suelta tu archivo aquí</p>
                <p className="text-sm text-gray-500">o haz clic para seleccionar</p>
              </div>
            </UploadArea>
            {isFileUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Subiendo...</span>
                  <span>{fileUploadProgress}%</span>
                </div>
                <Progress value={fileUploadProgress} className="h-2" />
              </div>
            )}
            <p className="text-xs text-gray-500">Formatos soportados: PDF, Word, Excel, PowerPoint, Imágenes</p>
          </div>
        );
      }

      if (block.type === 'QUIZ') return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Configuración del Quiz</Label>
              <p className="text-xs text-gray-500">Añade preguntas y configura las opciones del quiz</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEditQuiz}
              className="h-8"
            >
              Configurar Preguntas
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quiz-title">Título del Quiz</Label>
            <Input
              id="quiz-title"
              value={block.quiz?.title || ''}
              onChange={e => onUpdate('quiz', { ...block.quiz, title: e.target.value })}
              placeholder="Título del Quiz"
              className="h-9"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quiz-description">Descripción</Label>
            <Textarea
              id="quiz-description"
              value={block.quiz?.description || ''}
              onChange={e => onUpdate('quiz', { ...block.quiz, description: e.target.value })}
              placeholder="Descripción del quiz..."
              rows={2}
              className="text-sm"
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
            <span className="text-sm">Preguntas configuradas:</span>
            <Badge variant="outline">
              {block.quiz?.questions?.length || 0} preguntas
            </Badge>
          </div>
        </div>
      );

      return null;
    }, [block, selectedComponent, isSaving, onUpdate, onEditQuiz, localPreview, isFileUploading, fileUploadProgress, handleComponentTypeChange, handleFileSelect]);

    const getBlockIcon = useCallback(() => {
      switch (block.type) {
        case 'TEXT':
          if (selectedComponent === 'accordion') return <ChevronDown className="h-4 w-4" />;
          if (selectedComponent === 'flipCards') return <FlipVertical className="h-4 w-4" />;
          if (selectedComponent === 'tabs') return <SquareStack className="h-4 w-4" />;
          return <FileText className="h-4 w-4" />;
        case 'VIDEO': return <Video className="h-4 w-4" />;
        case 'FILE': return <FileGenericIcon className="h-4 w-4" />;
        case 'QUIZ': return <Pencil className="h-4 w-4" />;
        default: return <FileText className="h-4 w-4" />;
      }
    }, [block.type, selectedComponent]);

    const getBlockColor = useCallback(() => {
      switch (block.type) {
        case 'TEXT':
          if (selectedComponent === 'accordion') return 'bg-green-500/10 text-green-600';
          if (selectedComponent === 'flipCards') return 'bg-purple-500/10 text-purple-600';
          if (selectedComponent === 'tabs') return 'bg-amber-500/10 text-amber-600';
          return 'bg-blue-500/10 text-blue-600';
        case 'VIDEO': return 'bg-red-500/10 text-red-600';
        case 'FILE': return 'bg-amber-500/10 text-amber-600';
        case 'QUIZ': return 'bg-purple-500/10 text-purple-600';
        default: return 'bg-primary/10 text-primary';
      }
    }, [block.type, selectedComponent]);

    return (
      <motion.div
        ref={ref}
        {...rest}
        className="flex items-start gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
      >
        <div className="flex items-start gap-2">
          <div {...dragHandleProps} className="p-1.5 cursor-grab active:cursor-grabbing touch-none hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <GripVertical className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <div className={`p-2.5 rounded-lg ${getBlockColor()}`}>
            {getBlockIcon()}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs px-2 py-0.5 capitalize font-medium">
                {block.type.toLowerCase()}
              </Badge>
              <span className="text-xs text-gray-500">Elemento #{blockIndex + 1}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:text-destructive"
              onClick={onDelete}
              disabled={isSaving}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {renderBlockContent}
        </div>
      </motion.div>
    );
  }
));
ContentBlockItem.displayName = 'ContentBlockItem';

// === COMPONENTE PRINCIPAL OPTIMIZADO ===
export function CourseEditor({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, settings, isLoading: isAuthLoading } = useAuth();
  const { setPageTitle } = useTitle();

  const [course, setCourse] = useState<AppCourse | null>(null);
  const [allCoursesForPrereq, setAllCoursesForPrereq] = useState<AppCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('basics');

  const [itemToDeleteDetails, setItemToDeleteDetails] = useState<any>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [certificateTemplates, setCertificateTemplates] = useState<PrismaCertificateTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [activeModuleIndexForTemplate, setActiveModuleIndexForTemplate] = useState<number | null>(null);
  const [lessonToSaveAsTemplate, setLessonToSaveAsTemplate] = useState<AppLesson | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [quizToEdit, setQuizToEdit] = useState<{ quiz: AppQuiz; onSave: (updatedQuiz: AppQuiz) => void } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isExporting, setIsExporting] = useState(false);

  // --- Data Fetching optimizado ---
  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        if (courseId === 'new') {
          setCourse({
            id: generateUniqueId('course'),
            title: 'Nuevo Curso sin Título',
            description: 'Añade una descripción aquí.',
            instructor: user as any,
            instructorId: user?.id,
            status: 'DRAFT',
            category: '',
            modules: [],
            modulesCount: 0,
            prerequisiteId: null,
            isMandatory: false,
            certificateTemplateId: null,
            imageUrl: null,
          });
          setPageTitle('Crear Nuevo Curso');
          return;
        }

        const [courseRes, templatesRes, certificatesRes, coursesRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch('/api/templates'),
          fetch('/api/certificates/templates'),
          fetch('/api/courses?simple=true')
        ]);

        if (!courseRes.ok) throw new Error("Curso no encontrado");

        const courseData: AppCourse = await courseRes.json();
        setCourse(courseData);

        if (templatesRes.ok) setTemplates(await templatesRes.json());
        if (certificatesRes.ok) setCertificateTemplates(await certificatesRes.json());
        if (coursesRes.ok) {
          const data = await coursesRes.json();
          setAllCoursesForPrereq((data.courses || []).filter((c: AppCourse) => c.id !== courseId));
        }

      } catch (err) {
        toast({
          title: "Error",
          description: "No se pudo cargar el curso para editar.",
          variant: "destructive"
        });
        router.push('/manage-courses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [courseId, user, router, toast, setPageTitle]);

  const handleSaveCourse = useCallback(async () => {
    if (!course) return;
    setIsSaving(true);

    const payload = { ...course };
    (payload.modules || []).forEach((mod, mIdx) => {
      mod.order = mIdx;
      (mod.lessons || []).forEach((les, lIdx) => {
        les.order = lIdx;
        (les.contentBlocks || []).forEach((block, bIdx) => {
          block.order = bIdx;
        });
      });
    });

    try {
      const endpoint = courseId === 'new' ? '/api/courses' : `/api/courses/${courseId}`;
      const method = courseId === 'new' ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error((await response.json()).message || 'Error al guardar el curso.');

      const savedCourse = await response.json();

      toast({
        title: "✅ Curso Guardado",
        description: "La información del curso se ha guardado correctamente.",
        duration: 3000
      });

      setCourse(savedCourse);
      setIsDirty(false);

      if (courseId === 'new') {
        router.replace(`/manage-courses/${savedCourse.id}/edit`, { scroll: false });
      }

      return savedCourse;

    } catch (error: any) {
      console.error('Error al guardar el curso:', error);
      toast({
        title: "❌ Error al Guardar",
        description: error.message || "No se pudo guardar. Intenta nuevamente.",
        variant: "destructive",
        duration: 5000
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [course, courseId, router, toast]);

  const handleStateUpdate = useCallback((updater: (prev: AppCourse) => AppCourse) => {
    setCourse(prev => {
      if (!prev) return null;
      const newCourse = JSON.parse(JSON.stringify(prev));
      return updater(newCourse);
    });
    setIsDirty(true);
  }, []);

  const updateCourseField = useCallback((field: keyof AppCourse, value: any) => {
    handleStateUpdate(prev => {
      prev[field] = value;
      return prev;
    });
  }, [handleStateUpdate]);

  const handleImageUpload = useCallback(async (file: File) => {
    setIsUploadingImage(true);
    setUploadProgress(0);

    try {
      const result = await uploadWithProgress('/api/upload/course-image', file, setUploadProgress);
      updateCourseField('imageUrl', result.url);
      toast({
        title: '✅ Imagen Subida',
        description: 'La imagen de portada se ha actualizado correctamente.',
        duration: 3000
      });
    } catch (err) {
      toast({
        title: '❌ Error de Subida',
        description: (err as Error).message,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsUploadingImage(false);
    }
  }, [updateCourseField, toast]);

  const handleDeleteCourse = useCallback(async () => {
    if (!course) return;

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar el curso');

      toast({
        title: "✅ Curso Eliminado",
        description: "El curso se ha eliminado correctamente.",
        duration: 3000
      });

      router.push('/manage-courses');
    } catch (error: any) {
      toast({
        title: "❌ Error al Eliminar",
        description: error.message || "No se pudo eliminar el curso.",
        variant: "destructive",
        duration: 5000
      });
    }
  }, [course, courseId, router, toast]);

  const handlePreviewCourse = useCallback(() => {
    if (courseId === 'new') {
      toast({
        title: "⚠️ Guarda primero el curso",
        description: "Debes guardar el curso antes de previsualizarlo.",
        duration: 3000
      });
      return;
    }
    window.open(`/courses/${courseId}?preview=true`, '_blank');
  }, [courseId, toast]);

  const handleExportPlan = useCallback(async () => {
    if (!course) return;

    setIsExporting(true);

    try {
      const exportData = {
        courseTitle: course.title,
        courseDescription: course.description,
        modules: course.modules.map(module => ({
          title: module.title,
          lessons: module.lessons.map(lesson => ({
            title: lesson.title,
            contentBlocks: lesson.contentBlocks.map(block => ({
              type: block.type,
              content: block.content || '',
              quiz: block.quiz ? {
                title: block.quiz.title,
                description: block.quiz.description,
                questions: block.quiz.questions?.length || 0
              } : undefined
            }))
          }))
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `plan-estudio-${course.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Plan Exportado",
        description: "El plan de estudios se ha exportado correctamente.",
        duration: 3000
      });
    } catch (error) {
      toast({
        title: "❌ Error al Exportar",
        description: "No se pudo exportar el plan de estudios.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsExporting(false);
    }
  }, [course, toast]);

  if (isLoading || isAuthLoading || !course) {
    return <LoadingState />;
  }

  if (courseId !== 'new' && !isAuthLoading && user?.role !== 'ADMINISTRATOR' && user?.id !== course.instructorId) {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <CourseActionBar
        course={course}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSaveCourse}
        onPreview={handlePreviewCourse}
        onDelete={() => setShowDeleteDialog(true)}
        onExport={handleExportPlan}
        isExporting={isExporting}
      />

      {/* Contenido Principal */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex w-auto p-1 bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur rounded-xl h-11">
            <TabsTrigger value="basics" className="text-xs font-semibold px-6 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
              <Layout className="h-3.5 w-3.5 mr-2" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="text-xs font-semibold px-6 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
              <BookOpen className="h-3.5 w-3.5 mr-2" />
              Plan de Estudios
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs font-semibold px-6 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
              <Settings2 className="h-3.5 w-3.5 mr-2" />
              Ajustes
            </TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs font-semibold px-6 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
              <GlobeIcon className="h-3.5 w-3.5 mr-2" />
              Publicación
            </TabsTrigger>
          </TabsList>

          {/* Pestaña: Información Básica */}
          <TabsContent value="basics" className="space-y-6">
            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-6">
                <Card className="border-none shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold">Detalles del Curso</CardTitle>
                    <CardDescription>
                      Define la identidad y propósito de tu programa educativo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título del Curso</Label>
                      <Input
                        id="title"
                        value={course.title}
                        onChange={e => updateCourseField('title', e.target.value)}
                        placeholder="Ej: Master en Desarrollo Web Moderno"
                        className="text-lg font-semibold h-12 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción Detallada</Label>
                      <RichTextEditor
                        value={course.description || ''}
                        onChange={v => updateCourseField('description', v)}
                        placeholder="Describe qué aprenderán tus estudiantes..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-bold">Imagen de Portada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ImageUploader
                      imageUrl={course.imageUrl}
                      onImageChange={handleImageUpload}
                      onImageRemove={() => updateCourseField('imageUrl', null)}
                      isUploading={isUploadingImage}
                      uploadProgress={uploadProgress}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Pestaña: Plan de Estudios - Simplificada */}
          <TabsContent value="curriculum" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold tracking-tight">Estructura del Plan</CardTitle>
                    <CardDescription>Gestiona los módulos y lecciones de tu curso</CardDescription>
                  </div>
                  <CourseStats course={course} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.modules.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Comienza a construir tu curso</h3>
                      <p className="text-gray-500 mb-4">Añade tu primer módulo para empezar</p>
                      <Button onClick={() => { }}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Crear Primer Módulo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {course.modules.map((module, index) => (
                        <Card key={module.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge>Módulo {index + 1}</Badge>
                                <h3 className="font-bold">{module.title}</h3>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {module.lessons.map((lesson, idx) => (
                                <div key={lesson.id} className="flex items-center justify-between p-2 border rounded">
                                  <div className="flex items-center gap-3">
                                    <BookOpenText className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium">Lección {idx + 1}: {lesson.title}</span>
                                  </div>
                                  <Badge variant="outline">
                                    {lesson.contentBlocks.length} elementos
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña: Configuración */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Certificado
                  </CardTitle>
                  <CardDescription>
                    Configura el certificado del curso
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Plantilla de Certificado</Label>
                    <Select
                      value={course.certificateTemplateId || 'none'}
                      onValueChange={v => updateCourseField('certificateTemplateId', v === 'none' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin certificado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin certificado</SelectItem>
                        {certificateTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Prerrequisitos
                  </CardTitle>
                  <CardDescription>
                    Establece cursos previos requeridos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Curso Prerrequisito</Label>
                    <Select
                      value={course.prerequisiteId || 'none'}
                      onValueChange={v => updateCourseField('prerequisiteId', v === 'none' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin prerrequisito" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin prerrequisito</SelectItem>
                        {allCoursesForPrereq.map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pestaña: Publicación */}
          <TabsContent value="distribution" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Disponibilidad
                  </CardTitle>
                  <CardDescription>
                    Define cuándo estará disponible el curso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DateRangePicker
                    date={{
                      from: course.startDate ? new Date(course.startDate) : undefined,
                      to: course.endDate ? new Date(course.endDate) : undefined
                    }}
                    onDateChange={(range) => {
                      updateCourseField('startDate', range?.from?.toISOString());
                      updateCourseField('endDate', range?.to?.toISOString());
                    }}
                  />
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Estado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={course.status}
                      onValueChange={v => updateCourseField('status', v as CourseStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Borrador</SelectItem>
                        <SelectItem value="PUBLISHED">Publicado</SelectItem>
                        <SelectItem value="ARCHIVED">Archivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Categoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={course.category || ''}
                      onValueChange={v => updateCourseField('category', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {(settings?.resourceCategories || []).map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Barra de Cambios Sin Guardar */}
      {isDirty && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50"
        >
          <Card className="bg-white dark:bg-gray-900 border shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium">Cambios sin guardar</p>
                    <p className="text-sm text-muted-foreground">
                      Guarda tus cambios antes de salir
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSaveCourse}
                  disabled={isSaving}
                  size="sm"
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Diálogo de Eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el curso "{course?.title}" y todos sus contenidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Eliminación de Elementos */}
      <AlertDialog open={!!itemToDeleteDetails} onOpenChange={(open) => !open && setItemToDeleteDetails(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará "{itemToDeleteDetails?.name}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDeleteDetails?.onDelete) {
                  itemToDeleteDetails.onDelete();
                  setItemToDeleteDetails(null);
                  toast({
                    title: "Elemento eliminado",
                    description: "Se ha eliminado correctamente.",
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}