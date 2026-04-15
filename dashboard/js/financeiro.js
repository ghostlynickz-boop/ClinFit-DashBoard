/**
 * financeiro.js — Utilitários financeiros
 * Lógica principal está inline em financeiro.html.
 */

import supabase from './supabase.js';

/**
 * Busca cobranças de um mês específico
 * @param {string} userId
 * @param {number} ano
 * @param {number} mes  - 1 a 12
 */
export async function getCobrancasMes(userId, ano, mes) {
  const mm     = String(mes).padStart(2, '0');
  const inicio = `${ano}-${mm}-01`;
  const fim    = `${ano}-${mm}-31`;

  const { data, error } = await supabase
    .from('cobrancas')
    .select('*, clientes(nome)')
    .eq('usuario_id', userId)
    .gte('vencimento', inicio)
    .lte('vencimento', fim)
    .order('vencimento');

  if (error) throw error;
  return data || [];
}

/**
 * Calcula resumo financeiro de uma lista de cobranças
 * @param {Array} cobrancas
 * @returns {{ totalPago: number, totalPendente: number, qtdPago: number, qtdPendente: number }}
 */
export function calcularResumo(cobrancas) {
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
 * Marca uma cobrança como paga
 * @param {string} cobrancaId
 */
export async function marcarComoPago(cobrancaId) {
  const { error } = await supabase
    .from('cobrancas')
    .update({ status: 'pago' })
    .eq('id', cobrancaId);

  if (error) throw error;
}
