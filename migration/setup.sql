-- =============================================
-- SANDHYA PHARMACY MANAGEMENT SYSTEM DATABASE
-- =============================================

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create enum for payment methods
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'esewa', 'khalti', 'bank');

-- Create enum for medicine categories
CREATE TYPE public.medicine_category AS ENUM ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'powder', 'inhaler', 'other');

-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('sale', 'purchase', 'payment_received', 'payment_made', 'expense', 'refund');

-- =============================================
-- 1. USER ROLES TABLE (for RLS)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. PHARMACY PROFILE TABLE
-- =============================================
CREATE TABLE public.pharmacy_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Sandhya Pharmacy',
    address TEXT,
    phone TEXT,
    email TEXT,
    pan_number TEXT,
    vat_number TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_profile ENABLE ROW LEVEL SECURITY;

-- Insert default pharmacy profile
INSERT INTO public.pharmacy_profile (name, address) VALUES ('Sandhya Pharmacy', 'Nepal');

-- =============================================
-- 3. MEDICINES TABLE
-- =============================================
CREATE TABLE public.medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    generic_name TEXT,
    category medicine_category NOT NULL DEFAULT 'tablet',
    manufacturer TEXT,
    unit TEXT DEFAULT 'pcs',
    requires_prescription BOOLEAN DEFAULT false,
    description TEXT,
    barcode TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. MEDICINE BATCHES TABLE
-- =============================================
CREATE TABLE public.medicine_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE NOT NULL,
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    mrp DECIMAL(10, 2),
    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medicine_batches ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. CUSTOMERS TABLE
-- =============================================
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    credit_limit DECIMAL(10, 2) DEFAULT 0,
    current_balance DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. SUPPLIERS TABLE
-- =============================================
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    pan_number TEXT,
    current_balance DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. SALES INVOICES TABLE
-- =============================================
CREATE TABLE public.sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id),
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    vat_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    due_amount DECIMAL(10, 2) DEFAULT 0,
    payment_method payment_method DEFAULT 'cash',
    prescription_reference TEXT,
    prescription_image_url TEXT,
    doctor_name TEXT,
    notes TEXT,
    is_vat_inclusive BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. SALE ITEMS TABLE
-- =============================================
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE CASCADE NOT NULL,
    medicine_id UUID REFERENCES public.medicines(id) NOT NULL,
    batch_id UUID REFERENCES public.medicine_batches(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. PURCHASES TABLE
-- =============================================
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number TEXT NOT NULL UNIQUE,
    supplier_id UUID REFERENCES public.suppliers(id),
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    due_amount DECIMAL(10, 2) DEFAULT 0,
    payment_method payment_method DEFAULT 'cash',
    invoice_date DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 10. PURCHASE ITEMS TABLE
-- =============================================
CREATE TABLE public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
    medicine_id UUID REFERENCES public.medicines(id) NOT NULL,
    batch_id UUID REFERENCES public.medicine_batches(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11. PAYMENTS TABLE
-- =============================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_type TEXT NOT NULL, -- 'customer' or 'supplier'
    reference_id UUID NOT NULL, -- customer_id or supplier_id
    amount DECIMAL(10, 2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    reference_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 12. LEDGER TABLE
-- =============================================
CREATE TABLE public.ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type transaction_type NOT NULL,
    reference_id UUID,
    description TEXT NOT NULL,
    debit DECIMAL(10, 2) DEFAULT 0,
    credit DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 13. EXPENSES TABLE
-- =============================================
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method payment_method DEFAULT 'cash',
    receipt_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 14. AUDIT LOGS TABLE
-- =============================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 15. SETTINGS TABLE
-- =============================================
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES 
    ('vat_rate', '13'),
    ('currency', '"NPR"'),
    ('invoice_prefix', '"INV"'),
    ('purchase_prefix', '"PUR"');

-- =============================================
-- SECURITY DEFINER FUNCTION FOR ROLE CHECK
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =============================================
-- RLS POLICIES - Admin only access
-- =============================================

-- User Roles policies
CREATE POLICY "Admin full access to user_roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Pharmacy Profile policies
CREATE POLICY "Admin full access to pharmacy_profile" ON public.pharmacy_profile
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Medicines policies
CREATE POLICY "Admin full access to medicines" ON public.medicines
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Medicine Batches policies
CREATE POLICY "Admin full access to medicine_batches" ON public.medicine_batches
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Customers policies
CREATE POLICY "Admin full access to customers" ON public.customers
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Suppliers policies
CREATE POLICY "Admin full access to suppliers" ON public.suppliers
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Sales Invoices policies
CREATE POLICY "Admin full access to sales_invoices" ON public.sales_invoices
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Sale Items policies
CREATE POLICY "Admin full access to sale_items" ON public.sale_items
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Purchases policies
CREATE POLICY "Admin full access to purchases" ON public.purchases
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Purchase Items policies
CREATE POLICY "Admin full access to purchase_items" ON public.purchase_items
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Payments policies
CREATE POLICY "Admin full access to payments" ON public.payments
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Ledger policies
CREATE POLICY "Admin full access to ledger" ON public.ledger
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Expenses policies
CREATE POLICY "Admin full access to expenses" ON public.expenses
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Audit Logs policies
CREATE POLICY "Admin full access to audit_logs" ON public.audit_logs
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Settings policies
CREATE POLICY "Admin full access to settings" ON public.settings
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- TRIGGER TO AUTO-ASSIGN ADMIN ROLE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FUNCTION TO GENERATE INVOICE NUMBERS
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  SELECT value::TEXT INTO prefix FROM public.settings WHERE key = 'invoice_prefix';
  prefix := COALESCE(REPLACE(prefix, '"', ''), 'INV');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(prefix) + 2) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.sales_invoices
  WHERE invoice_number LIKE prefix || '-%';
  
  result := prefix || '-' || LPAD(next_num::TEXT, 6, '0');
  RETURN result;
END;
$$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_medicines_name ON public.medicines(name);
CREATE INDEX idx_medicines_barcode ON public.medicines(barcode);
CREATE INDEX idx_medicine_batches_medicine_id ON public.medicine_batches(medicine_id);
CREATE INDEX idx_medicine_batches_expiry ON public.medicine_batches(expiry_date);
CREATE INDEX idx_sales_invoices_date ON public.sales_invoices(created_at);
CREATE INDEX idx_sales_invoices_customer ON public.sales_invoices(customer_id);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_suppliers_name ON public.suppliers(name);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);-- Fix function search path for generate_invoice_number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  SELECT value::TEXT INTO prefix FROM public.settings WHERE key = 'invoice_prefix';
  prefix := COALESCE(REPLACE(prefix, '"', ''), 'INV');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(prefix) + 2) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.sales_invoices
  WHERE invoice_number LIKE prefix || '-%';
  
  result := prefix || '-' || LPAD(next_num::TEXT, 6, '0');
  RETURN result;
END;
$$;-- Drop existing restrictive policies and create proper permissive ones

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
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));-- Ensure explicit SELECT protection for customers table
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
USING (public.has_role(auth.uid(), 'admin'::app_role));-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create profiles table for user customization
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Admins have full access
CREATE POLICY "Admin full access to profiles"
ON public.profiles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Update timestamp trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');-- Enable realtime for audit_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;-- Create a function to automatically log database changes
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, new_values, user_id)
    VALUES ('INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, old_values, new_values, user_id)
    VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, old_values, user_id)
    VALUES ('DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers for key tables
CREATE TRIGGER audit_medicines_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.medicines
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_medicine_batches_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.medicine_batches
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_sales_invoices_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_purchases_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_customers_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_suppliers_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_expenses_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();-- Add 'staff' to the app_role enum
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
USING (has_role(auth.uid(), 'staff'::app_role));-- Create a function to check if user is main admin (using text cast to avoid enum commit issue)
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
EXECUTE FUNCTION public.prevent_main_admin_role_change();-- Add main_admin to the enum
ALTER TYPE public.app_role ADD VALUE 'main_admin';-- Update existing admin to main_admin
UPDATE user_roles 
SET role = 'main_admin'::app_role 
WHERE user_id = '176d3779-1cf4-4b5e-8522-a67abf4c6528';-- Drop the existing trigger and function that auto-assigns admin role
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a new function that only creates a profile, NOT a role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only create profile, DO NOT assign any role
  -- Roles must be assigned by admin/main_admin
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update the handle_new_user function to store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;-- Drop the duplicate trigger that's causing the conflict
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();-- Add is_banned column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Add banned_at and banned_by columns for tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_by uuid;

-- Create index for is_banned for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_banned IS 'Whether the user is banned from logging in';
COMMENT ON COLUMN public.profiles.banned_at IS 'Timestamp when the user was banned';
COMMENT ON COLUMN public.profiles.banned_by IS 'User ID of the admin who banned this user';-- Fix security vulnerabilities by adding explicit authentication requirements

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
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'staff'::app_role));-- Add permissive authentication requirement policies to ALL tables
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
USING (auth.uid() IS NOT NULL);-- Add unique constraint on medicine_batches to prevent duplicate batches
-- This ensures same medicine + batch_number + expiry_date combination is unique
ALTER TABLE public.medicine_batches
ADD CONSTRAINT unique_medicine_batch_expiry 
UNIQUE (medicine_id, batch_number, expiry_date);

-- Create a function to normalize and upsert medicine batches
-- This handles the "insert or update quantity" logic at database level
CREATE OR REPLACE FUNCTION public.upsert_medicine_batch(
  p_medicine_id UUID,
  p_batch_number TEXT,
  p_expiry_date DATE,
  p_quantity INTEGER,
  p_purchase_price NUMERIC,
  p_selling_price NUMERIC,
  p_mrp NUMERIC DEFAULT NULL,
  p_min_stock_level INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  was_updated BOOLEAN,
  new_quantity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_existing_quantity INTEGER;
  v_normalized_batch TEXT;
  v_new_quantity INTEGER;
BEGIN
  -- Normalize batch number: uppercase, trim, remove duplicate spaces
  v_normalized_batch := UPPER(TRIM(REGEXP_REPLACE(p_batch_number, '\s+', ' ', 'g')));
  
  -- Check if batch already exists
  SELECT mb.id, mb.quantity INTO v_existing_id, v_existing_quantity
  FROM public.medicine_batches mb
  WHERE mb.medicine_id = p_medicine_id
    AND UPPER(TRIM(REGEXP_REPLACE(mb.batch_number, '\s+', ' ', 'g'))) = v_normalized_batch
    AND mb.expiry_date = p_expiry_date;
  
  IF v_existing_id IS NOT NULL THEN
    -- Update existing batch quantity
    v_new_quantity := v_existing_quantity + p_quantity;
    
    UPDATE public.medicine_batches
    SET quantity = v_new_quantity,
        purchase_price = p_purchase_price,
        selling_price = p_selling_price,
        mrp = COALESCE(p_mrp, mrp),
        min_stock_level = p_min_stock_level,
        updated_at = NOW()
    WHERE medicine_batches.id = v_existing_id;
    
    RETURN QUERY SELECT v_existing_id, TRUE, v_new_quantity;
  ELSE
    -- Insert new batch
    INSERT INTO public.medicine_batches (
      medicine_id, batch_number, expiry_date, quantity,
      purchase_price, selling_price, mrp, min_stock_level
    )
    VALUES (
      p_medicine_id, v_normalized_batch, p_expiry_date, p_quantity,
      p_purchase_price, p_selling_price, p_mrp, p_min_stock_level
    )
    RETURNING medicine_batches.id, FALSE, p_quantity INTO v_existing_id, was_updated, v_new_quantity;
    
    RETURN QUERY SELECT v_existing_id, FALSE, p_quantity;
  END IF;
END;
$$;-- Add rack_no column to medicines table
ALTER TABLE public.medicines ADD COLUMN rack_no TEXT;