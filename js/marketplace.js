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

// Inisialisasi halaman
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Tampilkan loading indicator
        showLoading(true);
        
        // Ambil data produk dari Supabase
        await fetchProducts();
        
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
        <button class="filter-btn active px-4 py-2 rounded-full text-sm font-medium transition-all" 
                data-category="all">
            Semua
        </button>
    `;
    
    // Tambahkan filter untuk setiap kategori
    categories.forEach(category => {
        filtersHTML += `
            <button class="filter-btn px-4 py-2 rounded-full text-sm font-medium transition-all" 
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
        productsHTML += `
            <div class="nft-card bg-white rounded-xl shadow-lg overflow-hidden card-hover transition-all duration-300" 
                 data-product-id="${product.id}">
                <div class="relative">
                    <img src="${product.image_url || 'https://via.placeholder.com/300x300?text=No+Image'}" 
                         alt="${product.name}" 
                         class="nft-image w-full h-48 object-cover">
                    <div class="absolute top-2 right-2 bg-primary text-dark px-2 py-1 rounded-full text-xs font-bold">
                        ${product.category || 'Uncategorized'}
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="text-lg font-bold mb-1 truncate">${product.name}</h3>
                    <p class="text-gray-600 text-sm mb-2 line-clamp-2 h-10">${product.description || 'Tidak ada deskripsi'}</p>

                    <!-- Price -->
                    <div class="mb-3">
                        <span class="text-dark font-bold text-lg">Rp ${formatPrice(product.price || 0)}</span>
                        ${product.stock ? `<p class="text-xs text-gray-500 mt-1">Stok: ${product.stock}</p>` : ''}
                    </div>

                    <!-- Quantity Selector & Add to Cart -->
                    <div class="flex items-center gap-2">
                        <!-- Quantity Controls -->
                        <div class="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                            <button class="quantity-decrease-btn px-2 py-1 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    data-product-id="${product.id}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 12h14"></path>
                                </svg>
                            </button>
                            <input type="number"
                                   value="1"
                                   min="1"
                                   max="${product.stock || 999}"
                                   class="quantity-input w-12 text-center border-0 focus:outline-none py-1"
                                   data-product-id="${product.id}">
                            <button class="quantity-increase-btn px-2 py-1 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    data-product-id="${product.id}"
                                    ${product.stock ? `data-max-stock="${product.stock}"` : ''}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 5v14"></path>
                                    <path d="M5 12h14"></path>
                                </svg>
                            </button>
                        </div>

                        <!-- Add to Cart Button -->
                        <button class="add-to-cart-btn flex-1 bg-primary hover:bg-yellow-400 text-dark px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                data-product-id="${product.id}">
                            + Keranjang
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    productGrid.innerHTML = productsHTML;
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
                if (e.target.classList.contains('add-to-cart-btn')) {
                    const quantityInput = productCard.querySelector('.quantity-input');
                    const quantity = parseInt(quantityInput.value) || 1;
                    addProductToCart(productId, quantity);
                    e.stopPropagation(); // Hindari membuka detail produk
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
    
    [cartButtonDesktop, cartButtonMobile].forEach(button => {
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

// Export fungsi yang dibutuhkan
window.addProductToCart = addProductToCart;