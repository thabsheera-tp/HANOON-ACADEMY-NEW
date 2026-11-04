-- ==============================================================================
-- HANOON ACADEMY - DATABASE MIGRATION: FIX PROFILES_ROLE_CHECK CONSTRAINT
-- Resolves ERROR 23514 when creating/updating verifier accounts
-- Supports 'verifier', 'VERIFIER', and legacy 'verification_admin'
-- Preserves existing roles: 'student', 'teacher', 'admin', 'super_admin'
-- Ensures Verifier accounts have strictly scoped verification permissions (never super_admin)
-- ==============================================================================

-- 1. Safely update profiles_role_check constraint to include verifier variants and all valid roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('student', 'teacher', 'admin', 'super_admin', 'verification_admin', 'verifier', 'VERIFIER'));

-- 2. Update RLS helper function for Verification Admin to support 'verifier', 'VERIFIER', and 'verification_admin'
CREATE OR REPLACE FUNCTION public.is_verification_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT lower(role) IN ('verification_admin', 'verifier', 'admin', 'super_admin') 
         FROM public.profiles 
         WHERE id = auth.uid()), 
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Ensure Super Admin helper explicitly restricts access to true admins only (never verifiers)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT lower(role) IN ('admin', 'super_admin') 
         FROM public.profiles 
         WHERE id = auth.uid()), 
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Legacy alias maintains backward compatibility
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT public.is_super_admin();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. Update auth trigger to automatically normalize verifier roles upon creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    raw_role text;
    assigned_role text;
BEGIN
    raw_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
    
    -- Normalize verifier roles safely while preserving allowed values
    IF lower(raw_role) IN ('verifier', 'verification_admin') THEN
        assigned_role := lower(raw_role);
    ELSIF lower(raw_role) IN ('student', 'teacher', 'admin', 'super_admin') THEN
        assigned_role := lower(raw_role);
    ELSE
        assigned_role := 'student';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, district, whatsapp_num)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        assigned_role,
        COALESCE(new.raw_user_meta_data->>'district', 'Kerala'),
        COALESCE(new.raw_user_meta_data->>'whatsapp_num', NULL)
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

