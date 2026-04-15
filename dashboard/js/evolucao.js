/**
 * evolucao.js — Utilitários de evolução dos pacientes
 * Lógica principal está inline em evolucao.html.
 */

import supabase from './supabase.js';

/**
 * Busca todos os registros de evolução de um cliente
 * @param {string} userId
 * @param {string} clienteId
 */
export async function getEvolucaoCliente(userId, clienteId) {
  const { data, error } = await supabase
    .from('evolucao')
    .select('*')
    .eq('usuario_id', userId)
    .eq('cliente_id', clienteId)
    .order('data');

  if (error) throw error;
  return data || [];
}

/**
 * Calcula a variação entre o primeiro e o último registro
 * @param {Array} registros - ordenados por data crescente
 * @returns {{ pesoDiff: number|null, gorduraDiff: number|null }}
 */
export function calcularVariacao(registros) {
  if (registros.length < 2) return { pesoDiff: null, gorduraDiff: null };

  const primeiro = registros[0];
  const ultimo   = registros[registros.length - 1];

  return {
    pesoDiff:    ultimo.peso    != null && primeiro.peso    != null ? +(ultimo.peso    - primeiro.peso).toFixed(1)    : null,
    gorduraDiff: ultimo.gordura != null && primeiro.gordura != null ? +(ultimo.gordura - primeiro.gordura).toFixed(1) : null
  };
}

/**
 * Prepara os dados para o gráfico de linha (Chart.js)
 * @param {Array} registros
 * @param {'peso'|'gordura'|'cintura'|'quadril'} campo
 */
export function prepararDadosGrafico(registros, campo = 'peso') {
  const comDado = registros.filter(r => r[campo] != null);
  return {
    labels: comDado.map(r => {
      const [y, m, d] = r.data.split('-');
      return `${d}/${m}`;
    }),
    dados: comDado.map(r => r[campo])
  };
}
