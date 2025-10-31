// cart.js - Sistem keranjang belanja dengan integrasi Supabase
import { supabase } from './supabase.js';

// State keranjang
let cartItems = [];
let isCartOpen = false;
let cartId = null;
let isCartSyncing = false;
let syncQueue = [];
let lastSyncTime = 0;

// Inisialisasi cart saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthAndLoadCart();
    updateCartDisplay();
    setupCartEventListeners();
    setupAuthChangeListener();
    
    // Jalankan pengujian integritas data saat halaman dimuat
    setTimeout(async () => {
        console.log('Running cart data integrity test on page load...');
        await testCartDataIntegrity();
    }, 3000); // Tunggu 3 detik untuk memastikan semua inisialisasi selesai
});

// Fungsi untuk memeriksa autentikasi dan memuat keranjang
async function checkAuthAndLoadCart() {
    try {
        // Cek apakah user sudah login
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            // User sudah login, coba ambil cart dari Supabase
            console.log('User logged in, loading cart from Supabase...');
            await loadCartFromSupabase(session.user.id);
        } else {
            // User belum login, ambil dari localStorage
            console.log('User not logged in, loading cart from localStorage...');
            loadCartFromStorage();
        }
    } catch (error) {
        console.error('Error checking auth and loading cart:', error);
        // Fallback ke localStorage
        loadCartFromStorage();
    }
}

// Fungsi untuk setup listener perubahan autentikasi
function setupAuthChangeListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
            // User baru login, sinkronkan cart dari localStorage ke Supabase
            console.log('User signed in, syncing cart to Supabase...');
            await syncCartToSupabase(session.user.id);
            
            // Jalankan pengujian integritas data setelah login
            setTimeout(async () => {
                console.log('Running cart data integrity test after login...');
                await testCartDataIntegrity();
            }, 2000); // Tunggu 2 detik untuk memastikan sinkronisasi selesai
        } else if (event === 'SIGNED_OUT') {
            // User logout, reset cartId
            console.log('User signed out, resetting cart state...');
            cartId = null;
            // Tetap pertahankan cartItems di localStorage
            
            // Simpan data cart ke localStorage sebelum logout
            console.log('Saving cart data to localStorage before logout...');
            saveCartToStorage();
        }
    });
}

// Fungsi untuk memuat keranjang dari localStorage
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('cartItems');
        if (savedCart) {
            cartItems = JSON.parse(savedCart);
        }
    } catch (error) {
        console.error('Error loading cart from storage:', error);
        cartItems = [];
    }
}

// Fungsi untuk menyimpan keranjang ke localStorage
function saveCartToStorage() {
    try {
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch (error) {
        console.error('Error saving cart to storage:', error);
    }
}

// Fungsi untuk memuat keranjang dari Supabase
async function loadCartFromSupabase(userId) {
    try {
        console.log('Loading cart from Supabase for user:', userId);
        
        // Cek apakah user sudah memiliki cart
        const { data: cartData, error: cartError } = await supabase
            .from('cart')
            .select('id')
            .eq('user_id', userId)
            .single();
            
        if (cartError && cartError.code !== 'PGRST116') {
            // Error selain "tidak ada data"
            console.error('Error fetching cart:', cartError);
            loadCartFromStorage(); // Fallback ke localStorage
            return;
        }
        
        if (!cartData) {
            console.log('No cart found in Supabase, creating new cart...');
            // Tidak ada cart, buat baru jika ada item di localStorage
            if (cartItems.length > 0) {
                await syncCartToSupabase(userId);
            } else {
                loadCartFromStorage(); // Load dari localStorage (mungkin kosong)
            }
            return;
        }
        
        // Cart ditemukan, simpan ID
        cartId = cartData.id;
        console.log('Cart found in Supabase, ID:', cartId);
        
        // Ambil item dalam cart
        const { data: cartItemsData, error: itemsError } = await supabase
            .from('cart_items')
            .select(`
                id,
                product_id,
                quantity,
                products (
                    id,
                    name,
                    price,
                    image_url,
                    category,
                    stock
                )
            `)
            .eq('cart_id', cartId);
            
        if (itemsError) {
            console.error('Error fetching cart items:', itemsError);
            loadCartFromStorage(); // Fallback ke localStorage
            return;
        }
        
        if (!cartItemsData || cartItemsData.length === 0) {
            console.log('Cart is empty in Supabase');
            cartItems = [];
            saveCartToStorage(); // Sync kosong ke localStorage
            return;
        }
        
        // Transform data dari Supabase ke format cartItems
        cartItems = cartItemsData.map(item => ({
            id: item.product_id,
            name: item.products.name,
            price: item.products.price,
            image_url: item.products.image_url,
            category: item.products.category,
            stock: item.products.stock,
            quantity: item.quantity,
            cart_item_id: item.id // Simpan ID dari tabel cart_items
        }));
        
        console.log('Cart loaded from Supabase:', cartItems);
        
        // Sync ke localStorage untuk backup
        saveCartToStorage();
        
    } catch (error) {
        console.error('Error in loadCartFromSupabase:', error);
        loadCartFromStorage(); // Fallback ke localStorage
    }
}

// Fungsi untuk sinkronisasi cart dari localStorage ke Supabase
async function syncCartToSupabase(userId) {
    try {
        if (isCartSyncing) {
            console.log('Cart sync already in progress, queueing operation...');
            return new Promise((resolve) => {
                syncQueue.push(resolve);
            });
        }
        
        isCartSyncing = true;
        console.log('Syncing cart to Supabase for user:', userId);
        
        // Cek apakah user sudah memiliki cart
        let userCartId = cartId;
        
        if (!userCartId) {
            const { data: cartData, error: cartError } = await supabase
                .from('cart')
                .select('id')
                .eq('user_id', userId)
                .single();
                
            if (cartError && cartError.code !== 'PGRST116') {
                console.error('Error checking existing cart:', cartError);
                isCartSyncing = false;
                processSyncQueue();
                return;
            }
            
            if (cartData) {
                userCartId = cartData.id;
                cartId = userCartId;
            } else {
                // Buat cart baru
                const { data: newCart, error: createError } = await supabase
                    .from('cart')
                    .insert({ user_id: userId })
                    .select('id')
                    .single();
                    
                if (createError) {
                    console.error('Error creating new cart:', createError);
                    isCartSyncing = false;
                    processSyncQueue();
                    return;
                }
                
                userCartId = newCart.id;
                cartId = userCartId;
                console.log('New cart created in Supabase, ID:', cartId);
            }
        }
        
        // Hapus semua item yang ada di cart (untuk sinkronisasi penuh)
        const { error: deleteError } = await supabase
            .from('cart_items')
            .delete()
            .eq('cart_id', userCartId);
            
        if (deleteError) {
            console.error('Error deleting existing cart items:', deleteError);
            isCartSyncing = false;
            processSyncQueue();
            return;
        }
        
        // Jika tidak ada item di localStorage, selesai
        if (cartItems.length === 0) {
            console.log('No items to sync to Supabase');
            isCartSyncing = false;
            processSyncQueue();
            return;
        }
        
        // Insert semua item dari localStorage
        const cartItemsToInsert = cartItems.map(item => ({
            cart_id: userCartId,
            product_id: item.id,
            quantity: item.quantity
        }));
        
        const { error: insertError } = await supabase
            .from('cart_items')
            .insert(cartItemsToInsert);
            
        if (insertError) {
            console.error('Error inserting cart items:', insertError);
            isCartSyncing = false;
            processSyncQueue();
            return;
        }
        
        console.log('Cart successfully synced to Supabase');
        lastSyncTime = Date.now();
        
        // Load kembali cart dari Supabase untuk mendapatkan cart_item_id
        await loadCartFromSupabase(userId);
        
        isCartSyncing = false;
        processSyncQueue();
        
    } catch (error) {
        console.error('Error in syncCartToSupabase:', error);
        isCartSyncing = false;
        processSyncQueue();
    }
}

// Fungsi untuk memproses antrian sinkronisasi
function processSyncQueue() {
    if (syncQueue.length > 0) {
        const nextResolve = syncQueue.shift();
        nextResolve();
    }
}

// Fungsi untuk menambahkan produk ke keranjang
async function addToCart(product) {
    try {
        if (!product || !product.id) {
            console.error('Invalid product data');
            return false;
        }

        // Cek apakah produk sudah ada di keranjang
        const existingItemIndex = cartItems.findIndex(item => item.id === product.id);
        
        if (existingItemIndex > -1) {
            // Jika sudah ada, tambah quantity
            cartItems[existingItemIndex].quantity += 1;
        } else {
            // Jika belum ada, tambah produk baru
            cartItems.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                category: product.category,
                stock: product.stock,
                quantity: 1
            });
        }

        // Simpan ke localStorage
        saveCartToStorage();
        
        // Update tampilan
        updateCartDisplay();
        
        // Tampilkan notifikasi
        showCartNotification(`${product.name} ditambahkan ke keranjang!`);
        
        // Sinkronkan ke Supabase jika user login
        await syncCartAfterChange();
        
        return true;
    } catch (error) {
        console.error('Error adding to cart:', error);
        return false;
    }
}

// Fungsi untuk menghapus produk dari keranjang dengan konfirmasi
async function removeFromCart(productId) {
    try {
        console.log('🗑️ Attempting to remove product:', productId);
        console.log('📦 Current cart items:', cartItems);

        // Find item by matching ID (handles both string UUID and number)
        const itemIndex = cartItems.findIndex(item => {
            // Compare as strings to handle UUID
            return String(item.id) === String(productId);
        });

        if (itemIndex === -1) {
            console.error('❌ Product not found in cart. ID:', productId);
            showCartNotification('Produk tidak ditemukan di keranjang');
            return;
        }

        const removedItem = cartItems[itemIndex];
        console.log('✅ Found item to remove:', removedItem);
        
        // Tambahkan animasi fade out
        const cartItemElement = document.querySelector(`[data-item-id="${productId}"]`);
        if (cartItemElement) {
            cartItemElement.style.transition = 'all 0.3s ease';
            cartItemElement.style.transform = 'translateX(100%)';
            cartItemElement.style.opacity = '0';
            
            setTimeout(async () => {
                // Hapus item dari array
                cartItems.splice(itemIndex, 1);
                
                // Simpan ke localStorage
                saveCartToStorage();
                
                // Update tampilan
                updateCartDisplay();
                renderCartItems();
                
                // Tampilkan notifikasi
                showCartNotification(`${removedItem.name} dihapus dari keranjang!`);
                
                // Sinkronkan ke Supabase jika user login
                await syncCartAfterChange();
            }, 300);
        } else {
            // Fallback jika element tidak ditemukan
            cartItems.splice(itemIndex, 1);
            saveCartToStorage();
            updateCartDisplay();
            renderCartItems();
            showCartNotification(`${removedItem.name} dihapus dari keranjang!`);
            
            // Sinkronkan ke Supabase jika user login
            await syncCartAfterChange();
        }
        
    } catch (error) {
        console.error('Error removing from cart:', error);
        showCartNotification('Gagal menghapus produk dari keranjang');
    }
}

// Fungsi untuk mengubah quantity produk dengan validasi dan animasi
async function updateQuantity(productId, newQuantity) {
    try {
        // Find item by matching ID (handles both string UUID and number)
        const itemIndex = cartItems.findIndex(item => {
            // Compare as strings to handle UUID
            return String(item.id) === String(productId);
        });

        if (itemIndex === -1) return;

        // Validasi: quantity tidak boleh kurang dari 1
        if (newQuantity < 1) {
            showCartNotification('Jumlah produk minimal 1!');
            return;
        }

        // Validasi: quantity tidak boleh lebih dari stok (jika ada)
        const item = cartItems[itemIndex];
        if (item.stock && newQuantity > item.stock) {
            showCartNotification(`Stok tersedia hanya ${item.stock} item!`);
            return;
        }

        // Tambahkan loading state
        const cartItemElement = document.querySelector(`[data-item-id="${productId}"]`);
        if (cartItemElement) {
            cartItemElement.classList.add('loading');
        }

        // Tambahkan animasi pada quantity display
        const quantityDisplay = document.querySelector(`[data-quantity-id="${productId}"]`);
        if (quantityDisplay) {
            quantityDisplay.classList.add('updating');
            setTimeout(() => {
                quantityDisplay.classList.remove('updating');
            }, 400);
        }

        // Update quantity dengan delay untuk animasi
        setTimeout(async () => {
            cartItems[itemIndex].quantity = newQuantity;
            
            // Simpan ke localStorage
            saveCartToStorage();
            
            // Update tampilan
            updateCartDisplay();
            renderCartItems();
            
            // Hapus loading state dan tambah success feedback
            if (cartItemElement) {
                cartItemElement.classList.remove('loading');
                cartItemElement.classList.add('success');
                setTimeout(() => {
                    cartItemElement.classList.remove('success');
                }, 600);
            }

            // Tampilkan notifikasi
            showCartNotification(`Jumlah ${item.name} diperbarui!`);
            
            // Smooth scroll jika item tidak terlihat
            scrollToCartItem(productId);
            
            // Sinkronkan ke Supabase jika user login
            await syncCartAfterChange();
            
        }, 200);

    } catch (error) {
        console.error('Error updating quantity:', error);
        showCartNotification('Gagal memperbarui jumlah produk');
    }
}

// Fungsi untuk sinkronisasi cart setelah perubahan
async function syncCartAfterChange() {
    try {
        // Cek apakah user login
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            // Throttle sinkronisasi untuk menghindari terlalu banyak request
            const now = Date.now();
            if (now - lastSyncTime < 2000) { // Minimal 2 detik antara sinkronisasi
                console.log('Throttling cart sync, too many requests');
                return;
            }
            
            // Sinkronkan ke Supabase
            console.log('Syncing cart after change...');
            await syncCartToSupabase(session.user.id);
        }
    } catch (error) {
        console.error('Error in syncCartAfterChange:', error);
    }
}

// Fungsi untuk menambah quantity
function increaseQuantity(productId) {
    console.log('🔼 Attempting to increase quantity for product:', productId);
    console.log('📦 Current cart items:', cartItems);

    // Find item by matching ID (handles both string UUID and number)
    const item = cartItems.find(item => {
        // Compare as strings to handle UUID
        return String(item.id) === String(productId);
    });

    if (!item) {
        console.error('❌ Product not found in cart. ID:', productId);
        showCartNotification('Produk tidak ditemukan di keranjang');
        return;
    }

    console.log('✅ Found item:', item);
    console.log('📊 Current quantity:', item.quantity, 'Stock:', item.stock);

    // Validasi stok
    if (item.stock && item.quantity >= item.stock) {
        console.warn('⚠️ Stock limit reached');
        showCartNotification(`Stok maksimal ${item.stock} item!`);
        return;
    }

    console.log('✅ Updating quantity to:', item.quantity + 1);
    updateQuantity(productId, item.quantity + 1);
}

// Fungsi untuk mengurangi quantity
function decreaseQuantity(productId) {
    console.log('🔽 Attempting to decrease quantity for product:', productId);

    // Find item by matching ID (handles both string UUID and number)
    const item = cartItems.find(item => {
        // Compare as strings to handle UUID
        return String(item.id) === String(productId);
    });

    if (!item) {
        console.error('❌ Product not found in cart. ID:', productId);
        showCartNotification('Produk tidak ditemukan di keranjang');
        return;
    }

    console.log('✅ Found item:', item);
    console.log('📊 Current quantity:', item.quantity);

    if (item.quantity <= 1) {
        // Konfirmasi hapus item jika quantity akan menjadi 0
        console.log('⚠️ Quantity is 1, asking for confirmation to remove');
        if (confirm(`Hapus ${item.name} dari keranjang?`)) {
            removeFromCart(productId);
        }
        return;
    }

    console.log('✅ Updating quantity to:', item.quantity - 1);
    updateQuantity(productId, item.quantity - 1);
}

// Fungsi untuk scroll ke item tertentu dalam cart
function scrollToCartItem(productId) {
    const cartContainer = document.querySelector('.cart-scroll-container');
    const itemElement = document.querySelector(`[data-item-id="${productId}"]`);
    
    if (cartContainer && itemElement) {
        const containerRect = cartContainer.getBoundingClientRect();
        const itemRect = itemElement.getBoundingClientRect();
        
        // Cek apakah item terlihat sepenuhnya
        const isVisible = itemRect.top >= containerRect.top && 
                         itemRect.bottom <= containerRect.bottom;
        
        if (!isVisible) {
            itemElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
}

// Fungsi untuk menghitung total harga
function calculateTotal() {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Fungsi untuk setup scroll functionality
function setupScrollFunctionality() {
    const scrollContainer = document.querySelector('.cart-scroll-container');
    
    if (!scrollContainer) return;
    
    // Initial setup
    scrollContainer.addEventListener('scroll', function() {
        // You could add scroll-based functionality here
        // For example, lazy loading more items when reaching bottom
    });
}

// Fungsi untuk menghitung total item
function getTotalItems() {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
}

// Fungsi untuk update tampilan counter cart
function updateCartDisplay() {
    const totalItems = getTotalItems();
    
    // Update desktop cart count
    const cartCountDesktop = document.getElementById('cart-count-desktop');
    if (cartCountDesktop) {
        cartCountDesktop.textContent = totalItems;
        cartCountDesktop.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    // Update mobile cart count
    const cartCountMobile = document.getElementById('cart-count-mobile');
    if (cartCountMobile) {
        cartCountMobile.textContent = totalItems;
        cartCountMobile.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// Fungsi untuk membuka sidebar cart
function openCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        cartSidebar.classList.remove('translate-x-full');
        cartSidebar.classList.add('translate-x-0');
        isCartOpen = true;
        
        // Render items di sidebar
        renderCartItems();
        
        // Tambahkan overlay
        showCartOverlay();
    }
}

// Fungsi untuk menutup sidebar cart
function closeCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        cartSidebar.classList.remove('translate-x-0');
        cartSidebar.classList.add('translate-x-full');
        isCartOpen = false;
        
        // Hapus overlay
        hideCartOverlay();
    }
}

// Fungsi untuk menampilkan overlay
function showCartOverlay() {
    let overlay = document.getElementById('cart-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'cart-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-40';
        overlay.addEventListener('click', closeCart);
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'block';
}

// Fungsi untuk menyembunyikan overlay
function hideCartOverlay() {
    const overlay = document.getElementById('cart-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Fungsi untuk render items di sidebar cart dengan fitur scroll dan kontrol quantity
function renderCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartEmpty = document.getElementById('cart-empty');
    const cartContent = document.getElementById('cart-content');
    const cartItemCount = document.getElementById('cart-item-count');
    
    if (!cartItemsContainer) return;
    
    // Update item count in header
    const totalItems = getTotalItems();
    if (cartItemCount) {
        cartItemCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
    }
    
    if (cartItems.length === 0) {
        if (cartEmpty) cartEmpty.style.display = 'flex';
        if (cartContent) cartContent.style.display = 'none';
        return;
    }
    
    if (cartEmpty) cartEmpty.style.display = 'none';
    if (cartContent) cartContent.style.display = 'flex';
    
    // Render items dengan kontrol quantity yang enhanced
    cartItemsContainer.innerHTML = cartItems.map((item, index) => `
        <div class="cart-item" data-item-id="${item.id}" style="animation-delay: ${index * 0.1}s">
            <div class="flex items-start space-x-3 p-4 hover:bg-gray-50 transition-all duration-300">
                <div class="cart-item-image flex-shrink-0">
                    <img src="${item.image_url || 'https://via.placeholder.com/80x80?text=No+Image'}" 
                         alt="${item.name}" 
                         class="w-16 h-16 object-cover rounded-lg shadow-md">
                </div>
                
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between mb-2">
                        <div class="flex-1 pr-2">
                            <h4 class="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">${item.name}</h4>
                            <p class="text-xs text-gray-500 mb-1">${item.category || 'Produk'}</p>
                            <p class="item-price text-base font-bold">Rp ${formatPrice(item.price)}</p>
                        </div>
                        
                        <button onclick="removeFromCart(${item.id})" 
                                class="remove-btn text-red-400 hover:text-red-600 p-1 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-300"
                                aria-label="Hapus ${item.name}"
                                title="Hapus dari keranjang">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Quantity Controls -->
                    <div class="flex items-center justify-between mt-3">
                        <div class="quantity-controls flex items-center bg-gray-50 rounded-lg p-1">
                            <button onclick="decreaseQuantity(${item.id})" 
                                    class="quantity-btn decrease-btn ${item.quantity <= 1 ? 'opacity-50 cursor-not-allowed' : ''}"
                                    ${item.quantity <= 1 ? 'disabled' : ''}
                                    aria-label="Kurangi jumlah"
                                    title="Kurangi jumlah">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M5 12h14"></path>
                                </svg>
                            </button>
                            
                            <div class="quantity-display-container mx-3">
                                <span class="quantity-display" data-quantity-id="${item.id}">${item.quantity}</span>
                            </div>
                            
                            <button onclick="increaseQuantity(${item.id})" 
                                    class="quantity-btn increase-btn ${item.stock && item.quantity >= item.stock ? 'opacity-50 cursor-not-allowed' : ''}"
                                    ${item.stock && item.quantity >= item.stock ? 'disabled' : ''}
                                    aria-label="Tambah jumlah"
                                    title="Tambah jumlah">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 5v14"></path>
                                    <path d="M5 12h14"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="text-right">
                            <p class="text-xs text-gray-500 mb-1">Subtotal</p>
                            <p class="item-subtotal font-bold text-purple-600">Rp ${formatPrice(item.price * item.quantity)}</p>
                        </div>
                    </div>
                    
                    ${item.stock ? `<div class="mt-2"><p class="text-xs text-gray-400">Stok tersisa: ${item.stock}</p></div>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    // Update totals
    const total = calculateTotal();
    if (cartTotal) {
        cartTotal.textContent = `Rp ${formatPrice(total)}`;
    }
    if (cartSubtotal) {
        cartSubtotal.textContent = `Rp ${formatPrice(total)}`;
    }
    
    // Setup scroll functionality
    setupScrollFunctionality();

    // Setup event delegation for quantity buttons
    setupQuantityButtonListeners();
}

// Fungsi untuk setup event listeners
function setupCartEventListeners() {
    // Event listener untuk tombol cart di navbar
    const cartButtonDesktop = document.getElementById('cart-button-desktop');
    const cartButtonMobile = document.getElementById('cart-button-mobile');

    if (cartButtonDesktop) {
        cartButtonDesktop.addEventListener('click', openCart);
    }

    if (cartButtonMobile) {
        cartButtonMobile.addEventListener('click', openCart);
    }

    // Event listener untuk tombol close cart
    const closeCartBtn = document.getElementById('close-cart');
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', closeCart);
    }

    // Setup quantity button event delegation
    setupQuantityButtonListeners();
}

// Setup event delegation for quantity control buttons
function setupQuantityButtonListeners() {
    const cartItemsContainer = document.getElementById('cart-items');

    if (!cartItemsContainer) {
        console.warn('⚠️ Cart items container not found');
        return;
    }

    // Remove existing listener if any
    cartItemsContainer.removeEventListener('click', handleQuantityClick);

    // Add event delegation for all buttons in cart items
    cartItemsContainer.addEventListener('click', handleQuantityClick);

    console.log('✅ Quantity button event listeners setup complete');
}

// Handle clicks on quantity buttons and remove button using event delegation
function handleQuantityClick(event) {
    const target = event.target;

    // Handle remove button clicks
    const removeBtn = target.closest('.remove-btn');
    if (removeBtn) {
        const onclickAttr = removeBtn.getAttribute('onclick');
        if (onclickAttr) {
            // Match UUID, number, or any string: removeFromCart(xxx)
            const match = onclickAttr.match(/removeFromCart\(([^)]+)\)/);
            if (match) {
                let productId = match[1];
                // Remove quotes if present
                productId = productId.replace(/['"]/g, '');

                console.log(`🗑️ Remove button clicked for product: ${productId}`);

                event.preventDefault();
                event.stopPropagation();

                removeFromCart(productId);
                return;
            }
        }
    }

    // Handle quantity buttons (+ and -)
    const button = target.closest('.quantity-btn');

    if (!button) return;

    // Get product ID from the button's onclick attribute
    const onclickAttr = button.getAttribute('onclick');

    if (!onclickAttr) return;

    // Extract function name and product ID from onclick
    // Format: "increaseQuantity(123)" or "increaseQuantity('uuid')" or "increaseQuantity(uuid)"
    const match = onclickAttr.match(/(increase|decrease)Quantity\(([^)]+)\)/);

    if (!match) {
        console.error('❌ Could not parse onclick attribute:', onclickAttr);
        return;
    }

    const action = match[1]; // "increase" or "decrease"
    let productId = match[2];

    // Remove quotes if present
    productId = productId.replace(/['"]/g, '');

    // Try to convert to number if it's numeric, otherwise keep as string (UUID)
    const numericId = /^\d+$/.test(productId) ? parseInt(productId) : productId;

    console.log(`🎯 Button clicked: ${action}Quantity(${productId})`);

    // Prevent default onclick behavior
    event.preventDefault();
    event.stopPropagation();

    // Call the appropriate function with the parsed ID
    if (action === 'increase') {
        increaseQuantity(numericId);
    } else if (action === 'decrease') {
        decreaseQuantity(numericId);
    }
}

// Fungsi untuk menampilkan notifikasi cart
function showCartNotification(message) {
    // Cek apakah sudah ada notifikasi
    let notification = document.getElementById('cart-notification');
    
    if (notification) {
        notification.textContent = message;
        clearTimeout(notification.timer);
    } else {
        notification = document.createElement('div');
        notification.id = 'cart-notification';
        notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-y-0';
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
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Fungsi untuk format harga
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Fungsi untuk checkout (akan diintegrasikan dengan Midtrans)
async function checkout() {
    try {
        if (cartItems.length === 0) {
            showCartNotification('Keranjang belanja kosong!');
            return;
        }
        
        // Cek apakah user sudah login
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showCartNotification('Silakan login terlebih dahulu!');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // Pastikan cart tersimpan di Supabase sebelum checkout
        await syncCartToSupabase(user.id);
        
        // Tutup sidebar cart
        closeCart();
        
        // Tampilkan animasi transisi
        const transitionOverlay = document.createElement('div');
        transitionOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center transition-opacity duration-500';
        transitionOverlay.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p class="text-gray-700">Mengarahkan ke halaman checkout...</p>
            </div>
        `;
        document.body.appendChild(transitionOverlay);
        
        // Simpan ID cart di sessionStorage untuk digunakan di halaman checkout
        if (cartId) {
            sessionStorage.setItem('checkout_cart_id', cartId);
        }
        
        // Redirect ke halaman checkout setelah delay singkat
        setTimeout(() => {
            window.location.href = 'checkout.html';
        }, 1000);
        
    } catch (error) {
        console.error('Error during checkout:', error);
        showCartNotification('Gagal melakukan checkout. Silakan coba lagi.');
    }
}

// Fungsi untuk mengosongkan keranjang
async function clearCart() {
    cartItems = [];
    saveCartToStorage();
    updateCartDisplay();
    renderCartItems();
    
    try {
        // Cek apakah user login
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user && cartId) {
            // Hapus semua item di Supabase
            console.log('Clearing cart in Supabase...');
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('cart_id', cartId);
                
            if (error) {
                console.error('Error clearing cart in Supabase:', error);
            } else {
                console.log('Cart cleared in Supabase');
                lastSyncTime = Date.now();
            }
        }
    } catch (error) {
        console.error('Error clearing cart in Supabase:', error);
    }
}

// Export fungsi untuk global scope
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.openCart = openCart;
window.closeCart = closeCart;
window.renderCartItems = renderCartItems;
window.loadCartFromStorage = loadCartFromStorage;
window.setupCartEventListeners = setupCartEventListeners;
window.checkout = checkout;
window.clearCart = clearCart;

// Fungsi untuk menguji integritas data keranjang
async function testCartDataIntegrity() {
    try {
        console.log('=== TESTING CART DATA INTEGRITY ===');
        
        // Cek apakah user sudah login
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user) {
            console.log('User not logged in, skipping integrity test');
            return;
        }
        
        const userId = session.user.id;
        console.log('Testing cart data integrity for user:', userId);
        
        // Ambil data cart dari Supabase
        const { data: cartData, error: cartError } = await supabase
            .from('cart')
            .select('id')
            .eq('user_id', userId)
            .single();
            
        if (cartError && cartError.code !== 'PGRST116') {
            console.error('Error fetching cart:', cartError);
            return;
        }
        
        if (!cartData) {
            console.log('No cart found in Supabase');
            return;
        }
        
        const supabaseCartId = cartData.id;
        console.log('Cart ID in Supabase:', supabaseCartId);
        
        // Ambil item dalam cart dari Supabase
        const { data: supabaseItems, error: itemsError } = await supabase
            .from('cart_items')
            .select(`
                id,
                product_id,
                quantity,
                products (
                    id,
                    name,
                    price
                )
            `)
            .eq('cart_id', supabaseCartId);
            
        if (itemsError) {
            console.error('Error fetching cart items from Supabase:', itemsError);
            return;
        }
        
        // Ambil item dari localStorage
        const localItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
        
        console.log('Items in Supabase:', supabaseItems.length);
        console.log('Items in localStorage:', localItems.length);
        
        // Bandingkan jumlah item
        if (supabaseItems.length !== localItems.length) {
            console.warn('Item count mismatch: Supabase has', supabaseItems.length, 'items, localStorage has', localItems.length, 'items');
            
            // Sinkronkan ulang
            console.log('Re-syncing cart data...');
            await syncCartToSupabase(userId);
            return;
        }
        
        // Bandingkan item satu per satu
        let mismatchFound = false;
        
        for (const localItem of localItems) {
            const supabaseItem = supabaseItems.find(item => item.product_id === localItem.id);
            
            if (!supabaseItem) {
                console.warn('Item in localStorage not found in Supabase:', localItem.id, localItem.name);
                mismatchFound = true;
                continue;
            }
            
            if (supabaseItem.quantity !== localItem.quantity) {
                console.warn('Quantity mismatch for item', localItem.id, localItem.name, '- Supabase:', supabaseItem.quantity, 'localStorage:', localItem.quantity);
                mismatchFound = true;
            }
        }
        
        if (mismatchFound) {
            // Sinkronkan ulang
            console.log('Mismatches found, re-syncing cart data...');
            await syncCartToSupabase(userId);
        } else {
            console.log('Cart data integrity test passed!');
        }
        
        console.log('=== CART DATA INTEGRITY TEST COMPLETED ===');
    } catch (error) {
        console.error('Error testing cart data integrity:', error);
    }
}

// Export untuk module
export { 
    addToCart, 
    removeFromCart, 
    updateQuantity,
    increaseQuantity,
    decreaseQuantity, 
    openCart, 
    closeCart, 
    renderCartItems, 
    loadCartFromStorage, 
    setupCartEventListeners,
    checkout,
    clearCart,
    testCartDataIntegrity
};