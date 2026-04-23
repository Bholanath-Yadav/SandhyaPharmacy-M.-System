-- Drop existing restrictive policies and create proper permissive ones

-- customers table
DROP POLICY IF EXISTS "Admin full access to customers" ON public.customers;
CREATE POLICY "Admin full access to customers" ON public.customers
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- audit_logs table
DROP POLICY IF EXISTS "Admin full access to audit_logs" ON public.audit_logs;
CREATE POLICY "Admin full access to audit_logs" ON public.audit_logs
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- medicines table
DROP POLICY IF EXISTS "Admin full access to medicines" ON public.medicines;
CREATE POLICY "Admin full access to medicines" ON public.medicines
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- medicine_batches table
DROP POLICY IF EXISTS "Admin full access to medicine_batches" ON public.medicine_batches;
CREATE POLICY "Admin full access to medicine_batches" ON public.medicine_batches
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- expenses table
DROP POLICY IF EXISTS "Admin full access to expenses" ON public.expenses;
CREATE POLICY "Admin full access to expenses" ON public.expenses
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ledger table
DROP POLICY IF EXISTS "Admin full access to ledger" ON public.ledger;
CREATE POLICY "Admin full access to ledger" ON public.ledger
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- payments table
DROP POLICY IF EXISTS "Admin full access to payments" ON public.payments;
CREATE POLICY "Admin full access to payments" ON public.payments
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- pharmacy_profile table
DROP POLICY IF EXISTS "Admin full access to pharmacy_profile" ON public.pharmacy_profile;
CREATE POLICY "Admin full access to pharmacy_profile" ON public.pharmacy_profile
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- purchase_items table
DROP POLICY IF EXISTS "Admin full access to purchase_items" ON public.purchase_items;
CREATE POLICY "Admin full access to purchase_items" ON public.purchase_items
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- purchases table
DROP POLICY IF EXISTS "Admin full access to purchases" ON public.purchases;
CREATE POLICY "Admin full access to purchases" ON public.purchases
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- sale_items table
DROP POLICY IF EXISTS "Admin full access to sale_items" ON public.sale_items;
CREATE POLICY "Admin full access to sale_items" ON public.sale_items
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- sales_invoices table
DROP POLICY IF EXISTS "Admin full access to sales_invoices" ON public.sales_invoices;
CREATE POLICY "Admin full access to sales_invoices" ON public.sales_invoices
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- settings table
DROP POLICY IF EXISTS "Admin full access to settings" ON public.settings;
CREATE POLICY "Admin full access to settings" ON public.settings
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- suppliers table
DROP POLICY IF EXISTS "Admin full access to suppliers" ON public.suppliers;
CREATE POLICY "Admin full access to suppliers" ON public.suppliers
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- user_roles table - allow users to read their own role
DROP POLICY IF EXISTS "Admin full access to user_roles" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin full access to user_roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));