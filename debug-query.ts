
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching first course ID...');
    const firstCourse = await prisma.course.findFirst();

    if (!firstCourse) {
        console.log('No courses found in database.');
        return;
    }

    const courseId = firstCourse.id; // Or replace with specific failing ID if known
    console.log(`Testing query for course ID: ${courseId}`);

    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                instructor: { select: { id: true, name: true, avatar: true } },
                prerequisite: { select: { id: true, title: true } },
                modules: {
                    orderBy: { order: "asc" },
                    include: {
                        lessons: {
                            orderBy: { order: "asc" },
                            include: {
                                contentBlocks: {
                                    orderBy: { order: "asc" },
                                    include: {
                                        quiz: {
                                            include: {
                                                questions: {
                                                    orderBy: { order: "asc" },
                                                    include: {
                                                        options: { orderBy: { id: "asc" } },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!course) {
            console.log('Course not found via findUnique (unexpected).');
        } else {
            console.log('Query successful!');
            console.log('Modules count:', course.modules.length);
            // Validate deep structure
            course.modules.forEach(m => {
                m.lessons.forEach(l => {
                    l.contentBlocks.forEach(b => {
                        if (b.quiz) {
                            console.log(`Quiz found in block ${b.id}, questions: ${b.quiz.questions.length}`);
                        }
                    });
                });
            });
        }

    } catch (error) {
        console.error('Error executing query:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
