/**
 * agenda.js — Utilitários de agenda
 * Lógica principal está inline em agenda.html.
 */

import supabase from './supabase.js';

/**
 * Busca sessões de um usuário num intervalo de datas
 * @param {string} userId
 * @param {string} dataInicio - formato YYYY-MM-DD
 * @param {string} dataFim    - formato YYYY-MM-DD
 */
export async function getSessoesPeriodo(userId, dataInicio, dataFim) {
  const { data, error } = await supabase
    .from('sessoes')
    .select('*, clientes(nome)')
    .eq('usuario_id', userId)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data')
    .order('horario');

  if (error) throw error;
  return data || [];
}

/**
 * Busca sessões de hoje
 * @param {string} userId
 */
export async function getSessoesHoje(userId) {
  const hoje = new Date().toISOString().split('T')[0];
  return getSessoesPeriodo(userId, hoje, hoje);
}

/**
 * Atualiza o status de uma sessão
 * @param {string} sessaoId
 * @param {'confirmada'|'realizada'|'cancelada'} status
 */
export async function atualizarStatusSessao(sessaoId, status) {
  const { error } = await supabase
    .from('sessoes')
    .update({ status })
    .eq('id', sessaoId);

  if (error) throw error;
}

/**
 * Retorna a data de início da semana (segunda-feira) com offset em semanas
 * @param {number} offset - semanas a avançar (negativo = voltar)
 * @returns {Date}
 */
export function getInicioSemana(offset = 0) {
  const hoje = new Date();
  const dia  = hoje.getDay(); // 0=dom, 1=seg...
  const lun  = new Date(hoje);
  lun.setDate(hoje.getDate() - (dia === 0 ? 6 : dia - 1) + offset * 7);
  lun.setHours(0, 0, 0, 0);
  return lun;
}
