# Migrating Sandhya Pharmacy to a New Supabase Project

Follow these steps in order. Each step is small, safe, and reversible until the final switchover.

---

## Step 1 — Create the new Supabase project

1. Go to https://supabase.com → **New Project**.
2. Choose a name, password, and the region closest to you.
3. Wait until the project is fully provisioned (1–2 minutes).

---

## Step 2 — Run the schema setup

This creates every table, function, RLS policy, and default setting your app needs.

1. In the new Supabase dashboard, open **SQL Editor → New query**.
2. Open the file `migration/setup.sql` from this project.
3. Copy its **entire contents** and paste into the SQL editor.
4. Click **Run**.
5. Wait for the success message (it can take 10–30 seconds).

If you see "already exists" errors, you can ignore them — the script is safe to re-run.

---

## Step 3 — Create the storage bucket for logos and avatars

The schema script creates the bucket, but double-check:

1. In the new project, open **Storage**.
2. Confirm a public bucket called `avatars` exists.
3. If it doesn't, create one named exactly `avatars` and set it to **Public**.

---

## Step 4 — Get the new project's API credentials

1. In the new project, open **Project Settings → API**.
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`).
3. Copy the **anon public key** (a long JWT string).

Tell me both values and I will store them as secrets and update the app to point to the new project.

---

## Step 5 — (Optional) Migrate your existing data

If you want to bring data across from the old project:

### Option A — Easiest, table-by-table via dashboard
For each table in the old project (medicines, customers, suppliers, sales_invoices, etc.):
1. Open the table → **Export → CSV**.
2. In the new project, open the same table → **Import data → CSV**.

Order matters — import parent tables before children:
1. `pharmacy_profile`, `settings`, `medicines`, `customers`, `suppliers`
2. `medicine_batches`, `purchases`, `sales_invoices`
3. `purchase_items`, `sale_items`, `payments`, `ledger`, `audit_logs`

### Option B — Full SQL dump (faster but technical)
Use `pg_dump` against the old project and `psql` to restore on the new one. Tell me if you want the exact command.

### Skip this step if you want a fresh start
The new project will be empty but fully functional. You can rebuild your medicines list from scratch.

---

## Step 6 — Recreate your admin account

Auth users do **not** carry over.

1. Once I've switched the credentials, open the app.
2. Click **Sign Up** and create your admin account again.
3. The first user automatically becomes the main admin.

---

## Step 7 — Re-upload your pharmacy logo

The logo file lives in the old project's storage. In the new app:
1. Go to **Settings → Pharmacy → Logo**.
2. Click **Upload Logo** and select the file again.
3. Click **Save Pharmacy Profile**.

---

## Rollback

If anything goes wrong, just tell me and I will switch the credentials back to the old project. Until you delete the old project, your data is safe there.
