/**
 * clientes.js — Funções auxiliares de clientes
 * A lógica principal está inline em clientes.html.
 * Este módulo exporta utilitários reutilizáveis.
 */

import supabase from './supabase.js';

/**
 * Busca todos os clientes ativos do usuário
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getClientesAtivos(userId) {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('usuario_id', userId)
    .eq('status', 'ativo')
    .order('nome');

  if (error) throw error;
  return data || [];
}

/**
 * Busca um cliente pelo ID
 * @param {string} clienteId
 * @returns {Promise<Object>}
 */
export async function getCliente(clienteId) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Popula um elemento <select> com a lista de clientes
 * @param {HTMLSelectElement} selectEl
 * @param {string} userId
 * @param {string} [placeholder]
 */
export async function popularSelectClientes(selectEl, userId, placeholder = 'Selecione um cliente...') {
  try {
    const clientes = await getClientesAtivos(userId);
    selectEl.innerHTML =
      `<option value="">${placeholder}</option>` +
      clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  } catch {
    selectEl.innerHTML = `<option value="">Erro ao carregar clientes</option>`;
  }
}
