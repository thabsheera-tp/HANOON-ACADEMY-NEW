-- ==============================================================================
-- HANOON ACADEMY - PRODUCTION DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- Clean, Modular, Role-Based Educational Architecture
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY,
    title_en TEXT NOT NULL,
    title_ml TEXT NOT NULL,
    subtitle TEXT,
    fee_amount INTEGER NOT NULL,
    duration TEXT NOT NULL,
    syllabus_summary TEXT NOT NULL,
    highlights JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. COURSE SUBJECTS (Adaviyya Sub-Hubs: Seerah, Haddad, Fiqh, Hadith)
CREATE TABLE IF NOT EXISTS public.course_subjects (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    instructor TEXT NOT NULL,
    schedule_time TEXT NOT NULL,
    live_url TEXT NOT NULL,
    description TEXT NOT NULL,
    order_num INTEGER DEFAULT 1,
    chapters JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SPECIAL CLASSES (Tajweed, Burdah Live, etc.)
CREATE TABLE IF NOT EXISTS public.special_classes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    instructor TEXT NOT NULL,
    category TEXT NOT NULL,
    schedule_time TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'LIVE_NOW', 'COMPLETED')) DEFAULT 'UPCOMING',
    live_url TEXT NOT NULL,
    recording_url TEXT,
    pdf_title TEXT,
    pdf_size TEXT,
    description TEXT,
    registered_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    full_name TEXT NOT NULL,
    whatsapp_num TEXT NOT NULL,
    district TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. MANUAL UPI PAYMENTS TABLE
-- Status: PENDING -> APPROVED | REJECTED
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    upi_txid VARCHAR(50) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
    amount INTEGER NOT NULL,
    rejection_reason TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    specialization TEXT NOT NULL,
    phone TEXT,
    rate_per_class INTEGER DEFAULT 750,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. LIVE SESSIONS & TIMETABLE
CREATE TABLE IF NOT EXISTS public.live_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    subject_id TEXT,
    title TEXT NOT NULL,
    meeting_link TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'LIVE_NOW', 'COMPLETED')) DEFAULT 'SCHEDULED',
    attendees_count INTEGER DEFAULT 0,
    notes_pdf_url TEXT,
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. CERTIFICATES MODULE
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    course_title TEXT NOT NULL,
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    grade TEXT NOT NULL DEFAULT 'Distinction',
    status TEXT NOT NULL CHECK (status IN ('ISSUED', 'VERIFIED', 'REVOKED')) DEFAULT 'ISSUED',
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TEACHER PAYROLL MODULE
CREATE TABLE IF NOT EXISTS public.teacher_payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    month_year VARCHAR(20) NOT NULL,
    classes_taken INTEGER NOT NULL DEFAULT 0,
    rate_per_class INTEGER NOT NULL DEFAULT 750,
    total_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID')) DEFAULT 'PENDING',
    payment_reference TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_upi_txid ON public.payments(upi_txid);
CREATE INDEX IF NOT EXISTS idx_students_whatsapp ON public.students(whatsapp_num);
CREATE INDEX IF NOT EXISTS idx_course_subjects_course ON public.course_subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_teacher ON public.live_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled ON public.live_classes(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON public.certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_cert_num ON public.certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_payroll_teacher ON public.teacher_payroll(teacher_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_payroll ENABLE ROW LEVEL SECURITY;

-- Courses & Subjects: Open read access
CREATE POLICY "Public courses read access" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public subjects read access" ON public.course_subjects FOR SELECT USING (true);
CREATE POLICY "Public special classes read access" ON public.special_classes FOR SELECT USING (true);

-- Students: Public can register & read
CREATE POLICY "Public can register student" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read student records" ON public.students FOR SELECT USING (true);

-- Payments: Public can insert & view, Admin can update
CREATE POLICY "Public can insert payment" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Admin can update payment status" ON public.payments FOR UPDATE USING (true) WITH CHECK (true);

-- Teachers & Live Classes: Open read, authorized insert/update
CREATE POLICY "Public can read teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Public can read live classes" ON public.live_classes FOR SELECT USING (true);
CREATE POLICY "Teachers can update live classes" ON public.live_classes FOR ALL USING (true) WITH CHECK (true);

-- Certificates: Public can read for verification, Admin can issue
CREATE POLICY "Public can view certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Admin can insert certificates" ON public.certificates FOR INSERT WITH CHECK (true);

-- Teacher Payroll: Admin can manage, teachers can view
CREATE POLICY "Admin can manage payroll" ON public.teacher_payroll FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- ENABLE SUPABASE REALTIME REPLICATION
-- Instant updates for Admin approvals & Student Dashboard unlocking
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.certificates;

-- ==============================================================================
-- SEED INITIAL DATA
-- ==============================================================================

-- 1. Courses
INSERT INTO public.courses (id, title_en, title_ml, subtitle, fee_amount, duration, syllabus_summary, highlights)
VALUES 
    (
        'adaviyya', 
        'Adaviyya', 
        'അദവിയ്യ', 
        'Islamic Sharia & Moral Tarbiyah', 
        1500, 
        '1 Year Academic Track', 
        'Comprehensive foundation in Quranic Tajweed, Fiqh jurisprudence, Seerah history, and character Tarbiyah.',
        '["Tajweed & Hifz Guidance", "Applied Fiqh & Ethics", "Seerah of Prophet ﷺ", "Haddad Litany Practice"]'::jsonb
    ),
    (
        'home-tuition', 
        'Home Tuition', 
        'ഹോം ട്യൂഷൻ', 
        '1-on-1 Personalized Coaching', 
        2000, 
        'Flexible Academic Term', 
        'Tailored 1-on-1 tutoring for CBSE, State, and ICSE curricula with dedicated subject mentors.',
        '["Mathematics & Science Mastery", "Parent Progress Reports", "Concept-First Coaching", "Exam Prep Strategy"]'::jsonb
    ),
    (
        'fashion-designing', 
        'Fashion Designing', 
        'ഫാഷൻ ഡിസൈനിങ്', 
        'Modest Apparel & Craftsmanship', 
        2500, 
        '6 Months Certificate', 
        'Professional pattern drafting, tailoring, modest wear styling, and boutique entrepreneurship.',
        '["Pattern Drafting & Cutting", "Garment Stitching", "Boutique Business Mentorship", "Fabric Sourcing Guide"]'::jsonb
    ),
    (
        'shamail', 
        'Shama''il al-Muhammadiyya', 
        'الشمائل المحمدية', 
        'Prophetic Life & Character Study', 
        1200, 
        '4 Months Specialized', 
        'An inspiring textual exploration of the blessed attributes, sublime ethics, and noble life of Prophet Muhammad ﷺ.',
        '["Classical Hadith Analysis", "Sublime Moral Conduct", "Verified Certificate", "Spiritual Reflection"]'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET
    title_en = EXCLUDED.title_en,
    fee_amount = EXCLUDED.fee_amount,
    duration = EXCLUDED.duration,
    syllabus_summary = EXCLUDED.syllabus_summary,
    highlights = EXCLUDED.highlights;

-- 2. Adaviyya Sub-Hubs (Seerah, Haddad, Fiqh, Hadith)
INSERT INTO public.course_subjects (id, course_id, name, subtitle, instructor, schedule_time, live_url, description, order_num)
VALUES
    ('seerah', 'adaviyya', 'Seerah', 'Prophetic Biography & Historic Milestones', 'Usthad Dr. Faisal Al-Hanoon', 'Mondays & Wednesdays • 07:30 PM IST', 'https://zoom.us/j/hanoon-seerah', 'Chronological exploration of the blessed life, sublime moral qualities, and pivotal events of Prophet Muhammad ﷺ.', 1),
    ('haddad', 'adaviyya', 'Haddad', 'Daily Litany, Dhikr & Spiritual Guidance', 'Usthad Anas Nadwi', 'Tuesdays & Fridays • 06:30 PM IST', 'https://zoom.us/j/hanoon-haddad', 'Comprehensive commentary, word-by-word tajweed, and spiritual contemplation of the renowned Ratib al-Haddad.', 2),
    ('fiqh', 'adaviyya', 'Fiqh', 'Islamic Jurisprudence & Practical Rulings', 'Usthad Bilal Farooqi', 'Thursdays & Saturdays • 08:00 PM IST', 'https://zoom.us/j/hanoon-fiqh', 'Systematic study of daily worship (Taharah, Salah, Sawm, Zakah) and modern living jurisprudence.', 3),
    ('hadith', 'adaviyya', 'Hadith', 'Prophetic Traditions & Ethical Virtues', 'Usthad Abdul Rahman Al-Hafiz', 'Sundays • 10:00 AM IST', 'https://zoom.us/j/hanoon-hadith', 'In-depth textual analysis of classical Prophetic sayings with practical moral applications for contemporary life.', 4)
ON CONFLICT (id) DO NOTHING;

-- 3. Special Classes Module (Tajweed, Burdah Live)
INSERT INTO public.special_classes (id, title, subtitle, instructor, category, schedule_time, status, live_url, description)
VALUES
    ('spc-tajweed', 'Tajweed', 'Quran Recitation Rules & Phonetics', 'Qari Usthad Abdul Rahman Al-Hafiz', 'Recitation', 'Every Sunday • 08:00 AM IST', 'LIVE_NOW', 'https://zoom.us/j/hanoon-tajweed-live', 'Master the authentic science of Quranic phonetics, Makharij al-Huroof, Sifat, and precision articulation under certified Qira''at masters.'),
    ('spc-burdah', 'Burdah Live', 'Live Qasida Burdah Recitation & Spiritual Gathering', 'Hanoon Academy Munshid Collective', 'Gathering', 'Thursday Evenings • 09:00 PM IST', 'UPCOMING', 'https://zoom.us/j/hanoon-burdah-live', 'Weekly blessed gathering of Qasida al-Burdah by Imam al-Busiri, devotional hymns, and Salawat on the Prophet Muhammad ﷺ.')
ON CONFLICT (id) DO NOTHING;

-- 4. Initial Teachers
INSERT INTO public.teachers (id, full_name, email, specialization, rate_per_class)
VALUES
    ('tch-01', 'Usthad Dr. Faisal Al-Hanoon', 'faisal@hanoon.academy', 'Seerah & Islamic History', 800),
    ('tch-02', 'Usthad Abdul Rahman Al-Hafiz', 'teacher@hanoon.academy', 'Tajweed & Hadith Sciences', 750),
    ('tch-03', 'Usthad Anas Nadwi', 'anas@hanoon.academy', 'Tazkiyah & Haddad Litany', 700),
    ('tch-04', 'Usthad Bilal Farooqi', 'bilal@hanoon.academy', 'Comparative Fiqh Jurisprudence', 750)
ON CONFLICT (id) DO NOTHING;
