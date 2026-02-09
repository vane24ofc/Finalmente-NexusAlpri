-- Enable RLS for all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Module" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quiz" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnswerOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonCompletionRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuizAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnswerAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAchievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Form" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormField" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormResponse" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors on re-run
DROP POLICY IF EXISTS "Allow all access to everyone" ON "public"."PlatformSettings";
DROP POLICY IF EXISTS "Allow all access to everyone" ON "public"."Achievement";
DROP POLICY IF EXISTS "Allow public read access" ON "public"."User";
DROP POLICY IF EXISTS "Allow individual update access" ON "public"."User";
DROP POLICY IF EXISTS "Allow public read for published courses" ON "public"."Course";
DROP POLICY IF EXISTS "Allow instructor/admin write access" ON "public"."Course";
DROP POLICY IF EXISTS "Allow read access to related users" ON "public"."Module";
DROP POLICY IF EXISTS "Allow read access to related users" ON "public"."Lesson";
DROP POLICY IF EXISTS "Allow read access to related users" ON "public"."ContentBlock";
DROP POLICY IF EXISTS "Allow read access to related users" ON "public"."Quiz";
DROP POLICY IF EXISTS "Allow read access to related users" ON "public"."Question";
DROP POLICY IF EXISTS "Allow read access to related users" ON "public"."AnswerOption";
DROP POLICY IF EXISTS "Allow all access for enrolled users and admins" ON "public"."Enrollment";
DROP POLICY IF EXISTS "Allow individual read access" ON "public"."CourseProgress";
DROP POLICY IF EXISTS "Allow read access to related users" ON "public"."LessonCompletionRecord";
DROP POLICY IF EXISTS "Allow individual access" ON "public"."QuizAttempt";
DROP POLICY IF EXISTS "Allow read access based on quiz attempt" ON "public"."AnswerAttempt";
DROP POLICY IF EXISTS "Allow individual access for user notes" ON "public"."UserNote";
DROP POLICY IF EXISTS "Allow public read access for resources" ON "public"."Resource";
DROP POLICY IF EXISTS "Allow authors and admins to manage resources" ON "public"."Resource";
DROP POLICY IF EXISTS "Allow read access based on audience" ON "public"."Announcement";
DROP POLICY IF EXISTS "Allow authors/admins to manage announcements" ON "public"."Announcement";
DROP POLICY IF EXISTS "Allow read access based on audience" ON "public"."CalendarEvent";
DROP POLICY IF EXISTS "Allow authors/admins to manage events" ON "public"."CalendarEvent";
DROP POLICY IF EXISTS "Allow individual access to notifications" ON "public"."Notification";
DROP POLICY IF EXISTS "Allow admin access to security logs" ON "public"."SecurityLog";
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON "public"."UserAchievement";
DROP POLICY IF EXISTS "Allow read access for published/shared forms" ON "public"."Form";
DROP POLICY IF EXISTS "Allow creator/admin write access" ON "public"."Form";
DROP POLICY IF EXISTS "Allow read access for related users" ON "public"."FormField";
DROP POLICY IF EXISTS "Allow users to submit responses" ON "public"."FormResponse";
DROP POLICY IF EXISTS "Allow form creators/admins to see responses" ON "public"."FormResponse";


-- PlatformSettings & Achievements: Publicly readable by all
CREATE POLICY "Allow all access to everyone" ON "public"."PlatformSettings" FOR ALL USING (true);
CREATE POLICY "Allow all access to everyone" ON "public"."Achievement" FOR ALL USING (true);

-- User Policies
CREATE POLICY "Allow public read access" ON "public"."User" FOR SELECT USING (true);
CREATE POLICY "Allow individual update access" ON "public"."User" FOR UPDATE USING (auth.uid() = id);

-- Course Policies
CREATE POLICY "Allow public read for published courses" ON "public"."Course" FOR SELECT USING (status = 'PUBLISHED' OR instructorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');
CREATE POLICY "Allow instructor/admin write access" ON "public"."Course" FOR ALL USING (instructorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

-- Course Content Policies (Modules, Lessons, ContentBlocks, etc.)
CREATE POLICY "Allow read access to related users" ON "public"."Module" FOR SELECT USING ((SELECT "public"."Course_check_permissions"(id)) OR (id IN (SELECT "moduleId" FROM "Lesson" l JOIN "LessonCompletionRecord" lcr ON l.id = lcr."lessonId" JOIN "CourseProgress" cp ON lcr."progressId" = cp.id WHERE cp."userId" = auth.uid())));
CREATE POLICY "Allow read access to related users" ON "public"."Lesson" FOR SELECT USING ((SELECT "public"."Course_check_permissions"("moduleId")) OR (id IN (SELECT "lessonId" FROM "LessonCompletionRecord" lcr JOIN "CourseProgress" cp ON lcr."progressId" = cp.id WHERE cp."userId" = auth.uid())));
CREATE POLICY "Allow read access to related users" ON "public"."ContentBlock" FOR SELECT USING ((SELECT "public"."Lesson_check_permissions"("lessonId")));
CREATE POLICY "Allow read access to related users" ON "public"."Quiz" FOR SELECT USING ((SELECT "public"."ContentBlock_check_permissions"("contentBlockId")));
CREATE POLICY "Allow read access to related users" ON "public"."Question" FOR SELECT USING ((SELECT "public"."Quiz_check_permissions"("quizId")));
CREATE POLICY "Allow read access to related users" ON "public"."AnswerOption" FOR SELECT USING ((SELECT "public"."Question_check_permissions"("questionId")));

-- Enrollment & Progress Policies
CREATE POLICY "Allow all access for enrolled users and admins" ON "public"."Enrollment" FOR ALL USING (auth.uid() = "userId" OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');
CREATE POLICY "Allow individual read access" ON "public"."CourseProgress" FOR SELECT USING (auth.uid() = "userId" OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR' OR (EXISTS (SELECT 1 FROM "Course" WHERE id = "courseId" AND "instructorId" = auth.uid())));
CREATE POLICY "Allow read access to related users" ON "public"."LessonCompletionRecord" FOR SELECT USING ((SELECT "public"."CourseProgress_check_permissions"("progressId")));
CREATE POLICY "Allow individual access" ON "public"."QuizAttempt" FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "Allow read access based on quiz attempt" ON "public"."AnswerAttempt" FOR SELECT USING (EXISTS (SELECT 1 FROM "QuizAttempt" WHERE id = "attemptId" AND "userId" = auth.uid()));


-- User-specific content
CREATE POLICY "Allow individual access for user notes" ON "public"."UserNote" FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "Allow read access to authenticated users" ON "public"."UserAchievement" FOR SELECT USING (auth.uid() = "userId");

-- Resources Policies
CREATE POLICY "Allow public read access for resources" ON "public"."Resource" FOR SELECT USING (ispublic = true OR uploaderId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR' OR EXISTS (SELECT 1 FROM "_SharedWithUsers" WHERE "A" = id AND "B" = auth.uid()));
CREATE POLICY "Allow authors and admins to manage resources" ON "public"."Resource" FOR ALL USING ((SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR' OR uploaderId = auth.uid());

-- Global Content Policies
CREATE POLICY "Allow read access based on audience" ON "public"."Announcement" FOR SELECT USING (audience = 'ALL' OR audience = (SELECT role FROM "User" WHERE id = auth.uid())::text);
CREATE POLICY "Allow authors/admins to manage announcements" ON "public"."Announcement" FOR ALL USING ((SELECT role FROM "User" WHERE id = auth.uid()) IN ('ADMINISTRATOR', 'INSTRUCTOR'));
CREATE POLICY "Allow read access based on audience" ON "public"."CalendarEvent" FOR SELECT USING (audienceType = 'ALL' OR audienceType = (SELECT role FROM "User" WHERE id = auth.uid())::text OR EXISTS (SELECT 1 FROM "_EventAttendees" WHERE "A" = id AND "B" = auth.uid()));
CREATE POLICY "Allow authors/admins to manage events" ON "public"."CalendarEvent" FOR ALL USING ((SELECT role FROM "User" WHERE id = auth.uid()) IN ('ADMINISTRATOR', 'INSTRUCTOR'));

-- Notifications & Security Logs
CREATE POLICY "Allow individual access to notifications" ON "public"."Notification" FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "Allow admin access to security logs" ON "public"."SecurityLog" FOR ALL USING ((SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');

-- Forms Policies
CREATE POLICY "Allow read access for published/shared forms" ON "public"."Form" FOR SELECT USING (status = 'PUBLISHED' OR creatorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR' OR EXISTS (SELECT 1 FROM "_SharedForms" WHERE "A" = id AND "B" = auth.uid()));
CREATE POLICY "Allow creator/admin write access" ON "public"."Form" FOR ALL USING (creatorId = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR');
CREATE POLICY "Allow read access for related users" ON "public"."FormField" FOR SELECT USING ((SELECT "public"."Form_check_permissions"("formId")));
CREATE POLICY "Allow users to submit responses" ON "public"."FormResponse" FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM "Form" WHERE id = "formId" AND status = 'PUBLISHED'));
CREATE POLICY "Allow form creators/admins to see responses" ON "public"."FormResponse" FOR SELECT USING (auth.uid() = "userId" OR (SELECT "public"."Form_check_permissions"("formId")));

-- Helper functions to check permissions on related tables
CREATE OR REPLACE FUNCTION "public"."Course_check_permissions"(course_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Course"
    WHERE id = course_id AND (status = 'PUBLISHED' OR "instructorId" = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION "public"."Module_check_permissions"(module_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Module" m JOIN "Course" c ON m."courseId" = c.id
    WHERE m.id = module_id AND "public"."Course_check_permissions"(c.id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION "public"."Lesson_check_permissions"(lesson_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Lesson" l JOIN "Module" m ON l."moduleId" = m.id
    WHERE l.id = lesson_id AND "public"."Module_check_permissions"(m.id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION "public"."ContentBlock_check_permissions"(block_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "ContentBlock" cb JOIN "Lesson" l ON cb."lessonId" = l.id
    WHERE cb.id = block_id AND "public"."Lesson_check_permissions"(l.id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION "public"."Quiz_check_permissions"(quiz_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Quiz" q JOIN "ContentBlock" cb ON q."contentBlockId" = cb.id
    WHERE q.id = quiz_id AND "public"."ContentBlock_check_permissions"(cb.id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION "public"."Question_check_permissions"(question_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Question" q JOIN "Quiz" z ON q."quizId" = z.id
    WHERE q.id = question_id AND "public"."Quiz_check_permissions"(z.id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION "public"."CourseProgress_check_permissions"(progress_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "CourseProgress" cp
    WHERE cp.id = progress_id AND (cp."userId" = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION "public"."Form_check_permissions"(form_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Form" f
    WHERE f.id = form_id AND (f."creatorId" = auth.uid() OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMINISTRATOR' OR EXISTS (SELECT 1 FROM "_SharedForms" sf WHERE sf."A" = f.id AND sf."B" = auth.uid()))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
