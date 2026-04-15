const { createClient } = require('@supabase/supabase-js')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS)
    return res.end()
  }

  if (req.method !== 'POST') {
    res.writeHead(405, CORS_HEADERS)
    return res.end(JSON.stringify({ error: 'Método não permitido' }))
  }

  try {
    const { nome, email } = req.body ?? {}

    if (!email || !nome) {
      res.writeHead(400, CORS_HEADERS)
      return res.end(JSON.stringify({ error: 'Email e nome são obrigatórios' }))
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      { data: { nome: nome.trim() } }
    )

    if (error) {
      if (error.message.includes('already been registered')) {
        res.writeHead(200, CORS_HEADERS)
        return res.end(JSON.stringify({ success: true, message: 'Usuário já existe' }))
      }
      throw error
    }

    res.writeHead(200, CORS_HEADERS)
    return res.end(JSON.stringify({ success: true, email }))

  } catch (err) {
    res.writeHead(500, CORS_HEADERS)
    return res.end(JSON.stringify({ error: err.message }))
  }
}
