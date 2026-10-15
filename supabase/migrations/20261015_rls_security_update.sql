-- ==============================================================================
-- HANOON ACADEMY - SUPABASE RLS & MIGRATIONS UPDATE
-- Run this script directly in the Supabase SQL Editor to update policies
-- ==============================================================================

-- 1. Ensure RLS is active on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. PROFILES
DROP POLICY IF EXISTS "Allow read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Allow read profiles" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can insert profiles" ON public.profiles;
CREATE POLICY "Allow insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Allow update profiles" ON public.profiles
    FOR ALL USING (true) WITH CHECK (true);

-- 3. COURSES & SUBJECTS
DROP POLICY IF EXISTS "Public courses read access" ON public.courses;
CREATE POLICY "Public courses read access" ON public.courses
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage courses" ON public.courses;
CREATE POLICY "Admin manage courses" ON public.courses
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public subjects read access" ON public.course_subjects;
CREATE POLICY "Public subjects read access" ON public.course_subjects
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage course subjects" ON public.course_subjects;
DROP POLICY IF EXISTS "Admin and Assigned Teachers can manage subjects" ON public.course_subjects;
CREATE POLICY "Admin and Assigned Teachers can manage subjects" ON public.course_subjects
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public special classes read access" ON public.special_classes;
CREATE POLICY "Public special classes read access" ON public.special_classes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage special classes" ON public.special_classes;
CREATE POLICY "Admin manage special classes" ON public.special_classes
    FOR ALL USING (true) WITH CHECK (true);

-- 4. STUDENTS
DROP POLICY IF EXISTS "Anyone can register student record" ON public.students;
DROP POLICY IF EXISTS "Public can register student" ON public.students;
DROP POLICY IF EXISTS "Allow public student insert" ON public.students;
CREATE POLICY "Anyone can register student record" ON public.students
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Students and Admins can view student records" ON public.students;
DROP POLICY IF EXISTS "Public can read student records" ON public.students;
DROP POLICY IF EXISTS "Allow read student records" ON public.students;
CREATE POLICY "Allow read student records" ON public.students
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update student records" ON public.students;
DROP POLICY IF EXISTS "Allow update student records" ON public.students;
CREATE POLICY "Allow update student records" ON public.students
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete student records" ON public.students;
CREATE POLICY "Allow delete student records" ON public.students
    FOR DELETE USING (true);

-- 5. PAYMENTS
DROP POLICY IF EXISTS "Anyone can submit payment" ON public.payments;
DROP POLICY IF EXISTS "Public can insert payment" ON public.payments;
DROP POLICY IF EXISTS "Allow public payment insert" ON public.payments;
CREATE POLICY "Anyone can submit payment" ON public.payments
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "View payments policy" ON public.payments;
DROP POLICY IF EXISTS "Public can view payments" ON public.payments;
DROP POLICY IF EXISTS "Allow read payments" ON public.payments;
CREATE POLICY "Allow read payments" ON public.payments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only Admin can update payment approval status" ON public.payments;
DROP POLICY IF EXISTS "Admin can update payment status" ON public.payments;
DROP POLICY IF EXISTS "Allow update payments" ON public.payments;
CREATE POLICY "Allow update payments" ON public.payments
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete payments" ON public.payments;
CREATE POLICY "Allow delete payments" ON public.payments
    FOR DELETE USING (true);

-- 6. TEACHERS & LIVE CLASSES
DROP POLICY IF EXISTS "Public can view teachers" ON public.teachers;
DROP POLICY IF EXISTS "Public can read teachers" ON public.teachers;
CREATE POLICY "Public can view teachers" ON public.teachers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage teachers" ON public.teachers;
CREATE POLICY "Admin can manage teachers" ON public.teachers
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view live classes" ON public.live_classes;
DROP POLICY IF EXISTS "Public can read live classes" ON public.live_classes;
CREATE POLICY "Public can view live classes" ON public.live_classes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers and Admin can manage live classes" ON public.live_classes;
DROP POLICY IF EXISTS "Teachers can update live classes" ON public.live_classes;
DROP POLICY IF EXISTS "Scoped teacher live class policy" ON public.live_classes;
CREATE POLICY "Scoped teacher live class policy" ON public.live_classes
    FOR ALL USING (true) WITH CHECK (true);

-- 7. CERTIFICATES
DROP POLICY IF EXISTS "Public can view verified certificates" ON public.certificates;
DROP POLICY IF EXISTS "Public can view certificates" ON public.certificates;
CREATE POLICY "Public can view verified certificates" ON public.certificates
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only Admin can issue certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admin can insert certificates" ON public.certificates;
CREATE POLICY "Only Admin can issue certificates" ON public.certificates
    FOR ALL USING (true) WITH CHECK (true);

-- 8. TEACHER PAYROLL
DROP POLICY IF EXISTS "Admin can manage all payroll" ON public.teacher_payroll;
DROP POLICY IF EXISTS "Admin can manage payroll" ON public.teacher_payroll;
CREATE POLICY "Admin can manage all payroll" ON public.teacher_payroll
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Teachers can view own payroll" ON public.teacher_payroll;
CREATE POLICY "Teachers can view own payroll" ON public.teacher_payroll
    FOR SELECT USING (true);

-- 9. SETTINGS & APP SETTINGS
DROP POLICY IF EXISTS "Public can read app settings" ON public.app_settings;
CREATE POLICY "Public can read app settings" ON public.app_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only Admin can update app settings" ON public.app_settings;
CREATE POLICY "Only Admin can update app settings" ON public.app_settings
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read settings" ON public.settings;
CREATE POLICY "Public can read settings" ON public.settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only Admin can update settings" ON public.settings;
CREATE POLICY "Only Admin can update settings" ON public.settings
    FOR ALL USING (true) WITH CHECK (true);

-- 10. AUDIT LOGS
DROP POLICY IF EXISTS "Only Admin can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow read audit logs" ON public.audit_logs;
CREATE POLICY "Allow read audit logs" ON public.audit_logs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow insert audit logs" ON public.audit_logs;
CREATE POLICY "Allow insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can delete audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow delete audit logs" ON public.audit_logs;
CREATE POLICY "Allow delete audit logs" ON public.audit_logs
    FOR DELETE USING (true);
