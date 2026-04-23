-- Add permissive authentication requirement policies to ALL tables
-- These ensure unauthenticated users cannot access any data

-- PROFILES: Add base authentication requirement
CREATE POLICY "Require authentication for profiles"
ON public.profiles FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

-- CUSTOMERS: Add base authentication requirement  
CREATE POLICY "Require authentication for customers"
ON public.customers FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for customers insert"
ON public.customers FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for customers update"
ON public.customers FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for customers delete"
ON public.customers FOR DELETE TO public
USING (auth.uid() IS NOT NULL);

-- SUPPLIERS: Add base authentication requirement
CREATE POLICY "Require authentication for suppliers"
ON public.suppliers FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for suppliers insert"
ON public.suppliers FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for suppliers update"
ON public.suppliers FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for suppliers delete"
ON public.suppliers FOR DELETE TO public
USING (auth.uid() IS NOT NULL);

-- PHARMACY_PROFILE: Add base authentication requirement
CREATE POLICY "Require authentication for pharmacy_profile"
ON public.pharmacy_profile FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

-- SALES_INVOICES: Add base authentication requirement
CREATE POLICY "Require authentication for sales_invoices"
ON public.sales_invoices FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for sales_invoices insert"
ON public.sales_invoices FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for sales_invoices update"
ON public.sales_invoices FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for sales_invoices delete"
ON public.sales_invoices FOR DELETE TO public
USING (auth.uid() IS NOT NULL);

-- PURCHASES: Add base authentication requirement
CREATE POLICY "Require authentication for purchases"
ON public.purchases FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for purchases insert"
ON public.purchases FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for purchases update"
ON public.purchases FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for purchases delete"
ON public.purchases FOR DELETE TO public
USING (auth.uid() IS NOT NULL);

-- PAYMENTS: Add base authentication requirement
CREATE POLICY "Require authentication for payments"
ON public.payments FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for payments insert"
ON public.payments FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for payments update"
ON public.payments FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for payments delete"
ON public.payments FOR DELETE TO public
USING (auth.uid() IS NOT NULL);

-- LEDGER: Add base authentication requirement
CREATE POLICY "Require authentication for ledger"
ON public.ledger FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for ledger insert"
ON public.ledger FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for ledger update"
ON public.ledger FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for ledger delete"
ON public.ledger FOR DELETE TO public
USING (auth.uid() IS NOT NULL);

-- EXPENSES: Add base authentication requirement
CREATE POLICY "Require authentication for expenses"
ON public.expenses FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for expenses insert"
ON public.expenses FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for expenses update"
ON public.expenses FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for expenses delete"
ON public.expenses FOR DELETE TO public
USING (auth.uid() IS NOT NULL);

-- MEDICINES: Add base authentication requirement
CREATE POLICY "Require authentication for medicines"
ON public.medicines FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for medicines insert"
ON public.medicines FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for medicines update"
ON public.medicines FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for medicines delete"
ON public.medicines FOR DELETE TO public
USING (auth.uid() IS NOT NULL);

-- MEDICINE_BATCHES: Add base authentication requirement
CREATE POLICY "Require authentication for medicine_batches"
ON public.medicine_batches FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for medicine_batches insert"
ON public.medicine_batches FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for medicine_batches update"
ON public.medicine_batches FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for medicine_batches delete"
ON public.medicine_batches FOR DELETE TO public
USING (auth.uid() IS NOT NULL);

-- SALE_ITEMS: Add base authentication requirement
CREATE POLICY "Require authentication for sale_items"
ON public.sale_items FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for sale_items insert"
ON public.sale_items FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for sale_items update"
ON public.sale_items FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for sale_items delete"
ON public.sale_items FOR DELETE TO public
USING (auth.uid() IS NOT NULL);

-- PURCHASE_ITEMS: Add base authentication requirement
CREATE POLICY "Require authentication for purchase_items"
ON public.purchase_items FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for purchase_items insert"
ON public.purchase_items FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for purchase_items update"
ON public.purchase_items FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for purchase_items delete"
ON public.purchase_items FOR DELETE TO public
USING (auth.uid() IS NOT NULL);

-- AUDIT_LOGS: Add base authentication requirement
CREATE POLICY "Require authentication for audit_logs"
ON public.audit_logs FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for audit_logs insert"
ON public.audit_logs FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

-- SETTINGS: Add base authentication requirement
CREATE POLICY "Require authentication for settings"
ON public.settings FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

-- USER_ROLES: Add base authentication requirement
CREATE POLICY "Require authentication for user_roles"
ON public.user_roles FOR SELECT TO public
USING (auth.uid() IS NOT NULL);