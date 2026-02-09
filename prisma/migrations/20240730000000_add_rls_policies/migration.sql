-- Habilitar RLS para todas las tablas relevantes
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Module" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonCompletionRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAchievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quiz" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnswerOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuizAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnswerAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Form" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormField" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormAnswer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TemplateBlock" ENABLE ROW LEVEL SECURITY;

-- Borrar políticas antiguas si existen
DROP POLICY IF EXISTS "Allow all access to platform settings" ON "PlatformSettings";
DROP POLICY IF EXISTS "Allow all access to achievements" ON "Achievement";
DROP POLICY IF EXISTS "Allow individual user access to their own data" ON "User";
DROP POLICY IF EXISTS "Allow admin full access to users" ON "User";
DROP POLICY IF EXISTS "Allow public read access to courses" ON "Course";
DROP POLICY IF EXISTS "Allow instructor/admin to manage courses" ON "Course";
DROP POLICY IF EXISTS "Allow read access to modules of accessible courses" ON "Module";
DROP POLICY IF EXISTS "Allow instructor/admin to manage modules" ON "Module";
DROP POLICY IF EXISTS "Allow read access to lessons of accessible courses" ON "Lesson";
DROP POLICY IF EXISTS "Allow instructor/admin to manage lessons" ON "Lesson";
DROP POLICY IF EXISTS "Allow read access to content of accessible courses" ON "ContentBlock";
DROP POLICY IF EXISTS "Allow instructor/admin to manage content blocks" ON "ContentBlock";
DROP POLICY IF EXISTS "Allow user to manage their own enrollments" ON "Enrollment";
DROP POLICY IF EXISTS "Allow instructor/admin to view enrollments" ON "Enrollment";
DROP POLICY IF EXISTS "Allow user to access their own progress" ON "CourseProgress";
DROP POLICY IF EXISTS "Allow user to access their own lesson completions" ON "LessonCompletionRecord";
DROP POLICY IF EXISTS "Allow public read access to public resources" ON "Resource";
DROP POLICY IF EXISTS "Allow specific user access to private resources" ON "Resource";
DROP POLICY IF EXISTS "Allow uploader/admin to manage resources" ON "Resource";
DROP POLICY IF EXISTS "Allow relevant users to see announcements" ON "Announcement";
DROP POLICY IF EXISTS "Allow admin/instructor to manage announcements" ON "Announcement";
DROP POLICY IF EXISTS "Allow relevant users to see events" ON "CalendarEvent";
DROP POLICY IF EXISTS "Allow admin/instructor to manage events" ON "CalendarEvent";
DROP POLICY IF EXISTS "Allow admin to read all security logs" ON "SecurityLog";
DROP POLICY IF EXISTS "Allow user to read their own achievements" ON "UserAchievement";
DROP POLICY IF EXISTS "Allow user to manage their own notes" ON "UserNote";
DROP POLICY IF EXISTS "Allow creator/admin to manage forms" ON "Form";
DROP POLICY IF EXISTS "Allow specific users to view forms" ON "Form";
DROP POLICY IF EXISTS "Allow authenticated user to submit responses" ON "FormResponse";
DROP POLICY IF EXISTS "Allow form owner to view responses" ON "FormResponse";
DROP POLICY IF EXISTS "Allow read access for lesson templates" ON "LessonTemplate";
DROP POLICY IF EXISTS "Allow creator to manage templates" ON "LessonTemplate";
DROP POLICY IF EXISTS "Allow read access to template blocks" ON "TemplateBlock";

-- === Políticas de Selección (SELECT) ===

CREATE POLICY "Allow all access to platform settings" 
  ON "PlatformSettings" FOR SELECT USING (true);

CREATE POLICY "Allow all access to achievements" 
  ON "Achievement" FOR SELECT USING (true);

CREATE POLICY "Allow individual user access to their own data" 
  ON "User" FOR SELECT
  USING (auth.uid() = id OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

CREATE POLICY "Allow public read access to courses" 
  ON "Course" FOR SELECT
  USING (status = 'PUBLISHED' OR instructorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

CREATE POLICY "Allow read access to modules of accessible courses" 
  ON "Module" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "Course" c 
    WHERE c.id = "Module"."courseId" 
      AND (c.status = 'PUBLISHED' OR c.instructorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')
  ));

CREATE POLICY "Allow read access to lessons of accessible courses" 
  ON "Lesson" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "Module" m 
    JOIN "Course" c ON c.id = m."courseId" 
    WHERE m.id = "Lesson"."moduleId"
      AND (c.status = 'PUBLISHED' OR c.instructorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')
  ));

CREATE POLICY "Allow read access to content of accessible courses" 
  ON "ContentBlock" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "Lesson" l 
    JOIN "Module" m ON m.id = l."moduleId" 
    JOIN "Course" c ON c.id = m."courseId"
    WHERE l.id = "ContentBlock"."lessonId"
      AND (c.status = 'PUBLISHED' OR c.instructorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')
  ));

CREATE POLICY "Allow user/instructor/admin access to enrollments" 
  ON "Enrollment" FOR SELECT
  USING (
    "userId" = auth.uid()
    OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR'
    OR EXISTS (SELECT 1 FROM "Course" c WHERE c.id = "Enrollment"."courseId" AND c.instructorId = auth.uid())
  );

CREATE POLICY "Allow user/instructor/admin access to progress" 
  ON "CourseProgress" FOR SELECT
  USING (
    "userId" = auth.uid()
    OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR'
    OR EXISTS (SELECT 1 FROM "Course" c WHERE c.id = "CourseProgress"."courseId" AND c.instructorId = auth.uid())
  );

CREATE POLICY "Allow user/instructor/admin access to lesson completion" 
  ON "LessonCompletionRecord" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "CourseProgress" cp
    WHERE cp.id = "LessonCompletionRecord"."progressId"
      AND (cp."userId" = auth.uid()
        OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR'
        OR EXISTS (SELECT 1 FROM "Course" c WHERE c.id = cp."courseId" AND c.instructorId = auth.uid()))
  ));

CREATE POLICY "Allow read access to resources" 
  ON "Resource" FOR SELECT
  USING (ispublic = true OR uploaderId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR' 
    OR EXISTS (SELECT 1 FROM "_SharedWithUsers" sw WHERE sw."A" = "Resource".id AND sw."B" = auth.uid()));

CREATE POLICY "Allow relevant users to see announcements" 
  ON "Announcement" FOR SELECT
  USING (audience = 'ALL' OR audience = (SELECT role FROM "User" WHERE id = auth.uid()));

CREATE POLICY "Allow relevant users to see events" 
  ON "CalendarEvent" FOR SELECT
  USING (
    audienceType = 'ALL'
    OR audienceType = (SELECT role FROM "User" WHERE id = auth.uid())
    OR creatorId = auth.uid()
    OR EXISTS (SELECT 1 FROM "_EventAttendees" ea WHERE ea."A" = "CalendarEvent".id AND ea."B" = auth.uid())
  );

CREATE POLICY "Allow admin to read all security logs" 
  ON "SecurityLog" FOR SELECT
  USING ((SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

CREATE POLICY "Allow user to read their own achievements" 
  ON "UserAchievement" FOR SELECT
  USING ("userId" = auth.uid());

CREATE POLICY "Allow user to manage their own notes" 
  ON "UserNote" FOR ALL
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Allow access to see forms" 
  ON "Form" FOR SELECT
  USING (
    status = 'PUBLISHED'
    OR creatorId = auth.uid()
    OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR'
    OR EXISTS (SELECT 1 FROM "_FormSharedWith" fs WHERE fs."A" = "Form".id AND fs."B" = auth.uid())
  );

-- === Políticas de Inserción, Actualización y Eliminación ===

CREATE POLICY "Allow user update on own data" 
  ON "User" FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow admin to manage users" 
  ON "User" FOR ALL
  USING ((SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')
  WITH CHECK ((SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

CREATE POLICY "Allow instructor/admin to manage courses" 
  ON "Course" FOR ALL
  USING (instructorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')
  WITH CHECK (instructorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

CREATE POLICY "Allow instructor/admin to manage modules" 
  ON "Module" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Course" c WHERE c.id = "Module"."courseId" AND (c.instructorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')));

CREATE POLICY "Allow instructor/admin to manage lessons" 
  ON "Lesson" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Module" m JOIN "Course" c ON c.id = m."courseId" WHERE m.id = "Lesson"."moduleId" AND (c.instructorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')));

CREATE POLICY "Allow instructor/admin to manage content blocks" 
  ON "ContentBlock" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Lesson" l JOIN "Module" m ON m.id = l."moduleId" JOIN "Course" c ON c.id = m."courseId" WHERE l.id = "ContentBlock"."lessonId" AND (c.instructorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')));

CREATE POLICY "Allow user to manage their own enrollments" 
  ON "Enrollment" FOR ALL
  USING ("userId" = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR' OR EXISTS (SELECT 1 FROM "Course" c WHERE c.id = "Enrollment"."courseId" AND c.instructorId = auth.uid()))
  WITH CHECK ("userId" = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR' OR EXISTS (SELECT 1 FROM "Course" c WHERE c.id = "Enrollment"."courseId" AND c.instructorId = auth.uid()));

CREATE POLICY "Allow creators to insert resources" 
  ON "Resource" FOR INSERT
  WITH CHECK ((SELECT role FROM "User" WHERE id = auth.uid()) IN ('ADMINISTRATOR', 'INSTRUCTOR'));

CREATE POLICY "Allow owner/admin to update resources" 
  ON "Resource" FOR UPDATE
  USING (uploaderId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

CREATE POLICY "Allow owner/admin to delete resources" 
  ON "Resource" FOR DELETE
  USING (uploaderId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

CREATE POLICY "Allow admin/instructor to manage announcements" 
  ON "Announcement" FOR ALL
  USING (authorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')
  WITH CHECK (authorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

CREATE POLICY "Allow admin/instructor to manage events" 
  ON "CalendarEvent" FOR ALL
  USING (creatorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')
  WITH CHECK (creatorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

CREATE POLICY "Allow creator/admin to manage forms" 
  ON "Form" FOR ALL
  USING (creatorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')
  WITH CHECK (creatorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

CREATE POLICY "Allow authenticated user to submit responses" 
  ON "FormResponse" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow form owner to view responses" 
  ON "FormResponse" FOR SELECT
  USING (EXISTS (SELECT 1 FROM "Form" f WHERE f.id = "FormResponse"."formId" AND (f.creatorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')));

-- Tablas de soporte (políticas abiertas)
CREATE POLICY "Allow all on LessonTemplate" ON "LessonTemplate" FOR ALL USING (true);
CREATE POLICY "Allow all on TemplateBlock" ON "TemplateBlock" FOR ALL USING (true);
CREATE POLICY "Allow all on Quiz" ON "Quiz" FOR ALL USING (true);
CREATE POLICY "Allow all on Question" ON "Question" FOR ALL USING (true);
CREATE POLICY "Allow all on AnswerOption" ON "AnswerOption" FOR ALL USING (true);
CREATE POLICY "Allow all on QuizAttempt" ON "QuizAttempt" FOR ALL USING (true);
CREATE POLICY "Allow all on AnswerAttempt" ON "AnswerAttempt" FOR ALL USING (true);
CREATE POLICY "Allow all on FormField" ON "FormField" FOR ALL USING (true);
CREATE POLICY "Allow all on FormAnswer" ON "FormAnswer" FOR ALL USING (true);
