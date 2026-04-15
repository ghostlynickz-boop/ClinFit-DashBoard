/**
 * supabase.js — Configuração do cliente Supabase
 *
 * INSTRUÇÕES:
 * 1. Acesse seu projeto em https://supabase.com/dashboard
 * 2. Vá em Settings > API
 * 3. Copie a "Project URL" e a "anon / public key"
 * 4. Substitua os valores abaixo
 *
 * IMPORTANTE: nunca exponha a service_role key neste arquivo.
 * A anon key é segura para uso no frontend pois o RLS protege os dados.
 */

const SUPABASE_URL = 'https://plzxurlcvtjoihqmkrjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenh1cmxjdnRqb2locW1rcmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjUxMTEsImV4cCI6MjA5MTg0MTExMX0.lRmxHEMwa4k9o0V15Wmnl49othmFntHcK0XZF-SvslM';

// Inicializa o cliente Supabase usando a CDN (carregada nos HTMLs)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,           // mantém sessão no localStorage
    autoRefreshToken: true,         // renova o token automaticamente
    detectSessionInUrl: true        // necessário para o fluxo OAuth/magic link
  }
});

export default supabase;
