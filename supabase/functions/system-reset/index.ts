import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetRequest {
  mode: 'clean' | 'ownership_transfer';
  password: string;
  confirmText: string;
  deleteAuditLogs: boolean;
  newPharmacyDetails?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    vat_number: string;
    pan_number: string;
  };
  newOwner?: {
    email: string;
    password: string;
    full_name: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's session
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is main_admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'main_admin') {
      console.log('Access denied: User is not main_admin', { userId: user.id, role: roleData?.role });
      return new Response(
        JSON.stringify({ error: 'Access denied. Only Main Admin can perform system reset.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ResetRequest = await req.json();
    
    // Validate confirmation text
    if (body.confirmText !== 'RESET SYSTEM') {
      return new Response(
        JSON.stringify({ error: 'Invalid confirmation text. Please type RESET SYSTEM exactly.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password by attempting to sign in
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email!,
      password: body.password,
    });

    if (signInError) {
      console.log('Password verification failed:', signInError.message);
      return new Response(
        JSON.stringify({ error: 'Invalid password. Please enter your correct password.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if another reset is in progress
    const { data: resetLock } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'reset_in_progress')
      .maybeSingle();

    if (resetLock?.value === true) {
      return new Response(
        JSON.stringify({ error: 'Another system reset is already in progress. Please wait.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set reset lock
    await supabaseAdmin.from('settings').upsert({ 
      key: 'reset_in_progress', 
      value: true,
      updated_at: new Date().toISOString()
    });

    console.log(`Starting system reset - Mode: ${body.mode}, User: ${user.email}`);

    try {
      // Log the reset action BEFORE deleting audit logs
      await supabaseAdmin.from('audit_logs').insert({
        action: 'SYSTEM_RESET',
        table_name: 'system',
        user_id: user.id,
        new_values: {
          mode: body.mode,
          delete_audit_logs: body.deleteAuditLogs,
          performed_by: user.email,
          timestamp: new Date().toISOString(),
        },
      });

      // Delete sale items first (foreign key constraint)
      const { error: saleItemsError } = await supabaseAdmin
        .from('sale_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (saleItemsError) console.log('Error deleting sale_items:', saleItemsError);

      // Delete sales invoices
      const { error: salesError } = await supabaseAdmin
        .from('sales_invoices')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (salesError) console.log('Error deleting sales_invoices:', salesError);

      // Delete purchase items first (foreign key constraint)
      const { error: purchaseItemsError } = await supabaseAdmin
        .from('purchase_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (purchaseItemsError) console.log('Error deleting purchase_items:', purchaseItemsError);

      // Delete purchases
      const { error: purchasesError } = await supabaseAdmin
        .from('purchases')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (purchasesError) console.log('Error deleting purchases:', purchasesError);

      // Delete payments
      const { error: paymentsError } = await supabaseAdmin
        .from('payments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (paymentsError) console.log('Error deleting payments:', paymentsError);

      // Delete medicine batches
      const { error: batchesError } = await supabaseAdmin
        .from('medicine_batches')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (batchesError) console.log('Error deleting medicine_batches:', batchesError);

      // Delete medicines
      const { error: medicinesError } = await supabaseAdmin
        .from('medicines')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (medicinesError) console.log('Error deleting medicines:', medicinesError);

      // Delete customers
      const { error: customersError } = await supabaseAdmin
        .from('customers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (customersError) console.log('Error deleting customers:', customersError);

      // Delete suppliers
      const { error: suppliersError } = await supabaseAdmin
        .from('suppliers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (suppliersError) console.log('Error deleting suppliers:', suppliersError);

      // Delete ledger entries
      const { error: ledgerError } = await supabaseAdmin
        .from('ledger')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (ledgerError) console.log('Error deleting ledger:', ledgerError);

      // Delete expenses
      const { error: expensesError } = await supabaseAdmin
        .from('expenses')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (expensesError) console.log('Error deleting expenses:', expensesError);

      // Optionally delete audit logs (except the reset log we just created)
      if (body.deleteAuditLogs) {
        const { error: auditError } = await supabaseAdmin
          .from('audit_logs')
          .delete()
          .neq('action', 'SYSTEM_RESET');
        if (auditError) console.log('Error deleting audit_logs:', auditError);
      }

      // Mode-specific actions
      if (body.mode === 'clean') {
        // Update pharmacy profile if provided
        if (body.newPharmacyDetails) {
          await supabaseAdmin
            .from('pharmacy_profile')
            .update({
              name: body.newPharmacyDetails.name,
              address: body.newPharmacyDetails.address,
              phone: body.newPharmacyDetails.phone,
              email: body.newPharmacyDetails.email,
              vat_number: body.newPharmacyDetails.vat_number,
              pan_number: body.newPharmacyDetails.pan_number,
              updated_at: new Date().toISOString(),
            })
            .neq('id', '00000000-0000-0000-0000-000000000000');
        }
        
        console.log('Clean reset completed - Main Admin and settings preserved');
      } else if (body.mode === 'ownership_transfer') {
        // Get all users except the current main admin (we'll delete them)
        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
        
        if (allUsers?.users) {
          for (const existingUser of allUsers.users) {
            if (existingUser.id !== user.id) {
              // Delete their roles
              await supabaseAdmin
                .from('user_roles')
                .delete()
                .eq('user_id', existingUser.id);
              
              // Delete their profile
              await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', existingUser.id);
              
              // Delete the user
              await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
            }
          }
        }

        // Delete current main admin's role and profile
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', user.id);
        
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', user.id);

        // Create new main admin if details provided
        if (body.newOwner) {
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: body.newOwner.email,
            password: body.newOwner.password,
            email_confirm: true,
            user_metadata: {
              full_name: body.newOwner.full_name,
            },
          });

          if (createError) {
            console.log('Error creating new owner:', createError);
            throw new Error('Failed to create new owner account');
          }

          if (newUser.user) {
            // Create profile for new owner
            await supabaseAdmin.from('profiles').insert({
              id: newUser.user.id,
              email: body.newOwner.email,
              full_name: body.newOwner.full_name,
            });

            // Assign main_admin role to new owner
            await supabaseAdmin.from('user_roles').insert({
              user_id: newUser.user.id,
              role: 'main_admin',
            });
          }
        }

        // Update pharmacy profile if provided
        if (body.newPharmacyDetails) {
          await supabaseAdmin
            .from('pharmacy_profile')
            .update({
              name: body.newPharmacyDetails.name,
              address: body.newPharmacyDetails.address,
              phone: body.newPharmacyDetails.phone,
              email: body.newPharmacyDetails.email,
              vat_number: body.newPharmacyDetails.vat_number,
              pan_number: body.newPharmacyDetails.pan_number,
              updated_at: new Date().toISOString(),
            })
            .neq('id', '00000000-0000-0000-0000-000000000000');
        }

        // Delete the current main admin last
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        
        console.log('Ownership transfer completed - All users removed, new owner created');
      }

      // Clear reset lock
      await supabaseAdmin.from('settings').delete().eq('key', 'reset_in_progress');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: body.mode === 'clean' 
            ? 'System has been reset. Your account and settings are preserved.' 
            : 'Ownership transfer complete. The new owner can now log in.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (resetError: any) {
      // Clear reset lock on error
      await supabaseAdmin.from('settings').delete().eq('key', 'reset_in_progress');
      
      console.error('Reset operation failed:', resetError);
      return new Response(
        JSON.stringify({ error: resetError.message || 'Reset operation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('System reset error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
