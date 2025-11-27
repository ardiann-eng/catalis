// Import Supabase client
import { supabase } from './supabase.js';

// State untuk menyimpan data produk
let products = [];
let filteredProducts = [];
let categories = [];
let currentCategory = 'all';
let searchQuery = '';
let currentSort = 'recent';

// Element references
const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const categoryFilters = document.getElementById('category-filters');
const sortSelect = document.getElementById('sort-select');
const loadingIndicator = document.getElementById('loading-indicator');

let loginAnimInstances = [];
let likes = new Set();
let currentUserId = null;
const likeSaving = new Set();

// Inisialisasi halaman
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        currentUserId = session?.user?.id || null;
        // Tampilkan loading indicator
        showLoading(true);

        // Ambil data produk dari Supabase
        await fetchProducts();
        if (currentUserId) {
            await fetchUserLikes();
            setupRealtimeLikes();
        }

        // Ambil kategori unik dari produk
        extractCategories();

        // Render filter kategori
        renderCategoryFilters();

        // Render produk
        renderProducts(products);

        // Setup event listeners
        setupEventListeners();

        // Sembunyikan loading indicator
        showLoading(false);

        ensureCartReady();
    } catch (error) {
        console.error('Error initializing marketplace:', error);
        showError('Gagal memuat produk. Silakan coba lagi nanti.');
        showLoading(false);
    }
});

// Fungsi untuk mengambil data produk dari Supabase
async function fetchProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
            products = data;
            filteredProducts = [...products];
            console.log('Products loaded:', products.length);
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
}

// Fungsi untuk mengekstrak kategori unik dari produk
function extractCategories() {
    const uniqueCategories = new Set();
    products.forEach(product => {
        if (product.category) {
            uniqueCategories.add(product.category);
        }
    });
    categories = Array.from(uniqueCategories);
}

// Fungsi untuk merender filter kategori
function renderCategoryFilters() {
    if (!categoryFilters) return;

    // Tambahkan filter "Semua"
    let filtersHTML = `
        <button class="filter-btn active px-4 sm:px-5 py-2.5 rounded-full border border-gray-300 bg-white shadow-sm text-sm sm:text-base font-medium transition-all" 
                data-category="all">
            Semua
        </button>
    `;

    // Tambahkan filter untuk setiap kategori
    categories.forEach(category => {
        filtersHTML += `
            <button class="filter-btn px-4 sm:px-5 py-2.5 rounded-full border border-gray-300 bg-white shadow-sm text-sm sm:text-base font-medium transition-all" 
                    data-category="${category}">
                ${category}
            </button>
        `;
    });

    categoryFilters.innerHTML = filtersHTML;
}

// Fungsi untuk merender produk
function renderProducts(productsToRender) {
    if (!productGrid) return;

    if (productsToRender.length === 0) {
        productGrid.innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-gray-500 text-lg">Tidak ada produk yang ditemukan</p>
            </div>
        `;
        return;
    }

    let productsHTML = '';

    productsToRender.forEach(product => {
        const fav = isFavorite(product.id);
        productsHTML += `
            <div class="nft-card bg-white overflow-hidden transition-all duration-300 flex flex-col h-full" 
                 data-product-id="${product.id}">
                <!-- Portrait Image Container -->
                <div class="relative aspect-square">
                    <img src="${product.image_url || 'https://via.placeholder.com/600x800?text=No+Image'}" 
                         alt="${product.name}" 
                         class="absolute inset-0 w-full h-full">
                    
                    <!-- Category Badge - Inside Image (Top Left) -->
                    <div class="absolute top-2 left-2 z-10">
                        <span class="category-badge inline-block px-2.5 py-1 rounded-full text-xs">
                            ${product.category || 'Uncategorized'}
                        </span>
                    </div>
                    
                    <!-- Favorite Button (Top Right) -->
                    <button class="favorite-btn absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm hover:scale-105 transition z-10" data-product-id="${product.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-heart ${fav ? 'text-red-500' : 'text-gray-400'}"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>
                    </button>
                </div>
                <!-- Product Info - Left Aligned -->
                <div class="p-3 sm:p-4 flex-1 flex flex-col">
                    <!-- Title - Left Aligned -->
                    <h3 class="product-title mb-3">${product.name}</h3>
                    
                    <!-- Price - Left Aligned, Dark Color -->
                    <div class="mb-3">
                        <span class="text-base md:text-lg lg:text-xl font-bold text-primary whitespace-nowrap">Rp ${formatPrice(product.price || 0)}</span>
                        <div class="text-xs text-gray-500 mt-0.5">Stok: ${product.stock ?? '-'}</div>
                    </div>
                    
                    <!-- Action Button - Catalis Gradient Theme -->
                    <div class="mt-auto">
                        <button class="add-to-cart-btn w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-white font-semibold active:scale-[0.98] transition flex items-center justify-center gap-1.5 sm:gap-2"
                                data-product-id="${product.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            <span class="text-xs sm:text-sm">
                                <span class="hidden sm:inline">Tambah ke Keranjang</span>
                                <span class="sm:hidden">+ Keranjang</span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    productGrid.innerHTML = productsHTML;
    if (typeof feather !== 'undefined') { try { feather.replace(); } catch (_) { } }
    ensureCartReady();
}

// Fungsi untuk setup event listeners
function setupEventListeners() {
    // Event listener untuk filter kategori
    if (categoryFilters) {
        categoryFilters.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                // Update active filter
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');

                // Filter produk berdasarkan kategori
                currentCategory = e.target.dataset.category;
                console.log('🏷️ Category changed to:', currentCategory);
                filterAndSortProducts();
            }
        });
    }

    // Event listener untuk pencarian
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            filterAndSortProducts();
        });
    }

    // Event listener untuk sorting
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            console.log('🔄 Sort changed to:', currentSort);
            filterAndSortProducts();
        });
    }

    // Event listener untuk klik produk (detail produk)
    if (productGrid) {
        productGrid.addEventListener('click', (e) => {
            const productCard = e.target.closest('.nft-card');
            if (productCard) {
                const productId = productCard.dataset.productId;

                // Handle quantity increase button
                if (e.target.closest('.quantity-increase-btn')) {
                    const btn = e.target.closest('.quantity-increase-btn');
                    const input = productCard.querySelector('.quantity-input');
                    const maxStock = btn.dataset.maxStock;
                    let currentValue = parseInt(input.value) || 1;

                    if (maxStock && currentValue >= parseInt(maxStock)) {
                        showNotification(`Maksimal ${maxStock} item!`);
                    } else {
                        input.value = currentValue + 1;
                    }
                    e.stopPropagation();
                    return;
                }

                // Handle quantity decrease button
                if (e.target.closest('.quantity-decrease-btn')) {
                    const input = productCard.querySelector('.quantity-input');
                    let currentValue = parseInt(input.value) || 1;

                    if (currentValue > 1) {
                        input.value = currentValue - 1;
                    }
                    e.stopPropagation();
                    return;
                }

                // Jika yang diklik adalah tombol add to cart
                if (e.target.closest('.add-to-cart-btn')) {
                    addProductToCart(productId, 1);
                    const card = e.target.closest('.nft-card');
                    if (card) animateAddToCart(card);
                    e.stopPropagation();
                } else if (e.target.closest('.buy-now-btn')) {
                    addProductToCart(productId, 1);
                    window.location.href = 'checkout.html';
                    e.stopPropagation();
                } else if (e.target.closest('.favorite-btn')) {
                    toggleFavorite(productId);
                    const icon = e.target.closest('.favorite-btn').querySelector('.feather-heart');
                    if (icon) {
                        icon.classList.toggle('text-red-500');
                        icon.classList.toggle('text-gray-500');
                    }
                    e.stopPropagation();
                } else if (!e.target.closest('.quantity-input') && !e.target.closest('button')) {
                    // Tampilkan detail produk (jika bukan klik input atau button)
                    showProductDetail(productId);
                }
            }
        });
    }
}

// Fungsi untuk filter dan sort produk
function filterAndSortProducts() {
    // 1. Filter berdasarkan kategori dan pencarian
    filteredProducts = products.filter(product => {
        // Filter berdasarkan kategori
        const categoryMatch = currentCategory === 'all' || product.category === currentCategory;

        // Filter berdasarkan pencarian
        const searchMatch = !searchQuery ||
            product.name.toLowerCase().includes(searchQuery) ||
            (product.description && product.description.toLowerCase().includes(searchQuery));

        return categoryMatch && searchMatch;
    });

    // 2. Sort hasil filter
    sortProducts();

    // 3. Render products
    renderProducts(filteredProducts);

    console.log(`📊 Filtered: ${filteredProducts.length}/${products.length} products | Category: ${currentCategory} | Search: "${searchQuery}" | Sort: ${currentSort}`);
}

// Fungsi untuk sort products
function sortProducts() {
    switch (currentSort) {
        case 'price-low':
            // Harga terendah ke tertinggi
            filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;

        case 'price-high':
            // Harga tertinggi ke terendah
            filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;

        case 'name-asc':
            // Nama A ke Z
            filteredProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;

        case 'name-desc':
            // Nama Z ke A
            filteredProducts.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            break;

        case 'recent':
        default:
            // Recently added (newest first)
            filteredProducts.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA; // Descending
            });
            break;
    }
}

// Fungsi untuk menampilkan detail produk
async function showProductDetail(productId) {
    try {
        // Cari produk dari data yang sudah ada
        const product = products.find(p => p.id.toString() === productId.toString());

        if (!product) {
            console.error('Product not found:', productId);
            return;
        }

        // Buat modal untuk detail produk
        const modalHTML = `
            <div id="product-modal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="p-4">
                            <img src="${product.image_url || 'https://via.placeholder.com/600x600?text=No+Image'}" 
                                 alt="${product.name}" 
                                 class="w-full h-auto rounded-xl shadow-lg">
                        </div>
                        <div class="p-6">
                            <div class="mb-2">
                                <span class="bg-primary text-dark px-3 py-1 rounded-full text-sm font-medium">
                                    ${product.category || 'Uncategorized'}
                                </span>
                            </div>
                            <h2 class="text-2xl md:text-3xl font-bold mb-3">${product.name}</h2>
                            <p class="text-gray-600 mb-6">${product.description || 'Tidak ada deskripsi'}</p>
                            
                            <div class="mb-6">
                                <h3 class="text-xl font-semibold mb-2">Detail Produk</h3>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <p class="text-gray-500 text-sm">Stok</p>
                                        <p class="font-medium">${product.stock || 'Tidak tersedia'}</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-500 text-sm">Kondisi</p>
                                        <p class="font-medium">${product.condition || 'Tidak tersedia'}</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-500 text-sm">Berat</p>
                                        <p class="font-medium">${product.weight ? product.weight + ' gram' : 'Tidak tersedia'}</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-500 text-sm">Dikirim dari</p>
                                        <p class="font-medium">${product.location || 'Tidak tersedia'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex items-center justify-between mb-6">
                                <div>
                                    <p class="text-gray-500 text-sm">Harga</p>
                                    <p class="text-2xl font-bold">Rp ${formatPrice(product.price || 0)}</p>
                                </div>
                                <button class="add-to-cart-btn gradient-bg text-white px-6 py-3 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                                        data-product-id="${product.id}">
                                    Tambahkan ke Keranjang
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Tambahkan modal ke body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Tampilkan modal
        const modal = document.getElementById('product-modal');
        modal.style.display = 'block';

        // Event listener untuk menutup modal
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        // Event listener untuk klik di luar modal
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Event listener untuk tombol add to cart di modal
        const addToCartBtn = modal.querySelector('.add-to-cart-btn');
        addToCartBtn.addEventListener('click', () => {
            addProductToCart(productId);
        });

    } catch (error) {
        console.error('Error showing product detail:', error);
    }
}

// Fungsi untuk menambahkan produk ke keranjang
function addProductToCart(productId, quantity = 1) {
    try {
        const product = products.find(p => p.id.toString() === productId.toString());

        if (!product) {
            console.error('Product not found:', productId);
            console.log('Available products:', products);
            console.log('Looking for productId:', productId);
            showNotification('Produk tidak ditemukan!');
            return;
        }

        // Validasi quantity vs stock
        if (product.stock && quantity > product.stock) {
            showNotification(`Stok tidak mencukupi! Hanya tersisa ${product.stock} item.`);
            return;
        }

        console.log(`🛒 Adding to cart: ${product.name} x${quantity}`);

        // Gunakan fungsi addToCart global yang sudah tersedia dari cart.js
        if (typeof window.addToCart === 'function') {
            // Add to cart multiple times based on quantity
            let success = false;
            for (let i = 0; i < quantity; i++) {
                success = window.addToCart(product);
            }

            if (success) {
                showNotification(`${product.name} (${quantity}x) ditambahkan ke keranjang!`);
                // Tambahkan animasi pulse pada cart button
                addCartButtonPulse();

                // Reset quantity input to 1
                const productCard = document.querySelector(`.nft-card[data-product-id="${productId}"]`);
                if (productCard) {
                    const quantityInput = productCard.querySelector('.quantity-input');
                    if (quantityInput) {
                        quantityInput.value = 1;
                    }
                }
            }
        } else {
            console.error('Cart system not loaded');
            showNotification('Sistem keranjang belum siap. Silakan coba lagi.');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Gagal menambahkan ke keranjang');
    }
}

// Fungsi untuk menambahkan animasi pulse pada cart button
function addCartButtonPulse() {
    const cartButtonDesktop = document.getElementById('cart-button-desktop');
    const cartButtonMobile = document.getElementById('cart-button-mobile');
    const cartFab = document.getElementById('cart-fab');

    [cartButtonDesktop, cartButtonMobile, cartFab].forEach(button => {
        if (button) {
            button.classList.add('cart-button-pulse');
            setTimeout(() => {
                button.classList.remove('cart-button-pulse');
            }, 600);
        }
    });

    // Tambahkan animasi pada cart count
    const cartCountDesktop = document.getElementById('cart-count-desktop');
    const cartCountMobile = document.getElementById('cart-count-mobile');

    [cartCountDesktop, cartCountMobile].forEach(count => {
        if (count && count.style.display !== 'none') {
            count.classList.add('cart-count-update');
            setTimeout(() => {
                count.classList.remove('cart-count-update');
            }, 400);
        }
    });
}

function animateAddToCart(card) {
    try {
        const img = card.querySelector('img');
        const cartBtn = document.getElementById('cart-button-desktop') || document.getElementById('cart-fab');
        if (!img || !cartBtn) return;
        const imgRect = img.getBoundingClientRect();
        const cartRect = cartBtn.getBoundingClientRect();
        const clone = img.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.left = imgRect.left + 'px';
        clone.style.top = imgRect.top + 'px';
        clone.style.width = imgRect.width + 'px';
        clone.style.height = imgRect.height + 'px';
        clone.style.zIndex = 1000;
        clone.style.borderRadius = '12px';
        clone.style.transition = 'transform .6s ease, opacity .6s ease, width .6s ease, height .6s ease';
        document.body.appendChild(clone);
        const dx = cartRect.left - imgRect.left;
        const dy = cartRect.top - imgRect.top;
        requestAnimationFrame(() => {
            clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`;
            clone.style.opacity = '0.3';
            clone.style.width = '40px';
            clone.style.height = '40px';
        });
        setTimeout(() => { clone.remove(); addCartButtonPulse(); }, 650);
    } catch (_) { }
}

// Fungsi untuk memperbarui cart button desktop
function updateCartButtonDesktop() {
    // Ambil data keranjang dari localStorage dengan nama kunci yang benar
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    // Update jumlah item di cart button desktop
    const cartCountDesktop = document.getElementById('cart-count-desktop');
    if (cartCountDesktop) {
        cartCountDesktop.textContent = itemCount;
        cartCountDesktop.style.display = itemCount > 0 ? 'flex' : 'none';
    }

    // Update jumlah item di cart button mobile
    const cartCountMobile = document.getElementById('cart-count-mobile');
    if (cartCountMobile) {
        cartCountMobile.textContent = itemCount;
        cartCountMobile.style.display = itemCount > 0 ? 'flex' : 'none';
    }
}

// Fungsi utilitas
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function showLoading(isLoading) {
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }

    if (productGrid) {
        productGrid.style.opacity = isLoading ? '0.5' : '1';
    }
}

function showError(message) {
    if (productGrid) {
        productGrid.innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-red-500 text-lg">${message}</p>
                <button id="retry-btn" class="mt-4 px-4 py-2 bg-primary text-dark rounded-lg">
                    Coba Lagi
                </button>
            </div>
        `;

        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', async () => {
                showLoading(true);
                try {
                    await fetchProducts();
                    renderProducts(products);
                    showLoading(false);
                } catch (error) {
                    console.error('Error retrying fetch:', error);
                    showError('Gagal memuat produk. Silakan coba lagi nanti.');
                    showLoading(false);
                }
            });
        }
    }
}

function showNotification(message) {
    // Cek apakah sudah ada notifikasi
    let notification = document.getElementById('notification');

    if (notification) {
        // Update pesan notifikasi yang sudah ada
        notification.textContent = message;

        // Reset timer
        clearTimeout(notification.timer);
    } else {
        // Buat notifikasi baru
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'fixed bottom-4 right-4 bg-dark text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-y-0';
        notification.textContent = message;

        document.body.appendChild(notification);
    }

    // Animasi masuk
    setTimeout(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    }, 10);

    // Set timer untuk menghilangkan notifikasi
    notification.timer = setTimeout(() => {
        notification.style.transform = 'translateY(20px)';
        notification.style.opacity = '0';

        // Hapus elemen setelah animasi selesai
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function ensureCartReady() {
    try {
        const sidebar = document.getElementById('cart-sidebar');
        const container = document.getElementById('cart-sidebar-container');
        if (!sidebar && container) {
            fetch('cart-sidebar.html')
                .then(r => r.text())
                .then(html => {
                    container.innerHTML = html;
                    setTimeout(() => {
                        if (typeof window.setupCartEventListeners === 'function') window.setupCartEventListeners();
                        if (typeof window.loadCartFromStorage === 'function') window.loadCartFromStorage();
                        if (typeof window.renderCartItems === 'function') window.renderCartItems();
                        if (typeof feather !== 'undefined') { try { feather.replace(); } catch (_) { } }
                    }, 50);
                })
                .catch(e => console.error('Error injecting cart sidebar:', e));
        }
        const footer = document.querySelector('footer');
        if (footer) {
            footer.style.display = '';
            footer.style.visibility = 'visible';
        }
    } catch (e) { console.warn('ensureCartReady failed', e); }
}

function isFavorite(id) {
    return likes.has(String(id));
}

async function fetchUserLikes() {
    const { data, error } = await supabase
        .from('product_likes')
        .select('product_id')
        .eq('user_id', currentUserId);
    if (error) { console.error('Error fetching likes', error); return; }
    likes = new Set((data || []).map(d => String(d.product_id)));
}

function setupRealtimeLikes() {
    const ch = supabase
        .channel('likes-' + currentUserId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'product_likes', filter: `user_id=eq.${currentUserId}` }, async () => {
            await fetchUserLikes();
            updateLikeIcons();
        })
        .subscribe();
}

function updateLikeIcons() {
    if (!productGrid) return;
    productGrid.querySelectorAll('.favorite-btn').forEach(btn => {
        const pid = btn.getAttribute('data-product-id');
        const icon = btn.querySelector('.feather-heart');
        const fav = isFavorite(pid);
        if (icon) {
            icon.classList.toggle('text-red-500', !!fav);
            icon.classList.toggle('text-gray-500', !fav);
        }
    });
}

async function toggleFavorite(id) {
    if (!currentUserId) { showNotification('Silakan login untuk menyukai produk'); return; }
    const pid = String(id);
    if (likeSaving.has(pid)) return;
    likeSaving.add(pid);
    const btn = productGrid.querySelector(`.favorite-btn[data-product-id="${pid}"]`);
    if (btn) { btn.classList.add('opacity-60'); btn.disabled = true; }
    try {
        if (isFavorite(pid)) {
            const { error } = await supabase
                .from('product_likes')
                .delete()
                .eq('user_id', currentUserId)
                .eq('product_id', pid);
            if (error) throw error;
            likes.delete(pid);
            showNotification('Produk dihapus dari Disukai');
        } else {
            const { error } = await supabase
                .from('product_likes')
                .upsert({ user_id: currentUserId, product_id: pid }, { onConflict: 'user_id,product_id' });
            if (error) throw error;
            likes.add(pid);
            showNotification('Produk ditambahkan ke Disukai');
        }
        updateLikeIcons();
    } catch (e) {
        console.error('Error toggling like', e);
        showNotification('Gagal menyimpan status Like');
    } finally {
        likeSaving.delete(pid);
        if (btn) { btn.classList.remove('opacity-60'); btn.disabled = false; }
    }
}

// Export fungsi yang dibutuhkan
window.addProductToCart = addProductToCart;
