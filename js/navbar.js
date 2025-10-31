// Fungsi untuk menyisipkan navbar ke dalam halaman
function insertNavbar() {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;

    const navbar = `
    <nav class="fixed w-full bg-white/90 backdrop-blur-md z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-20 items-center">
                <div class="flex-shrink-0 flex items-center">
                    <img src="/logo.png" alt="Catalist Creative Logo" class="h-10 w-auto mr-3">
                    <a href="index.html" class="text-2xl font-display font-bold gradient-text">Catalist Creative</a>
                </div>
                <div class="hidden md:block">
                    <div class="ml-10 flex items-center space-x-8">
                        <a href="index.html" class="nav-link text-dark font-medium hover:text-secondary px-3 py-2">Home</a>
                        <a href="marketplace.html" class="nav-link text-dark font-medium hover:text-secondary px-3 py-2">Marketplace</a>
                        <a href="profiles.html" class="nav-link text-dark font-medium hover:text-secondary px-3 py-2">Profiles</a>
                        <a href="about.html" class="nav-link text-dark font-medium hover:text-secondary px-3 py-2">About Us</a>
                        <!-- Auth buttons -->
                        <div id="auth-buttons">
                            <a href="login.html" id="login-button" class="bg-secondary hover:bg-purple-600 text-white font-bold px-6 py-2 rounded-full transition duration-300">
                                Login
                            </a>
                        </div>
                        <div id="user-profile" class="hidden">
                            <div class="flex items-center space-x-3">
                                <a href="profile.html" class="flex items-center text-dark font-medium hover:text-secondary">
                                    <i data-feather="user" class="h-4 w-4 mr-1"></i>
                                    <span id="user-email" class="text-dark font-medium"></span>
                                </a>
                                <button id="logout-button" class="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-1 rounded-full transition duration-300 text-sm">
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="md:hidden">
                    <button id="menu-toggle" class="text-dark focus:outline-none">
                        <i data-feather="menu"></i>
                    </button>
                </div>
                <div class="hidden md:block">
                    <button id="cart-button-desktop" class="relative p-2 text-dark hover:text-secondary transition duration-300 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center ml-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-shopping-cart"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        <span id="cart-count-desktop" class="absolute -top-2 -right-2 bg-secondary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">0</span>
                    </button>
                </div>
            </div>
        </div>
        <!-- Mobile menu -->
        <div id="mobile-menu" class="hidden md:hidden bg-white pb-4 px-4 shadow-lg">
            <div class="flex flex-col space-y-3">
                <a href="index.html" class="text-dark font-medium hover:text-secondary px-3 py-2">Home</a>
                <a href="marketplace.html" class="text-dark font-medium hover:text-secondary px-3 py-2">Marketplace</a>
                <a href="profiles.html" class="text-dark font-medium hover:text-secondary px-3 py-2">Profiles</a>
                <a href="about.html" class="text-dark font-medium hover:text-secondary px-3 py-2">About Us</a>
                <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                    <span class="text-dark font-medium">Keranjang Belanja</span>
                    <button id="cart-button-mobile" class="relative p-2 text-dark hover:text-secondary transition duration-300 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-shopping-cart"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        <span id="cart-count-mobile" class="absolute -top-2 -right-2 bg-secondary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">0</span>
                    </button>
                </div>
                <!-- Mobile auth buttons -->
                <div id="mobile-auth-buttons">
                    <a href="login.html" id="mobile-login-button" class="block bg-secondary hover:bg-purple-600 text-white font-bold px-6 py-2 rounded-full transition duration-300 text-center">
                        Login
                    </a>
                </div>
                <div id="mobile-user-profile" class="hidden">
                    <div class="flex flex-col space-y-2">
                        <a href="profile.html" class="flex items-center text-dark font-medium hover:text-secondary">
                            <i data-feather="user" class="h-4 w-4 mr-1"></i>
                            <span id="mobile-user-email" class="text-dark font-medium"></span>
                        </a>
                        <button id="mobile-logout-button" class="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-full transition duration-300 text-sm">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </nav>
    `;
    
    navbarContainer.innerHTML = navbar;
    
    // Inisialisasi toggle menu mobile
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Event listener untuk tombol keranjang
    const cartButtonDesktop = document.getElementById('cart-button-desktop');
    const cartButtonMobile = document.getElementById('cart-button-mobile');

    if (cartButtonDesktop) {
        cartButtonDesktop.addEventListener('click', () => {
            // Buka sidebar cart
            if (typeof window.openCart === 'function') {
                window.openCart();
            } else {
                console.error('Function openCart is not defined');
            }
        });
    }

    if (cartButtonMobile) {
        cartButtonMobile.addEventListener('click', () => {
            // Buka sidebar cart
            if (typeof window.openCart === 'function') {
                window.openCart();
            } else {
                console.error('Function openCart is not defined');
            }
        });
    }
}

// Fungsi untuk menandai menu aktif berdasarkan halaman saat ini
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Pilih semua link navigasi
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('text-secondary');
            link.classList.add('font-semibold');
        }
    });
}

// Inisialisasi navbar saat dokumen dimuat
document.addEventListener('DOMContentLoaded', function() {
    insertNavbar();
    setActiveNavLink();
});