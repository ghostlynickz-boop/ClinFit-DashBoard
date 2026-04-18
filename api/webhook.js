const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // ── CORS ─────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  // ── Validação do secret (Cakto envia em body.secret) ────────────────────
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] WEBHOOK_SECRET não configurado');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const body = req.body ?? {};
  const tokenRecebido = body.secret || '';

  if (tokenRecebido !== secret) {
    console.warn('[webhook] Token inválido ou ausente');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── Filtra apenas compras pagas ──────────────────────────────────────────
  // Ignora eventos que não sejam de pagamento confirmado
  const evento = body.event || '';
  const statusPagamento = body.data?.status || body.data?.payment?.status || '';

  console.log('[webhook] evento:', evento, '| status:', statusPagamento);

  const eventosPagamento = ['purchase.paid', 'purchase_paid', 'sale_approved', 'order.paid'];
  const isPago = eventosPagamento.includes(evento) || statusPagamento === 'paid';

  if (!isPago) {
    console.log('[webhook] evento ignorado (não é pagamento confirmado):', evento);
    return res.status(200).json({ ok: true, skipped: true });
  }

  // ── Extração de email e nome do payload da Cakto ─────────────────────────
  // Estrutura confirmada: { secret, event, data: { customer: { ... } } }
  const data = body.data ?? {};

  const email =
    data?.customer?.email ||
    data?.buyer?.email    ||
    data?.email           ||
    '';

  const nome =
    data?.customer?.name      ||
    data?.customer?.full_name ||
    data?.buyer?.name         ||
    data?.name                ||
    '';

  console.log('[webhook] email:', email, '| nome:', nome);

  // ── Validação do e-mail ───────────────────────────────────────────────────
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    console.warn('[webhook] E-mail não encontrado no payload. data:', JSON.stringify(data));
    return res.status(400).json({ error: 'E-mail inválido ou ausente' });
  }

  // ── Supabase Admin ────────────────────────────────────────────────────────
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
      // Usuário já convidado anteriormente — não é erro crítico
      if (error.message?.includes('already registered') || error.message?.includes('already been invited')) {
        console.log('[webhook] Usuário já existe:', email);
        return res.status(200).json({ ok: true, info: 'already_exists' });
      }
      console.error('[webhook] Erro ao convidar usuário:', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log('[webhook] ✓ Usuário convidado com sucesso:', email);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[webhook] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};
