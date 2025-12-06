// Import Supabase client dari modul supabase.js
import { supabase } from './supabase.js';
// Import fungsi utility untuk manajemen session
import {
    saveSession,
    getSession,
    clearSession,
    isLoggedIn,
    refreshSession,
    handleRedirectAfterLogin,
    checkPageAuth
} from './auth-utils.js';

// Fungsi untuk validasi email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Fungsi untuk validasi password
function isValidPassword(password) {
    return password.length >= 6;
}

// Fungsi untuk menampilkan pesan error pada form
function showFormError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';

        // Sembunyikan pesan error setelah 5 detik
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Fungsi untuk login
async function handleLoginForm(e) {
    if (e) e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Validasi input
    if (!isValidEmail(email)) {
        showFormError('error-message', 'Format email tidak valid');
        return;
    }

    if (!isValidPassword(password)) {
        showFormError('error-message', 'Password minimal 6 karakter');
        return;
    }

    try {
        // Login dengan Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Simpan session ke localStorage
        if (data && data.session) {
            saveSession(data.session, data.user);
        }

        // Tampilkan notifikasi sukses
        showNotification('Login berhasil', 'success');
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('login-success', { detail: { user: data.user } }));
        }

        // Redirect ke halaman yang sesuai setelah login berhasil
        setTimeout(() => {
            handleRedirectAfterLogin();
        }, 1500);
    } catch (error) {
        showFormError('error-message', error.message || 'Gagal login. Periksa email dan password Anda.');
    }
}

// Fungsi untuk registrasi
async function handleRegisterForm(e) {
    if (e) e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validasi input
    if (!name) {
        showFormError('error-message', 'Nama tidak boleh kosong');
        return;
    }

    if (!isValidEmail(email)) {
        showFormError('error-message', 'Format email tidak valid');
        return;
    }

    if (!isValidPassword(password)) {
        showFormError('error-message', 'Password minimal 6 karakter');
        return;
    }

    if (password !== confirmPassword) {
        showFormError('error-message', 'Konfirmasi password tidak cocok');
        return;
    }

    try {
        // Registrasi dengan Supabase
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) throw error;

        // Tambahkan data user ke tabel profiles jika diperlukan
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: data.user.id,
                        full_name: name,
                        email: email
                    }
                ]);

            if (profileError) console.error('Error menyimpan profil:', profileError);
        }

        // Tampilkan notifikasi sukses
        showNotification('Registrasi berhasil! Silakan cek email Anda untuk verifikasi.', 'success');

        // Redirect ke halaman login setelah registrasi berhasil
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } catch (error) {
        showFormError('error-message', error.message || 'Gagal registrasi. Silakan coba lagi.');
    }
}

// Inisialisasi event listeners untuk halaman login dan registrasi
document.addEventListener('DOMContentLoaded', () => {
    // Cek apakah halaman saat ini adalah halaman login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginForm);
    }

    // Cek apakah halaman saat ini adalah halaman registrasi
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterForm);
    }

    // Cek status autentikasi
    checkAuthStatus().then(user => {
        if (user && (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html'))) {
            window.location.href = 'index.html';
        }
    });
});

// Fungsi untuk memeriksa status autentikasi saat halaman dimuat
async function checkAuthStatus() {
    try {
        // Cek session pengguna
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('Error checking auth status:', error);
            return;
        }

        if (session) {
            // Pengguna sudah login
            const user = session.user;
            showUserProfile(user);
            return user;
        } else {
            // Pengguna belum login
            showLoginButton();
            return null;
        }
    } catch (error) {
        console.error('Error in auth check:', error);
        showLoginButton();
        return null;
    }
}

// Fungsi untuk menampilkan profil pengguna
function showUserProfile(user) {
    // Desktop
    document.getElementById('auth-buttons').classList.add('hidden');
    document.getElementById('user-profile').classList.remove('hidden');
    const avatarImg = document.getElementById('avatar-img');
    const dropdownAvatar = document.getElementById('dropdown-avatar');
    const dropdownName = document.getElementById('dropdown-name');
    const dropdownEmail = document.getElementById('dropdown-email');
    const avatarUrl = user.user_metadata?.avatar_url || user.avatar_url || '';
    const displayName = user.user_metadata?.display_name || user.email;
    if (avatarImg) avatarImg.src = avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
    if (dropdownAvatar) dropdownAvatar.src = avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
    if (dropdownName) dropdownName.textContent = displayName;
    if (dropdownEmail) dropdownEmail.textContent = user.email;

    document.getElementById('mobile-auth-buttons').classList.add('hidden');
    document.getElementById('mobile-user-profile').classList.remove('hidden');
    const mobileEmail = document.getElementById('mobile-user-email');
    const mobileName = document.getElementById('mobile-user-name');
    const mobileAvatar = document.getElementById('mobile-user-avatar');
    const avatarUrlMobile = user.user_metadata?.avatar_url || user.avatar_url || '';
    const displayNameMobile = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email;
    if (mobileEmail) mobileEmail.textContent = user.email;
    if (mobileName) mobileName.textContent = displayNameMobile;
    if (mobileAvatar) mobileAvatar.src = avatarUrlMobile || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayNameMobile)}`;

    // Tambahkan event listener untuk tombol logout
    const logoutBtn = document.getElementById('logout-button');
    const logoutMenuItem = document.getElementById('logout-menu-item');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (logoutMenuItem) logoutMenuItem.addEventListener('click', handleLogout);
    const mobileLogout = document.getElementById('mobile-logout-button');
    if (mobileLogout) mobileLogout.addEventListener('click', handleLogout);
}

// Fungsi untuk menampilkan tombol login
function showLoginButton() {
    // Desktop
    document.getElementById('auth-buttons').classList.remove('hidden');
    document.getElementById('user-profile').classList.add('hidden');

    // Mobile
    document.getElementById('mobile-auth-buttons').classList.remove('hidden');
    document.getElementById('mobile-user-profile').classList.add('hidden');
}

// Fungsi untuk menangani logout
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during logout:', error);
            return;
        }

        // Tampilkan notifikasi logout berhasil
        showNotification('Logout berhasil', 'success');

        // Redirect ke halaman utama setelah logout
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        console.error('Error in logout:', error);
        showNotification('Gagal logout', 'error');
    }
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'info') {
    // Cek apakah elemen notifikasi sudah ada
    let notification = document.getElementById('auth-notification');

    // Jika belum ada, buat elemen notifikasi
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'auth-notification';
        notification.className = 'fixed top-24 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
        document.body.appendChild(notification);
    }

    // Set warna berdasarkan tipe notifikasi
    if (type === 'success') {
        notification.className = notification.className.replace(/bg-\w+-\d+/g, '');
        notification.classList.add('bg-green-500', 'text-white');
    } else if (type === 'error') {
        notification.className = notification.className.replace(/bg-\w+-\d+/g, '');
        notification.classList.add('bg-red-500', 'text-white');
    } else {
        notification.className = notification.className.replace(/bg-\w+-\d+/g, '');
        notification.classList.add('bg-blue-500', 'text-white');
    }

    // Set pesan
    notification.textContent = message;

    // Tampilkan notifikasi
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);

    // Sembunyikan notifikasi setelah 3 detik
    setTimeout(() => {
        notification.classList.add('translate-x-full');
    }, 3000);
}

// Inisialisasi auth saat dokumen dimuat
document.addEventListener('DOMContentLoaded', function () {
    checkAuthStatus();

    // Inisialisasi ikon Feather
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Muat konten keranjang belanja
    loadCart();
});

// Fungsi untuk memuat konten keranjang belanja
async function loadCart() {
    try {
        const response = await fetch('cart.html');
        const cartHtml = await response.text();
        const cartContainer = document.getElementById('cart-container');
        if (cartContainer) {
            cartContainer.innerHTML = cartHtml;
        }
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}
