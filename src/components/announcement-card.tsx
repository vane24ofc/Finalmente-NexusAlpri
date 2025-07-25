

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Announcement, UserRole } from '@/types';
import { User, Clock, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface AnnouncementCardProps {
  announcement: Announcement;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcementId: string) => void;
}

const TRUNCATE_LENGTH = 200;

export function AnnouncementCard({ announcement, onEdit, onDelete }: AnnouncementCardProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const canModify = user && (user.role === 'ADMINISTRATOR' || user.role === 'INSTRUCTOR');

  const getAudienceText = (audience: UserRole[] | 'ALL' | string): string => {
    if (audience === 'ALL') return 'Todos';
    if (Array.isArray(audience)) {
        return audience.map(r => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()).join(', ');
    }
    if (typeof audience === 'string') {
        try {
            const parsed = JSON.parse(audience);
            if(Array.isArray(parsed)) return parsed.map(r => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()).join(', ');
        } catch(e) {
            // It's not a JSON array string
        }
        return audience;
    }
    return 'Desconocido';
  }
  
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Bogota',
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const isTruncated = announcement.content.length > TRUNCATE_LENGTH;
  
  const toggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsExpanded(!isExpanded);
  }

  const contentToShow = isExpanded ? announcement.content : `${announcement.content.substring(0, TRUNCATE_LENGTH)}${isTruncated ? '...' : ''}`;

  return (
    <Card className="flex flex-col h-full group card-border-animated">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-xl font-headline">{announcement.title}</CardTitle>
            {announcement.priority === 'Urgente' && (
                <Badge variant="destructive">{announcement.priority}</Badge>
            )}
        </div>
        <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1">
            <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                    <AvatarImage src={undefined} alt={announcement.author?.name || 'Sistema'} />
                    <AvatarFallback className="text-xs">
                        {announcement.author?.name ? announcement.author.name.charAt(0).toUpperCase() : 'S'}
                    </AvatarFallback>
                </Avatar>
                <span>{announcement.author?.name || 'Sistema'}</span>
            </div>
             <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>{formatDate(announcement.date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
                 <Badge variant="secondary" className="capitalize">{getAudienceText(announcement.audience)}</Badge>
            </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {contentToShow}
        </p>
         {isTruncated && (
            <Button
              onClick={toggleExpand}
              variant="link"
              className="p-0 h-auto text-sm mt-1 animated-underline"
            >
              {isExpanded ? 'Leer menos' : 'Leer más'}
            </Button>
          )}
      </CardContent>
      {canModify && onEdit && onDelete && (
        <CardFooter className="border-t pt-3 pb-3 justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(announcement)}>
                <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(announcement.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </Button>
        </CardFooter>
      )}
    </Card>
  );
}
