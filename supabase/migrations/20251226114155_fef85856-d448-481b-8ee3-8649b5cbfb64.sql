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
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);