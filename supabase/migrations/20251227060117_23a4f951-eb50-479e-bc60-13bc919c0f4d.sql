-- Add 'staff' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';

-- Staff policies for medicines (SELECT only)
CREATE POLICY "Staff can view medicines" 
ON public.medicines 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));

-- Staff policies for medicine_batches (SELECT only)
CREATE POLICY "Staff can view medicine_batches" 
ON public.medicine_batches 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));

-- Staff FULL access to sales_invoices
CREATE POLICY "Staff full access to sales_invoices" 
ON public.sales_invoices 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role));

-- Staff FULL access to sale_items
CREATE POLICY "Staff full access to sale_items" 
ON public.sale_items 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role));

-- Staff FULL access to customers
CREATE POLICY "Staff full access to customers" 
ON public.customers 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role));

-- Staff can view their own profile
CREATE POLICY "Staff can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) AND auth.uid() = id);

-- Staff can view audit_logs (read only)
CREATE POLICY "Staff can view audit_logs" 
ON public.audit_logs 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));

-- Staff can view settings (read only)
CREATE POLICY "Staff can view settings" 
ON public.settings 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));

-- Staff can view pharmacy_profile (read only)
CREATE POLICY "Staff can view pharmacy_profile" 
ON public.pharmacy_profile 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));