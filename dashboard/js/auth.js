/**
 * auth.js — Controle de autenticação e sessão ClinFit
 * Gerencia login, logout, verificação de sessão e dados do usuário
 */

import supabase from './supabase.js';

// ── Utilitários de UI ──────────────────────────────────────────────────────

/**
 * Exibe uma notificação toast na tela
 * @param {string} message - Mensagem a exibir
 * @param {'success'|'error'|'info'} type - Tipo da notificação
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>`,
    error:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    info:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };

  const colors = { success: '#16a34a', error: '#dc2626', info: '#3b82f6' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.color = colors[type] || '#f9fafb';
  toast.innerHTML = `${icons[type] || ''}<span style="color:#f9fafb">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Define o estado de loading em um botão
 */
export function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Aguarde...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
  }
}

// ── Sessão ─────────────────────────────────────────────────────────────────

/**
 * Retorna o usuário atualmente logado ou null
 */
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Busca o perfil do usuário na tabela `usuarios`
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('Perfil não encontrado, usando dados do auth:', error.message);
    return null;
  }
  return data;
}

/**
 * Verifica autenticação e redireciona se necessário.
 * Deve ser chamado no topo de cada página protegida.
 * @returns {Promise<{user, profile}>}
 */
export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }

  const profile = await getUserProfile(user.id);
  return { user, profile };
}

/**
 * Preenche os elementos da sidebar com os dados do usuário logado
 */
export function populateSidebar(user, profile) {
  const nome = profile?.nome || user?.email?.split('@')[0] || 'Usuário';
  const email = user?.email || '';
  const inicial = nome.charAt(0).toUpperCase();

  const elNome     = document.getElementById('sidebar-username');
  const elEmail    = document.getElementById('sidebar-email');
  const elAvatar   = document.getElementById('sidebar-avatar');
  const elGreeting = document.getElementById('greeting-name');

  if (elNome)     elNome.textContent   = nome;
  if (elEmail)    elEmail.textContent  = email;
  if (elAvatar)   elAvatar.textContent = inicial;
  if (elGreeting) elGreeting.textContent = nome.split(' ')[0];
}

// ── Login ──────────────────────────────────────────────────────────────────

/**
 * Realiza o login com email e senha
 */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Cria o perfil na tabela usuarios caso não exista (primeiro acesso)
  if (data.user) {
    await upsertUserProfile(data.user);
  }

  return data;
}

/**
 * Cria ou atualiza o perfil do usuário na tabela `usuarios`
 */
async function upsertUserProfile(user) {
  const nome = user.user_metadata?.nome
    || user.email.split('@')[0];

  await supabase.from('usuarios').upsert({
    id:    user.id,
    email: user.email,
    nome:  nome
  }, { onConflict: 'id', ignoreDuplicates: true });
}

// ── Logout ─────────────────────────────────────────────────────────────────

/**
 * Encerra a sessão e redireciona para o login
 */
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// ── Inicialização de página protegida ─────────────────────────────────────

/**
 * Inicializa uma página do dashboard:
 * - Verifica autenticação
 * - Popula sidebar
 * - Configura botão de sair
 * @param {string} activeNav - ID do item ativo na navegação
 * @returns {Promise<{user, profile}>}
 */
export async function initPage(activeNav) {
  const auth = await requireAuth();
  if (!auth) return null;

  const { user, profile } = auth;
  populateSidebar(user, profile);

  // Marca item ativo na sidebar
  if (activeNav) {
    const item = document.getElementById(activeNav);
    if (item) item.classList.add('active');
  }

  // Botão de logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  // Data atual no header
  const elDate = document.getElementById('current-date');
  if (elDate) {
    elDate.textContent = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Menu mobile
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sidebar   = document.querySelector('.sidebar');
  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  return auth;
}

// ── Formatadores ──────────────────────────────────────────────────────────

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function formatPhone(phone) {
  if (!phone) return '—';
  const n = phone.replace(/\D/g, '');
  if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
  return phone;
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
