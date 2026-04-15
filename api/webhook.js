// api/webhook.js — Webhook Kirvano → ClinFit
//
// Fluxo:
//   1. Cliente paga na Kirvano
//   2. Kirvano envia POST para /api/webhook com os dados do comprador
//   3. Esta função cria o usuário no Supabase Auth e dispara o e-mail de acesso
//
// Variáveis de ambiente necessárias (configurar no painel da Vercel):
//   SUPABASE_URL         → URL do projeto (ex: https://xxxx.supabase.co)
//   SUPABASE_SERVICE_KEY → service_role key (Settings > API > service_role)
//                          ⚠️  NUNCA exponha esta chave no frontend

import { createClient } from '@supabase/supabase-js';

// Headers CORS — permite requisições de qualquer origem (necessário para webhooks)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {

  // ── Preflight CORS (navegadores enviam OPTIONS antes do POST) ──────────
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // ── Apenas POST é aceito ───────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.writeHead(405, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Método não permitido. Use POST.' }));
    return;
  }

  try {
    // ── 1. Extrair nome e email do body ───────────────────────────────────
    const { nome, email, ...restoDados } = req.body ?? {};

    if (!email) {
      res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Campo "email" é obrigatório no body da requisição.' }));
      return;
    }

    if (!nome) {
      res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Campo "nome" é obrigatório no body da requisição.' }));
      return;
    }

    // ── 2. Inicializa o cliente Supabase com a service_role key ───────────
    //    A service_role bypassa o RLS e tem permissão para criar usuários
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession:   false,
        },
      }
    );

    // ── 3. Cria o usuário e envia o e-mail de convite/acesso ──────────────
    //    inviteUserByEmail cria a conta e manda um magic link para o e-mail
    //    O campo `data` fica disponível em user.user_metadata dentro do app
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      {
        data: {
          nome: nome.trim(),   // salvo em user_metadata, usado na sidebar do dashboard
          ...restoDados,       // quaisquer campos extras enviados pela Kirvano
        },
        // redirectTo: 'https://seudominio.com/dashboard/index.html', // opcional: redireciona após definir senha
      }
    );

    if (inviteError) {
      // Trata caso especial: usuário já existente — não é um erro crítico
      if (inviteError.message?.includes('already been registered')) {
        console.log(`[webhook] Usuário já cadastrado: ${email}`);
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Usuário já existente — nenhuma ação necessária.',
          email,
        }));
        return;
      }

      // Qualquer outro erro do Supabase
      throw new Error(inviteError.message);
    }

    // ── 4. Sucesso ─────────────────────────────────────────────────────────
    console.log(`[webhook] Usuário criado com sucesso: ${email}`);

    res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: `Convite enviado para ${email}. O usuário receberá um e-mail para definir a senha e acessar o ClinFit.`,
      userId:  inviteData?.user?.id ?? null,
    }));

  } catch (err) {
    // ── 5. Erro genérico ───────────────────────────────────────────────────
    console.error('[webhook] Erro ao processar requisição:', err.message);

    res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error:   'Erro interno ao processar o webhook.',
      detalhe: err.message,
    }));
  }
}
