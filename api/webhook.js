const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // ── CORS ────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', 'https://www.kirvano.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Kirvano-Signature');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Validação de assinatura HMAC ─────────────────────────────────────────
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] WEBHOOK_SECRET não configurado — rejeitando requisição');
    return res.status(500).json({ error: 'Webhook not configured' });
  }
  if (true) {
    const signature = req.headers['x-kirvano-signature'] || req.headers['x-signature'] || '';
    const payload   = JSON.stringify(req.body);
    const expected  = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (signature !== expected && signature !== `sha256=${expected}`) {
      console.warn('[webhook] Assinatura inválida');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  // ── Dados do payload ─────────────────────────────────────────────────────
  const { nome, email } = req.body ?? {};

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido ou ausente' });
  }

  // ── Supabase Admin ───────────────────────────────────────────────────────
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data:       { nome: nome || email.split('@')[0] },
      redirectTo: 'https://clin-fit-dash-board.vercel.app/definir-senha.html'
    });

    if (error) {
      console.error('[webhook] Erro ao convidar usuário:', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log('[webhook] Usuário convidado:', email);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[webhook] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};
