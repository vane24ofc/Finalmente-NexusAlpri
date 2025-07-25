import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { sendEmail } from '@/lib/email';
import { AnnouncementEmail } from '@/components/emails/announcement-email';
import type { UserRole } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');
  
  const isPaginated = pageParam && pageSizeParam;

  try {
    if (isPaginated) {
        const page = parseInt(pageParam, 10);
        const pageSize = parseInt(pageSizeParam, 10);
        const skip = (page - 1) * pageSize;

        const [announcements, totalAnnouncements] = await prisma.$transaction([
            prisma.announcement.findMany({
                orderBy: { date: 'desc' },
                include: { author: { select: { id: true, name: true } } },
                skip: skip,
                take: pageSize,
            }),
            prisma.announcement.count()
        ]);
        
        return NextResponse.json({ announcements, totalAnnouncements });
    } else {
        const announcements = await prisma.announcement.findMany({
            orderBy: { date: 'desc' },
            include: { author: { select: { id: true, name: true } } },
            take: 3, 
        });
        return NextResponse.json({ announcements, totalAnnouncements: announcements.length });
    }

  } catch (error) {
    console.error('[ANNOUNCEMENTS_GET_ERROR]', error);
    return NextResponse.json({ message: 'Error al obtener los anuncios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session || (session.role !== 'ADMINISTRATOR' && session.role !== 'INSTRUCTOR')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, content, audience } = body;

    if (!title || !content || !audience) {
        return NextResponse.json({ message: 'Título, contenido y audiencia son requeridos' }, { status: 400 });
    }

    const newAnnouncement = await prisma.announcement.create({
      data: {
        title,
        content,
        audience,
        authorId: session.id,
        date: new Date(),
      },
      include: {
        author: { select: { name: true } }
      }
    });

    const settings = await prisma.platformSettings.findFirst();
    let targetUsersQuery: any = {};
    if (audience !== 'ALL') {
        const roles = Array.isArray(audience) ? audience : [audience]; 
        if (Array.isArray(roles)) {
            targetUsersQuery = { where: { role: { in: roles as UserRole[] } } };
        }
    }
    const targetUsers = await prisma.user.findMany(targetUsersQuery);

    if (targetUsers.length > 0) {
      await prisma.notification.createMany({
        data: targetUsers.map(user => ({
          userId: user.id,
          title: `Nuevo Anuncio: ${title}`,
          description: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          link: '/announcements'
        }))
      });

      if (settings?.enableEmailNotifications) {
        const recipientEmails = targetUsers.map(u => u.email).filter(Boolean);
        if (recipientEmails.length > 0) {
            await sendEmail({
                to: recipientEmails,
                subject: `Nuevo Anuncio en ${settings.platformName || 'NexusAlpri'}: ${title}`,
                react: AnnouncementEmail({
                    title,
                    content,
                    authorName: newAnnouncement.author?.name || 'Sistema',
                    platformName: settings.platformName || 'NexusAlpri',
                }),
            });
        }
      }
    }

    return NextResponse.json(newAnnouncement, { status: 201 });
  } catch (error) {
    console.error('[ANNOUNCEMENT_POST_ERROR]', error);
    return NextResponse.json({ message: 'Error al crear el anuncio' }, { status: 500 });
  }
}
