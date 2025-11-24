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
                        <a href="community.html" class="nav-link text-dark font-medium hover:text-secondary px-3 py-2">Community</a>
                        <a href="about.html" class="nav-link text-dark font-medium hover:text-secondary px-3 py-2">About Us</a>
                        <button id="navbar-search-btn" class="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-dark" title="Search">
                            <i data-feather="search"></i>
                        </button>
                        <div id="auth-buttons">
                            <a href="login.html" id="login-button" class="bg-secondary hover:bg-purple-600 text-white font-bold px-6 py-2 rounded-full transition duration-300">
                                Login
                            </a>
                        </div>
                        <div id="user-profile" class="hidden relative">
                            <button id="avatar-button" class="w-10 h-10 rounded-full overflow-hidden ring-2 ring-secondary/30 focus:outline-none">
                                <img id="avatar-img" src="https://via.placeholder.com/80" alt="Avatar" class="w-full h-full object-cover">
                            </button>
                            <div id="profile-dropdown" class="hidden absolute right-0 mt-3 w-[90vw] max-w-xs sm:w-64 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-y-auto max-h-[60vh]">
                                <div class="px-4 py-3 border-b">
                                    <div class="flex items-center gap-3">
                                        <img id="dropdown-avatar" src="https://via.placeholder.com/80" class="w-10 h-10 rounded-full object-cover" alt="Avatar">
                                        <div>
                                            <div id="dropdown-name" class="font-semibold text-gray-900">User</div>
                                            <div id="dropdown-email" class="text-xs text-gray-500">user@example.com</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="py-2">
                                    <a href="profile.html" class="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary">
                                        <i data-feather="user" class="w-4 h-4"></i>
                                        <span>Profile</span>
                                    </a>
                                    <a href="profiles.html" class="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary">
                                        <i data-feather="tool" class="w-4 h-4"></i>
                                        <span>Become a Creator</span>
                                    </a>
                                    <a href="recent-activity.html" class="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary">
                                        <i data-feather="file-text" class="w-4 h-4"></i>
                                        <span>Order History</span>
                                    </a>
                                    <a href="#" class="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary">
                                        <i data-feather="settings" class="w-4 h-4"></i>
                                        <span>Settings</span>
                                    </a>
                                </div>
                                <div class="py-2 border-t">
                                    <button id="logout-menu-item" class="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-red-600">
                                        <i data-feather="log-out" class="w-4 h-4"></i>
                                        <span>Logout</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="md:hidden">
                    <button id="menu-toggle" class="text-dark focus:outline-none transition-transform duration-300" aria-expanded="false" aria-controls="mobile-menu">
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
        <div id="mobile-menu" class="md:hidden bg-white pb-4 px-4 shadow-lg transition-all duration-300 transform origin-top max-h-0 opacity-0 scale-y-95 pointer-events-none overflow-hidden">
            <div class="flex flex-col space-y-3">
                <a href="index.html" class="text-dark font-medium hover:text-secondary px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary">Home</a>
                <a href="marketplace.html" class="text-dark font-medium hover:text-secondary px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary">Marketplace</a>
                <a href="community.html" class="text-dark font-medium hover:text-secondary px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary">Community</a>
                <a href="about.html" class="text-dark font-medium hover:text-secondary px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary">About Us</a>
                
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
        const toggleMobileMenu = (open) => {
            if (open) {
                mobileMenu.classList.remove('max-h-0','opacity-0','scale-y-95','pointer-events-none');
                mobileMenu.classList.add('max-h-screen','opacity-100','scale-y-100');
                menuToggle.setAttribute('aria-expanded','true');
            } else {
                mobileMenu.classList.add('max-h-0','opacity-0','scale-y-95','pointer-events-none');
                mobileMenu.classList.remove('max-h-screen','opacity-100','scale-y-100');
                menuToggle.setAttribute('aria-expanded','false');
            }
        };
        let isOpen = false;
        menuToggle.addEventListener('click', function() {
            isOpen = !isOpen;
            toggleMobileMenu(isOpen);
        });

        // Auto-close on link click
        mobileMenu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                isOpen = false;
                toggleMobileMenu(false);
            });
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (isOpen) {
                const within = mobileMenu.contains(e.target) || menuToggle.contains(e.target);
                if (!within) {
                    isOpen = false;
                    toggleMobileMenu(false);
                }
            }
        });
    }

    // Event listener untuk tombol keranjang
    const cartButtonDesktop = document.getElementById('cart-button-desktop');
    const cartButtonMobile = null;

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

    

    // Avatar dropdown toggle
    const avatarButton = document.getElementById('avatar-button');
    const dropdown = document.getElementById('profile-dropdown');
    if (avatarButton && dropdown) {
        avatarButton.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
        dropdown.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('click', () => {
                dropdown.classList.add('hidden');
            });
        });
        document.addEventListener('click', (e) => {
            if (!dropdown.classList.contains('hidden')) {
                const within = dropdown.contains(e.target) || avatarButton.contains(e.target);
                if (!within) dropdown.classList.add('hidden');
            }
        });
    }

    // Render feather icons within navbar
    if (typeof feather !== 'undefined') {
        try { feather.replace(); } catch(_) {}
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
