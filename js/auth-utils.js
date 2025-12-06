// Import Supabase client
import { supabase } from './supabase.js';

// Konstanta untuk session storage
const SESSION_KEY = 'catalis_session';
const USER_KEY = 'catalis_user';
const SESSION_LAST_CHECKED = 'catalis_session_last_checked';
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 menit dalam milidetik

/**
 * Fungsi untuk menyimpan session login ke localStorage
 * @param {Object} session - Session object dari Supabase
 * @param {Object} user - User object dari Supabase
 */
export function saveSession(session, user) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Catat waktu terakhir session disimpan
    localStorage.setItem(SESSION_LAST_CHECKED, Date.now().toString());
  }
  
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/**
 * Fungsi untuk mendapatkan session dari localStorage
 * @returns {Object|null} Session object atau null jika tidak ada
 */
export function getSession() {
  const sessionStr = localStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;
  
  try {
    return JSON.parse(sessionStr);
  } catch (error) {
    console.error('Error parsing session:', error);
    clearSession(); // Hapus session yang rusak
    return null;
  }
}

/**
 * Fungsi untuk mendapatkan user dari localStorage
 * @returns {Object|null} User object atau null jika tidak ada
 */
export function getUser() {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user:', error);
    return null;
  }
}

/**
 * Fungsi untuk membersihkan session saat logout
 */
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_LAST_CHECKED);
}

/**
 * Fungsi untuk memeriksa apakah user sedang login
 * @returns {boolean} True jika user sedang login
 */
export function isLoggedIn() {
  const session = getSession();
  if (!session) return false;
  
  // Cek apakah session sudah expired
  const expiresAt = new Date(session.expires_at * 1000);
  const now = new Date();
  
  return expiresAt > now;
}

/**
 * Fungsi untuk memeriksa dan memperbarui session dari Supabase
 * @param {boolean} force - Paksa refresh meskipun belum waktunya
 * @returns {Promise<Object|null>} User object jika berhasil login
 */
export async function refreshSession(force = false) {
  // Cek apakah perlu refresh berdasarkan interval waktu
  if (!force) {
    const lastChecked = localStorage.getItem(SESSION_LAST_CHECKED);
    if (lastChecked && Date.now() - parseInt(lastChecked) < SESSION_CHECK_INTERVAL) {
      // Belum waktunya refresh, gunakan session yang ada
      if (isLoggedIn()) {
        return getUser();
      }
    }
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error refreshing session:', error);
      handleSessionError(error);
      return null;
    }
    
    if (data && data.session) {
      // Simpan session baru
      saveSession(data.session, data.session.user);
      return data.session.user;
    } else {
      // Tidak ada session aktif di Supabase
      clearSession();
      return null;
    }
  } catch (error) {
    console.error('Error in refreshSession:', error);
    clearSession();
    return null;
  }
}

/**
 * Fungsi untuk menangani session expired
 * @param {string} redirectUrl - URL untuk redirect setelah login
 */
export function handleSessionExpired(redirectUrl = window.location.href) {
  // Simpan URL saat ini untuk redirect kembali setelah login
  sessionStorage.setItem('redirect_after_login', redirectUrl);
  
  // Tampilkan pesan
  alert('Sesi Anda telah berakhir. Silakan login kembali.');
  
  // Redirect ke halaman login
  window.location.href = 'login.html';
}

/**
 * Fungsi untuk menangani redirect setelah login
 */
export function handleRedirectAfterLogin() {
  const redirectUrl = sessionStorage.getItem('redirect_after_login');
  if (redirectUrl) {
    sessionStorage.removeItem('redirect_after_login');
    window.location.href = redirectUrl;
  } else {
    window.location.href = 'index.html';
  }
}

/**
 * Fungsi untuk memeriksa apakah halaman memerlukan autentikasi
 * @param {boolean} requireAuth - Apakah halaman memerlukan autentikasi
 * @returns {Promise<boolean>} True jika autentikasi valid
 */
export async function checkPageAuth(requireAuth = true) {
  // Refresh session terlebih dahulu
  const user = await refreshSession();
  
  if (requireAuth && !user) {
    // Halaman memerlukan login tapi user belum login
    const currentUrl = window.location.href;
    sessionStorage.setItem('redirect_after_login', currentUrl);
    window.location.href = 'login.html';
    return false;
  } else if (!requireAuth && user) {
    // Halaman tidak memerlukan login (seperti login page) tapi user sudah login
    return false;
  }
  
  return true;
}

// Setup listener untuk perubahan auth state
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  
  if (event === 'SIGNED_IN' && session) {
    // User baru saja login
    saveSession(session, session.user);
  } else if (event === 'SIGNED_OUT') {
    // User baru saja logout
    clearSession();
  } else if (event === 'TOKEN_REFRESHED' && session) {
    // Token diperbarui
    saveSession(session, session.user);
  } else if (event === 'USER_UPDATED' && session) {
    // Data user diperbarui
    saveSession(session, session.user);
  }
});