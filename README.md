# Sandhya Pharmacy Management System

A modern **Pharmacy Management System** built with **React + TypeScript (Vite)** and powered by **Supabase**.  
It helps manage **medicine inventory**, **sales & invoices**, **customers/suppliers**, **purchases**, **reports**, and includes an **AI Medicine Assistant**.

---

## Features

- **Authentication (Protected Routes)**
  - Login page and protected pages via app routing

- **Dashboard**
  - Sales overview, profit calculations, total revenue, customers, stock, dues, low stock alerts, expiry alerts
  - Charts and recent activity

- **Medicine Inventory**
  - Add / edit medicines (admin)
  - Categories, barcode, rack number, units
  - Batch handling (stock and expiry)
  - Duplicate medicine merge support

- **Sales & Invoicing**
  - Sales entry workflow
  - Invoices page (PDF/print/export supported via libraries)

- **Customers & Suppliers**
  - Customer management (including balances/dues)
  - Supplier management

- **Purchases**
  - Purchase records and stock updates via batches

- **Reports**
  - Business reports and analytics

- **Expiry Alerts**
  - Alerts for items expiring soon

- **Users & Settings**
  - User/admin controls and app settings

- **AI Medicine Assistant**
  - Chat UI that calls a Supabase Edge Function (`medicine-assistant`)
  - Streaming responses (SSE-style)
  - Quick prompts for common questions (alternatives, interactions, etc.)

---

## Tech Stack

**Frontend**
- Vite + React + TypeScript
- React Router DOM
- TanStack React Query
- Tailwind CSS + shadcn/ui (Radix UI components)

**Backend**
- Supabase (Database + Auth + Edge Functions)

**Other Libraries**
- Recharts (charts)
- @react-pdf/renderer (PDF)
- xlsx (Excel export)
- react-hook-form + zod (forms/validation)
- sonner (toasts)

---

## Project Structure (high level)

- `src/pages/` – App pages (Dashboard, Medicines, Sales, Reports, etc.)
- `src/components/` – UI + app components (Layout, ProtectedRoute, dialogs, etc.)
- `src/contexts/` – Context providers (Auth, etc.)
- `src/integrations/supabase/` – Supabase client and types
- `supabase/` – Supabase local configuration / functions config

---

## Getting Started (Local Setup)

### 1) Clone the repository
```bash
git clone https://github.com/Bholanath-Yadav/SandhyaPharmacy-M.-System.git
cd SandhyaPharmacy-M.-System
```

### 2) Install dependencies
Using npm:
```bash
npm install
```

Or if you prefer bun:
```bash
bun install
```

### 3) Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY
```

> The AI assistant and app data fetching depend on these variables.

### 4) Run the app
```bash
npm run dev
```

Then open the URL shown in your terminal (usually `http://localhost:5173`).

---

## Supabase Setup Notes

This project expects Supabase tables like:
- `medicines`
- `medicine_batches`
- `sales_invoices`
- `sale_items`
- `customers`
- `expenses`
(and others used by pages)

Edge functions configured in `supabase/config.toml` include:
- `medicine-assistant`
- `system-reset`

---

## Available Scripts

- `npm run dev` – start development server
- `npm run build` – build for production
- `npm run preview` – preview production build locally
- `npm run lint` – run ESLint

---

## Screens / Pages

Routes are defined in `src/App.tsx`, including:

- `/auth`
- `/` (Dashboard)
- `/medicines`
- `/sales`
- `/invoices`
- `/customers`
- `/suppliers`
- `/purchases`
- `/reports`
- `/expiry-alerts`
- `/activity`
- `/users`
- `/settings`
- `/ai-assistant`

---

## Security / Disclaimer (AI)

The **AI Medicine Assistant** is for informational use only.
Always verify medicine information and consult qualified healthcare professionals when needed.

---

## License

Add a license if you plan to open-source this project (e.g., MIT).
