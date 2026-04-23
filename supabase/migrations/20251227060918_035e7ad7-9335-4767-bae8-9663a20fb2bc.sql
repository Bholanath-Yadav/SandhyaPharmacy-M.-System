-- Create a function to check if user is main admin (using text cast to avoid enum commit issue)
CREATE OR REPLACE FUNCTION public.is_main_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'main_admin'
  );
END;
$$;

-- Update has_role to also grant access if user is main_admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR role::text = 'main_admin')
  );
END;
$$;

-- Prevent deletion of main_admin from user_roles
CREATE OR REPLACE FUNCTION public.prevent_main_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role::text = 'main_admin' THEN
    RAISE EXCEPTION 'Cannot delete main admin user';
  END IF;
  RETURN OLD;
END;
$$;

-- Create trigger to prevent main_admin deletion
DROP TRIGGER IF EXISTS prevent_main_admin_deletion_trigger ON public.user_roles;
CREATE TRIGGER prevent_main_admin_deletion_trigger
BEFORE DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_main_admin_deletion();

-- Prevent changing main_admin role to something else (only main_admin can do this)
CREATE OR REPLACE FUNCTION public.prevent_main_admin_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If changing FROM main_admin to something else
  IF OLD.role::text = 'main_admin' AND NEW.role::text != 'main_admin' THEN
    -- Only allow if the current user is also a main_admin
    IF NOT public.is_main_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only main admin can change main admin role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_main_admin_role_change_trigger ON public.user_roles;
CREATE TRIGGER prevent_main_admin_role_change_trigger
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_main_admin_role_change();