-- Fix security vulnerabilities by adding explicit authentication requirements

-- Drop existing policies that could allow unauthenticated access
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view own profile" ON public.profiles;

-- Recreate profiles policies with explicit authentication checks
CREATE POLICY "Users can read own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Staff can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'staff'::app_role) AND auth.uid() = id);

-- Drop existing customers policies
DROP POLICY IF EXISTS "Admin delete customers" ON public.customers;
DROP POLICY IF EXISTS "Admin insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admin select customers" ON public.customers;
DROP POLICY IF EXISTS "Admin update customers" ON public.customers;
DROP POLICY IF EXISTS "Staff full access to customers" ON public.customers;

-- Recreate customers policies with explicit authentication checks
CREATE POLICY "Admin select customers" 
ON public.customers 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin insert customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin update customers" 
ON public.customers 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin delete customers" 
ON public.customers 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff full access to customers" 
ON public.customers 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'staff'::app_role));