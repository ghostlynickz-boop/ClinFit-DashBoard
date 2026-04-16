import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Método não permitido', { status: 405 })
  }
  try {
    const { nome, email } = await req.json()
    if (!email || !nome) {
      return new Response(JSON.stringify({ error: 'Email e nome obrigatórios' }), { status: 400 })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { error } = await supabase.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      {
        data: { nome: nome.trim() },
        redirectTo: 'https://clin-fit-dash-board.vercel.app/definir-senha.html'
      }
    )
    if (error && !error.message.includes('already been registered')) throw error
    return new Response(JSON.stringify({ success: true, email }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
