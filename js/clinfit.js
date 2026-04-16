/**
 * clinfit.js — Script global compartilhado
 *
 * Carregado em TODAS as páginas, logo após o CDN do Supabase.
 * Define window._sb (cliente Supabase) e window.CF (utilitários).
 *
 * NÃO usa ES modules — funciona em qualquer servidor estático.
 */

(function () {
  'use strict';

  /* ── Credenciais ─────────────────────────────────────────────────────── */
  var SUPABASE_URL     = 'https://plzxurlcvtjoihqmkrjs.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenh1cmxjdnRqb2locW1rcmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjUxMTEsImV4cCI6MjA5MTg0MTExMX0.lRmxHEMwa4k9o0V15Wmnl49othmFntHcK0XZF-SvslM';

  /* ── Inicializa cliente Supabase ─────────────────────────────────────── */
  var _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession:    true,
      autoRefreshToken:  true,
      detectSessionInUrl: true
    }
  });

  /* Disponibiliza globalmente para os scripts inline */
  window._sb = _sb;

  /* ── Utilitários ─────────────────────────────────────────────────────── */
  window.CF = {

    /* Exibe notificação toast */
    toast: function (message, type) {
      type = type || 'info';
      var container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      var icons = {
        success: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
        error:   '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        info:    '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      };

      var colors = { success: '#16a34a', error: '#dc2626', info: '#3b82f6' };

      var el = document.createElement('div');
      el.className = 'toast ' + type;
      el.innerHTML = (icons[type] || '') +
        '<span style="color:#f9fafb;flex:1">' + message + '</span>';
      el.style.color = colors[type] || '#f9fafb';
      container.appendChild(el);

      setTimeout(function () {
        el.classList.add('removing');
        setTimeout(function () { el.remove(); }, 300);
      }, 3500);
    },

    /* Define estado de loading num botão */
    loading: function (btn, state) {
      if (!btn) return;
      if (state) {
        btn.disabled = true;
        btn.dataset.orig = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Aguarde...';
      } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.orig || btn.innerHTML;
      }
    },

    /* Formata valor monetário */
    currency: function (val) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency', currency: 'BRL'
      }).format(val || 0);
    },

    /* Formata data YYYY-MM-DD → DD/MM/YYYY */
    date: function (str) {
      if (!str) return '—';
      var p = str.split('-');
      return p[2] + '/' + p[1] + '/' + p[0];
    },

    /* Formata telefone */
    phone: function (phone) {
      if (!phone) return '—';
      var n = phone.replace(/\D/g, '');
      if (n.length === 11) return '(' + n.slice(0,2) + ') ' + n.slice(2,7) + '-' + n.slice(7);
      if (n.length === 10) return '(' + n.slice(0,2) + ') ' + n.slice(2,6) + '-' + n.slice(6);
      return phone;
    },

    /* Iniciais do nome */
    initials: function (name) {
      if (!name) return '?';
      return name.trim().split(' ').slice(0, 2).map(function (n) {
        return n[0];
      }).join('').toUpperCase();
    },

    /* Saudação conforme horário */
    greeting: function () {
      var h = new Date().getHours();
      if (h < 12) return 'Bom dia';
      if (h < 18) return 'Boa tarde';
      return 'Boa noite';
    },

    /* Data atual formatada por extenso */
    dateNow: function () {
      return new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    },

    /* Retorna usuário autenticado ou null */
    getUser: async function () {
      var res = await _sb.auth.getUser();
      return (res.data && res.data.user) ? res.data.user : null;
    },

    /* Busca perfil na tabela usuarios */
    getProfile: async function (userId) {
      var res = await _sb.from('usuarios').select('*').eq('id', userId).single();
      return res.data || null;
    },

    /* Verifica auth — redireciona para login se não autenticado */
    requireAuth: async function () {
      var user = await this.getUser();
      if (!user) {
        window.location.href = 'index.html';
        return null;
      }
      var profile = await this.getProfile(user.id);
      return { user: user, profile: profile };
    },

    /* Preenche sidebar com dados do usuário */
    sidebar: function (user, profile) {
      var nome      = (profile && profile.nome) || (user && user.email.split('@')[0]) || 'Usuário';
      var email     = (user && user.email) || '';
      var avatarUrl = profile && profile.avatar_url;

      var elNome   = document.getElementById('sidebar-username');
      var elEmail  = document.getElementById('sidebar-email');
      var elAvatar = document.getElementById('sidebar-avatar');
      var elGreet  = document.getElementById('greeting-name');

      if (elNome)  elNome.textContent  = nome;
      if (elEmail) elEmail.textContent = email;
      if (elGreet) elGreet.textContent = nome.split(' ')[0];

      if (elAvatar) {
        if (avatarUrl) {
          /* Exibe a foto de perfil salva */
          elAvatar.textContent = '';
          elAvatar.style.backgroundImage  = 'url(' + avatarUrl + ')';
          elAvatar.style.backgroundSize   = 'cover';
          elAvatar.style.backgroundRepeat = 'no-repeat';
          elAvatar.style.backgroundPosition = 'center';
        } else {
          /* Sem foto: mostra inicial do nome */
          elAvatar.textContent = nome.charAt(0).toUpperCase();
          elAvatar.style.backgroundImage = '';
        }
      }
    },

    /* Faz login com email/senha */
    login: async function (email, password) {
      var res = await _sb.auth.signInWithPassword({ email: email, password: password });
      if (res.error) throw res.error;

      /* Upsert do perfil (garante que a linha existe na tabela usuarios) */
      if (res.data && res.data.user) {
        var u = res.data.user;
        await _sb.from('usuarios').upsert({
          id:    u.id,
          email: u.email,
          nome:  (u.user_metadata && u.user_metadata.nome) || u.email.split('@')[0]
        }, { onConflict: 'id', ignoreDuplicates: true });
      }
      return res.data;
    },

    /* Encerra sessão */
    logout: async function () {
      await _sb.auth.signOut();
      window.location.href = 'index.html';
    },

    /**
     * Inicializa página protegida:
     *   - verifica auth (redireciona se não logado)
     *   - preenche sidebar
     *   - ativa item de navegação
     *   - configura botão sair, data e menu mobile
     */
    initPage: async function (activeNav) {
      var auth = await this.requireAuth();
      if (!auth) return null;

      this.sidebar(auth.user, auth.profile);

      /* Item ativo */
      if (activeNav) {
        var item = document.getElementById(activeNav);
        if (item) item.classList.add('active');
      }

      /* Botão sair */
      var btnLogout = document.getElementById('btn-logout');
      if (btnLogout) {
        btnLogout.addEventListener('click', CF.logout.bind(CF));
      }

      /* Data atual no cabeçalho */
      var elDate = document.getElementById('current-date');
      if (elDate) elDate.textContent = this.dateNow();

      /* Menu mobile */
      var mobileBtn = document.getElementById('mobile-menu-btn');
      var sidebar   = document.querySelector('.sidebar');
      if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', function () {
          sidebar.classList.toggle('open');
        });
        document.addEventListener('click', function (e) {
          if (!sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
            sidebar.classList.remove('open');
          }
        });
      }

      return auth;
    }
  };

})();
