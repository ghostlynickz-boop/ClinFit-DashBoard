/**
 * financeiro.js — Utilitários financeiros
 * Usados como helpers; lógica de UI está inline em financeiro.html.
 * NÃO usa ES modules — depende de window._sb definido por clinfit.js.
 */

/**
 * Busca cobranças de um mês específico.
 * Resolve o último dia real do mês para evitar datas inválidas (ex: 31/04).
 *
 * @param {string} userId
 * @param {number} ano
 * @param {number} mes  - 1 a 12
 * @returns {Promise<Array>}
 */
async function getCobrancasMes(userId, ano, mes) {
  const mm       = String(mes).padStart(2, '0');
  const inicio   = `${ano}-${mm}-01`;
  // new Date(ano, mes, 0) → último dia real do mês (0 = dia anterior ao dia 1 do mês seguinte)
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim       = `${ano}-${mm}-${String(ultimoDia).padStart(2, '0')}`;

  console.log('[financeiro.js] getCobrancasMes →', { userId, inicio, fim });

  const { data, error } = await window._sb
    .from('cobrancas')
    .select('*')
    .eq('usuario_id', userId)
    .gte('vencimento', inicio)
    .lte('vencimento', fim)
    .order('vencimento');

  if (error) {
    console.error('Erro detalhado:', error);
    throw error;
  }

  return data || [];
}

/**
 * Calcula resumo financeiro de uma lista de cobranças.
 *
 * @param {Array} cobrancas
 * @returns {{ totalPago: number, totalPendente: number, qtdPago: number, qtdPendente: number }}
 */
function calcularResumo(cobrancas) {
  const pagos     = cobrancas.filter(c => c.status === 'pago');
  const pendentes = cobrancas.filter(c => c.status === 'pendente');

  return {
    totalPago:     pagos.reduce((s, c) => s + Number(c.valor), 0),
    totalPendente: pendentes.reduce((s, c) => s + Number(c.valor), 0),
    qtdPago:       pagos.length,
    qtdPendente:   pendentes.length
  };
}

/**
 * Marca uma cobrança como paga.
 *
 * @param {string} cobrancaId
 */
async function marcarComoPago(cobrancaId) {
  const { error } = await window._sb
    .from('cobrancas')
    .update({ status: 'pago' })
    .eq('id', cobrancaId);

  if (error) {
    console.error('Erro detalhado:', error);
    throw error;
  }
}
