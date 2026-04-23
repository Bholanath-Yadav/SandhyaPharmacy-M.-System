-- Add is_banned column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Add banned_at and banned_by columns for tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_by uuid;

-- Create index for is_banned for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_banned IS 'Whether the user is banned from logging in';
COMMENT ON COLUMN public.profiles.banned_at IS 'Timestamp when the user was banned';
COMMENT ON COLUMN public.profiles.banned_by IS 'User ID of the admin who banned this user';