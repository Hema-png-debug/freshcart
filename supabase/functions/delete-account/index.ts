// Supabase Edge Function: delete-account
//
// Permanently deletes the CALLING user's account. The service-role key lives
// only here; the caller is identified from their own verified JWT, so a user
// can never delete anyone else's account.
//
// Every user-owned table (profiles, favourites, cart_items, purchase_history,
// orders → order_items, payments) references auth.users with ON DELETE
// CASCADE, so removing the auth user erases all of their data in one step.
//
// Deploy with: supabase functions deploy delete-account

import { createClient } from 'npm:@supabase/supabase-js@2'

// Browser calls (via supabase.functions.invoke) trigger a CORS preflight.
// Set ALLOWED_ORIGIN to your production frontend origin to lock this down.
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace('Bearer ', '')
  if (!jwt) return json({ error: 'Not signed in' }, 401)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // Resolve the caller from their own token — never from the request body.
  const { data: userData, error: userError } = await admin.auth.getUser(jwt)
  if (userError || !userData.user) return json({ error: 'Not signed in' }, 401)

  const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id)
  if (deleteError) return json({ error: deleteError.message }, 500)

  return json({ ok: true })
})
