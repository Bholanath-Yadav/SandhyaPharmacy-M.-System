-- Ensure explicit SELECT protection for customers table
DROP POLICY IF EXISTS "Admin full access to customers" ON public.customers;
CREATE POLICY "Admin select customers" ON public.customers
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin insert customers" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin update customers" ON public.customers
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin delete customers" ON public.customers
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure explicit SELECT protection for pharmacy_profile table
DROP POLICY IF EXISTS "Admin full access to pharmacy_profile" ON public.pharmacy_profile;
CREATE POLICY "Admin select pharmacy_profile" ON public.pharmacy_profile
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin insert pharmacy_profile" ON public.pharmacy_profile
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin update pharmacy_profile" ON public.pharmacy_profile
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin delete pharmacy_profile" ON public.pharmacy_profile
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));