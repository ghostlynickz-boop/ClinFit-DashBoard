const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // ── CORS ─────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Cakto-Token, X-Secret-Key, X-Webhook-Token, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  // ── Validação do secret ───────────────────────────────────────────────────
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] WEBHOOK_SECRET não configurado');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  // Cakto envia o token diretamente em um dos headers abaixo (comparação direta)
  const tokenRecebido =
    req.headers['x-cakto-token']    ||
    req.headers['x-secret-key']     ||
    req.headers['x-webhook-token']  ||
    req.headers['x-token']          ||
    req.headers['authorization']?.replace('Bearer ', '') ||
    req.body?.token                 ||
    req.body?.secret                ||
    '';

  // Log de diagnóstico (visível nos logs da Vercel) — remova após confirmar o header
  console.log('[webhook] headers recebidos:', JSON.stringify(Object.keys(req.headers)));
  console.log('[webhook] token encontrado:', tokenRecebido ? '✓ presente' : '✗ ausente');
  console.log('[webhook] body keys:', JSON.stringify(Object.keys(req.body ?? {})));

  // DIAGNÓSTICO TEMPORÁRIO: aceita mesmo sem token para ver o payload completo
  // Remover após identificar o header correto da Cakto
  if (tokenRecebido !== secret) {
    console.warn('[webhook] DIAGNÓSTICO — token não bateu, mas continuando para logar payload');
    console.warn('[webhook] secret esperado (primeiros 8 chars):', secret.slice(0, 8) + '...');
    console.warn('[webhook] token recebido:', tokenRecebido || '(nenhum)');
    // return res.status(401).json({ error: 'Unauthorized' }); // desativado temporariamente
  }

  // ── Extração de nome e email do payload da Cakto ──────────────────────────
  // A Cakto pode usar diferentes estruturas dependendo da versão/evento.
  // Tentamos os caminhos mais comuns em ordem de prioridade.
  const body = req.body ?? {};

  const email =
    body?.customer?.email       ||   // { customer: { email } }
    body?.data?.customer?.email ||   // { data: { customer: { email } } }
    body?.buyer?.email          ||   // { buyer: { email } }
    body?.data?.buyer?.email    ||   // { data: { buyer: { email } } }
    body?.client?.email         ||   // { client: { email } }
    body?.email                 ||   // { email } raiz
    '';

  const nome =
    body?.customer?.name        ||
    body?.customer?.full_name   ||
    body?.data?.customer?.name  ||
    body?.data?.customer?.full_name ||
    body?.buyer?.name           ||
    body?.data?.buyer?.name     ||
    body?.client?.name          ||
    body?.name                  ||
    body?.customer?.nome        ||
    body?.nome                  ||
    '';

  console.log('[webhook] payload recebido — email:', email, '| nome:', nome);
  console.log('[webhook] body completo:', JSON.stringify(body));

  // ── Validação do e-mail ───────────────────────────────────────────────────
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    console.warn('[webhook] E-mail inválido ou não encontrado no payload:', JSON.stringify(body));
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
