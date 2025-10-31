// checkout.js - Menangani proses checkout multi-tahap
import { supabase } from './supabase.js';
import { checkoutWithMidtrans } from './midtrans.js';



// State untuk menyimpan data checkout
let checkoutData = {
    // Data pengiriman
    shipping: {
        fullname: '',
        email: '',
        phone: '',
        address: '',
        postalCode: '',
        province: '',
        city: '',
        district: '',
        notes: ''
    },
    // Data pembayaran
    payment: {
        method: '',
        details: {}
    },
    // Data pesanan
    order: {
        items: [],
        subtotal: 0,
        shippingCost: 0,
        tax: 0,
        total: 0,
        orderNumber: '',
        orderDate: ''
    }
};

// Konstanta untuk tahapan checkout
const CHECKOUT_STEPS = {
    SHIPPING: 1,
    PAYMENT: 2,
    CONFIRMATION: 3
};

// Variabel untuk menyimpan tahap checkout saat ini
let currentStep = CHECKOUT_STEPS.SHIPPING;

// Inisialisasi halaman checkout
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Cek apakah user sudah login
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // Redirect ke halaman login jika belum login
            window.location.href = 'login.html?redirect=checkout.html';
            return;
        }
        
        // Load data cart dari localStorage
        loadCartItems();
        
        // Load data user dari Supabase
        await loadUserData(user.id);
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup form validation
        setupFormValidation();
        
    } catch (error) {
        console.error('Error initializing checkout:', error);
        showNotification('Terjadi kesalahan saat memuat halaman checkout', 'error');
    }
});

// Fungsi untuk memuat item dari cart
async function loadCartItems() {
    try {
        // Cek apakah ada cart_id dari sessionStorage (dikirim dari halaman cart)
        const cartId = sessionStorage.getItem('checkout_cart_id');
        
        // Cek apakah user sudah login
        const { data: { session } } = await supabase.auth.getSession();
        
        let cartItems = [];
        
        if (session && session.user && cartId) {
            // User login dan ada cart_id, ambil dari Supabase
            console.log('Loading cart items from Supabase...');
            
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
                console.error('Error fetching cart items from Supabase:', itemsError);
                // Fallback ke localStorage
                cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
            } else if (cartItemsData && cartItemsData.length > 0) {
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
                
                console.log('Cart items loaded from Supabase:', cartItems);
            } else {
                // Tidak ada item di Supabase, coba dari localStorage
                console.log('No items found in Supabase, trying localStorage...');
                cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
            }
        } else {
            // User belum login atau tidak ada cart_id, ambil dari localStorage
            console.log('Loading cart items from localStorage...');
            cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
        }
        
        if (cartItems.length === 0) {
            // Redirect ke halaman marketplace jika cart kosong
            window.location.href = 'marketplace.html';
            return;
        }
        
        // Simpan item ke state
        checkoutData.order.items = cartItems;
        
        // Hitung subtotal
        checkoutData.order.subtotal = cartItems.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
        
        // Hitung pajak (11% dari subtotal)
        checkoutData.order.tax = Math.round(checkoutData.order.subtotal * 0.11);
        
        // Hitung total
        updateOrderTotal();
        
        // Render item di ringkasan pesanan
        renderOrderSummary();
        
    } catch (error) {
        console.error('Error loading cart items:', error);
        showNotification('Gagal memuat item keranjang', 'error');
    }
}

// Fungsi untuk memuat data user dari Supabase
async function loadUserData(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error) throw error;
        
        if (data) {
            // Pre-fill form dengan data user
            const fullnameInput = document.getElementById('fullname');
            const emailInput = document.getElementById('email');
            const phoneInput = document.getElementById('phone');
            const addressInput = document.getElementById('address');
            
            if (fullnameInput) fullnameInput.value = data.full_name || '';
            if (emailInput) emailInput.value = data.email || '';
            if (phoneInput) phoneInput.value = data.phone || '';
            if (addressInput) addressInput.value = data.address || '';
            
            // Update state
            checkoutData.shipping.fullname = data.full_name || '';
            checkoutData.shipping.email = data.email || '';
            checkoutData.shipping.phone = data.phone || '';
            checkoutData.shipping.address = data.address || '';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Fungsi untuk setup event listeners
function setupEventListeners() {
    // Form pengiriman
    const shippingForm = document.getElementById('shipping-form');
    if (shippingForm) {
        shippingForm.addEventListener('submit', handleShippingFormSubmit);
    }
    
    // Tombol kembali ke pengiriman
    const backToShippingBtn = document.getElementById('back-to-shipping');
    if (backToShippingBtn) {
        backToShippingBtn.addEventListener('click', () => {
            goToStep(CHECKOUT_STEPS.SHIPPING);
        });
    }
    
    // Tombol Bayar Sekarang dengan Midtrans
    const payWithMidtransBtn = document.getElementById('pay-with-midtrans');
    if (payWithMidtransBtn) {
        payWithMidtransBtn.addEventListener('click', handleMidtransPayment);
    }
    
    // Event listener untuk dropdown provinsi, kota, kecamatan
    setupLocationDropdowns();
}

// Fungsi untuk setup dropdown lokasi
function setupLocationDropdowns() {
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');
    
    if (provinceSelect) {
        // Load data provinsi
        loadProvinces(provinceSelect);
        
        // Event listener untuk perubahan provinsi
        provinceSelect.addEventListener('change', () => {
            const provinceId = provinceSelect.value;
            checkoutData.shipping.province = provinceSelect.options[provinceSelect.selectedIndex].text;
            
            // Reset dan disable dropdown kota dan kecamatan
            resetSelect(citySelect);
            resetSelect(districtSelect, true);
            
            if (provinceId) {
                // Enable dropdown kota
                citySelect.disabled = false;
                
                // Load data kota berdasarkan provinsi
                loadCities(citySelect, provinceId);
            }
        });
    }
    
    if (citySelect) {
        // Event listener untuk perubahan kota
        citySelect.addEventListener('change', () => {
            const cityId = citySelect.value;
            checkoutData.shipping.city = citySelect.options[citySelect.selectedIndex].text;
            
            // Reset dan disable dropdown kecamatan
            resetSelect(districtSelect);
            
            if (cityId) {
                // Enable dropdown kecamatan
                districtSelect.disabled = false;
                
                // Load data kecamatan berdasarkan kota
                loadDistricts(districtSelect, cityId);
            }
        });
    }
    
    if (districtSelect) {
        // Event listener untuk perubahan kecamatan
        districtSelect.addEventListener('change', () => {
            checkoutData.shipping.district = districtSelect.options[districtSelect.selectedIndex].text;
            
            // Hitung ongkos kirim berdasarkan lokasi
            calculateShippingCost();
        });
    }
}

// Fungsi untuk reset dropdown
function resetSelect(select, disable = false) {
    if (!select) return;
    
    // Hapus semua opsi kecuali opsi default
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Reset ke opsi default
    select.selectedIndex = 0;
    
    // Disable jika diperlukan
    if (disable) {
        select.disabled = true;
    }
}

// Fungsi untuk load data provinsi
async function loadProvinces(select) {
    try {
        // Simulasi data provinsi (dalam implementasi nyata, ambil dari API atau Supabase)
        const provinces = [
            { id: 1, name: 'DKI Jakarta' },
            { id: 2, name: 'Jawa Barat' },
            { id: 3, name: 'Jawa Tengah' },
            { id: 4, name: 'Jawa Timur' },
            { id: 5, name: 'Bali' }
        ];
        
        // Tambahkan opsi ke dropdown
        provinces.forEach(province => {
            const option = document.createElement('option');
            option.value = province.id;
            option.textContent = province.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading provinces:', error);
    }
}

// Fungsi untuk load data kota
async function loadCities(select, provinceId) {
    try {
        // Simulasi data kota (dalam implementasi nyata, ambil dari API atau Supabase)
        const citiesByProvince = {
            1: [
                { id: 101, name: 'Jakarta Pusat' },
                { id: 102, name: 'Jakarta Utara' },
                { id: 103, name: 'Jakarta Barat' },
                { id: 104, name: 'Jakarta Selatan' },
                { id: 105, name: 'Jakarta Timur' }
            ],
            2: [
                { id: 201, name: 'Bandung' },
                { id: 202, name: 'Bekasi' },
                { id: 203, name: 'Bogor' },
                { id: 204, name: 'Depok' },
                { id: 205, name: 'Cimahi' }
            ],
            // Data kota lainnya...
        };
        
        const cities = citiesByProvince[provinceId] || [];
        
        // Tambahkan opsi ke dropdown
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city.id;
            option.textContent = city.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading cities:', error);
    }
}

// Fungsi untuk load data kecamatan
async function loadDistricts(select, cityId) {
    try {
        // Simulasi data kecamatan (dalam implementasi nyata, ambil dari API atau Supabase)
        const districtsByCity = {
            101: [
                { id: 1001, name: 'Gambir' },
                { id: 1002, name: 'Tanah Abang' },
                { id: 1003, name: 'Menteng' }
            ],
            102: [
                { id: 1004, name: 'Pademangan' },
                { id: 1005, name: 'Tanjung Priok' },
                { id: 1006, name: 'Koja' }
            ],
            // Data kecamatan lainnya...
        };
        
        const districts = districtsByCity[cityId] || [];
        
        // Tambahkan opsi ke dropdown
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district.id;
            option.textContent = district.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading districts:', error);
    }
}

// Fungsi untuk menghitung ongkos kirim
function calculateShippingCost() {
    // Simulasi perhitungan ongkos kirim berdasarkan lokasi
    // Dalam implementasi nyata, gunakan API pengiriman atau formula yang sesuai
    
    const subtotal = checkoutData.order.subtotal;
    let shippingCost = 0;
    
    if (checkoutData.shipping.province && checkoutData.shipping.city) {
        if (checkoutData.shipping.province.includes('Jakarta')) {
            shippingCost = 10000; // Rp 10.000 untuk Jakarta
        } else if (checkoutData.shipping.province.includes('Jawa')) {
            shippingCost = 20000; // Rp 20.000 untuk Jawa
        } else {
            shippingCost = 30000; // Rp 30.000 untuk luar Jawa
        }
        
        // Gratis ongkir untuk pembelian di atas Rp 500.000
        if (subtotal >= 500000) {
            shippingCost = 0;
        }
    }
    
    // Update state
    checkoutData.order.shippingCost = shippingCost;
    
    // Update total
    updateOrderTotal();
    
    // Update tampilan
    const shippingCostElement = document.getElementById('shipping-cost');
    if (shippingCostElement) {
        shippingCostElement.textContent = `Rp ${formatPrice(shippingCost)}`;
    }
}

// Fungsi untuk update total pesanan
function updateOrderTotal() {
    const subtotal = checkoutData.order.subtotal;
    const shippingCost = checkoutData.order.shippingCost;
    const tax = checkoutData.order.tax;
    
    // Hitung total
    const total = subtotal + shippingCost + tax;
    checkoutData.order.total = total;
    
    // Update tampilan
    const totalElement = document.getElementById('total');
    if (totalElement) {
        totalElement.textContent = `Rp ${formatPrice(total)}`;
    }
}

// Fungsi untuk render ringkasan pesanan
function renderOrderSummary() {
    const orderItemsContainer = document.getElementById('order-items');
    const subtotalElement = document.getElementById('subtotal');
    const taxElement = document.getElementById('tax');
    
    if (!orderItemsContainer || !subtotalElement || !taxElement) return;
    
    // Render item
    orderItemsContainer.innerHTML = checkoutData.order.items.map(item => `
        <div class="flex items-start space-x-3">
            <div class="flex-shrink-0">
                <img src="${item.image_url || 'https://via.placeholder.com/60x60?text=No+Image'}" 
                     alt="${item.name}" 
                     class="w-12 h-12 object-cover rounded-md">
            </div>
            <div class="flex-1">
                <h4 class="text-sm font-medium">${item.name}</h4>
                <p class="text-xs text-gray-500">${item.quantity} x Rp ${formatPrice(item.price)}</p>
            </div>
            <div class="text-right">
                <span class="font-medium">Rp ${formatPrice(item.price * item.quantity)}</span>
            </div>
        </div>
    `).join('');
    
    // Update subtotal dan pajak
    subtotalElement.textContent = `Rp ${formatPrice(checkoutData.order.subtotal)}`;
    taxElement.textContent = `Rp ${formatPrice(checkoutData.order.tax)}`;
}

// Fungsi untuk setup validasi form
function setupFormValidation() {
    // Validasi untuk form pengiriman
    const shippingForm = document.getElementById('shipping-form');
    if (shippingForm) {
        const inputs = shippingForm.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.hasAttribute('required')) {
                // Validasi saat blur (focus keluar dari input)
                input.addEventListener('blur', () => {
                    validateInput(input);
                });
                
                // Validasi saat input (real-time)
                input.addEventListener('input', () => {
                    validateInput(input);
                });
            }
        });
    }
}

// Fungsi untuk validasi input
function validateInput(input) {
    const errorElement = document.getElementById(`${input.id}-error`);
    if (!errorElement) return;
    
    let isValid = true;
    let errorMessage = '';
    
    // Validasi berdasarkan tipe input
    if (input.value.trim() === '') {
        isValid = false;
        errorMessage = 'Bidang ini wajib diisi';
    } else {
        switch (input.type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    isValid = false;
                    errorMessage = 'Format email tidak valid';
                }
                break;
                
            case 'tel':
                const phoneRegex = /^[0-9]{10,15}$/;
                if (!phoneRegex.test(input.value.replace(/\D/g, ''))) {
                    isValid = false;
                    errorMessage = 'Format nomor telepon tidak valid';
                }
                break;
                
            case 'text':
                if (input.id === 'postal-code') {
                    const postalCodeRegex = /^[0-9]{5}$/;
                    if (!postalCodeRegex.test(input.value)) {
                        isValid = false;
                        errorMessage = 'Kode pos harus 5 digit angka';
                    }
                }
                break;
        }
    }
    
    // Update tampilan berdasarkan validasi
    if (isValid) {
        input.classList.remove('error');
        errorElement.textContent = '';
    } else {
        input.classList.add('error');
        errorElement.textContent = errorMessage;
    }
    
    return isValid;
}

// Fungsi untuk validasi form pengiriman
function validateShippingForm() {
    const shippingForm = document.getElementById('shipping-form');
    if (!shippingForm) return false;
    
    const inputs = shippingForm.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    inputs.forEach(input => {
        if (input.hasAttribute('required')) {
            const inputValid = validateInput(input);
            isValid = isValid && inputValid;
        }
    });
    
    return isValid;
}

// Handler untuk submit form pengiriman
function handleShippingFormSubmit(event) {
    event.preventDefault();
    
    // Validasi form
    if (!validateShippingForm()) {
        showNotification('Harap lengkapi semua bidang yang wajib diisi', 'error');
        return;
    }
    
    // Update state dengan data form
    const formData = new FormData(event.target);
    for (const [key, value] of formData.entries()) {
        checkoutData.shipping[key] = value;
    }
    
    // Hitung ongkos kirim
    calculateShippingCost();
    
    // Pindah ke tahap pembayaran
    goToStep(CHECKOUT_STEPS.PAYMENT);
}

// Handler untuk pembayaran dengan Midtrans
async function handleMidtransPayment() {
    try {
        // Validasi data checkout sebelum memproses
        if (!validateCheckoutData()) {
            showNotification('Data checkout tidak lengkap. Silakan lengkapi semua data yang diperlukan.', 'error');
            return;
        }
        
        // Tampilkan loading
        showLoading(true);
        
        // Generate order ID yang unik
        const orderId = generateUUID();
        
        // Set metode pembayaran ke Midtrans
        checkoutData.payment.method = 'midtrans';
        checkoutData.order.orderNumber = orderId;
        checkoutData.order.orderDate = new Date().toISOString();
        
        console.log('Memulai proses pembayaran dengan Midtrans...');
        console.log('Order ID:', orderId);
        console.log('Checkout Data:', JSON.stringify(checkoutData));
        
        // Mulai proses pembayaran dengan Midtrans
        const result = await checkoutWithMidtrans(checkoutData);
        
        console.log('Hasil pembayaran Midtrans:', result);
        
        // Proses hasil pembayaran
        if (result.status === 'success' || result.status === 'pending') {
            // Pembayaran berhasil atau pending, tampilkan konfirmasi
            showNotification('Pembayaran sedang diproses', 'info');
            
            // Kosongkan keranjang
            localStorage.removeItem('cartItems');
            
            // Simpan riwayat pembayaran
            await savePaymentHistory(orderId, result);
            
            // Jika pembayaran berhasil, pindah ke tahap konfirmasi
            if (result.status === 'success') {
                goToStep(CHECKOUT_STEPS.CONFIRMATION);
                renderConfirmationDetails();
            } else {
                // Jika pending, tampilkan halaman konfirmasi dengan status pending
                goToStep(CHECKOUT_STEPS.CONFIRMATION);
                renderConfirmationDetails('pending');
            }
        } else if (result.status === 'closed') {
            // Pengguna menutup popup Midtrans
            showNotification('Pembayaran dibatalkan', 'warning');
        } else {
            // Pembayaran gagal
            showNotification('Pembayaran gagal: ' + (result.message || 'Terjadi kesalahan'), 'error');
        }
        
        // Sembunyikan loading
        showLoading(false);
    } catch (error) {
        console.error('Error saat memproses pembayaran:', error);
        showNotification('Gagal memproses pembayaran: ' + error.message, 'error');
        showLoading(false);
    }
}

// Fungsi untuk menyimpan riwayat pembayaran
async function savePaymentHistory(orderId, paymentResult) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User tidak ditemukan');
        
        // Siapkan data riwayat pembayaran
        const paymentData = {
            order_id: orderId,
            payment_method: checkoutData.payment.method,
            amount: checkoutData.order.total,
            status: paymentResult.status,
            payment_details: JSON.stringify(paymentResult.data || {}),
            transaction_id: paymentResult.data?.transaction_id || orderId
        };
        
        console.log('Saving payment history:', paymentData);
        
        // Simpan riwayat pembayaran ke Supabase
        const { error } = await supabase
            .from('payment_history')
            .insert(paymentData);
            
        if (error) {
            console.error('Error saving payment history:', error);
        } else {
            console.log('Payment history saved successfully');
        }
    } catch (error) {
        console.error('Error saving payment history:', error);
    }
}

// Fungsi untuk generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Fungsi untuk validasi data checkout
function validateCheckoutData() {
    // Validasi data pengiriman
    if (!checkoutData.shipping.fullname || 
        !checkoutData.shipping.email || 
        !checkoutData.shipping.phone || 
        !checkoutData.shipping.address || 
        !checkoutData.shipping.postalCode || 
        !checkoutData.shipping.province || 
        !checkoutData.shipping.city || 
        !checkoutData.shipping.district) {
        console.error('Data pengiriman tidak lengkap:', checkoutData.shipping);
        return false;
    }
    
    // Validasi data pesanan
    if (!checkoutData.order.items || checkoutData.order.items.length === 0) {
        console.error('Keranjang belanja kosong');
        return false;
    }
    
    // Validasi total pesanan
    if (checkoutData.order.total <= 0) {
        console.error('Total pesanan tidak valid:', checkoutData.order.total);
        return false;
    }
    
    return true;
}

// Fungsi untuk menyimpan pesanan ke Supabase
async function saveOrder() {
    try {
        // Tampilkan loading
        showLoading(true);
        
        // Dapatkan user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User tidak ditemukan');
        
        // Generate nomor pesanan
        const orderNumber = generateOrderNumber();
        const orderDate = new Date();
        
        // Update state
        checkoutData.order.orderNumber = orderNumber;
        checkoutData.order.orderDate = orderDate;
        
        // Siapkan data pesanan
        const orderData = {
            order_number: orderNumber,
            user_id: user.id,
            status: 'pending',
            shipping_address: JSON.stringify(checkoutData.shipping),
            payment_method: checkoutData.payment.method,
            subtotal: checkoutData.order.subtotal,
            shipping_cost: checkoutData.order.shippingCost,
            tax: checkoutData.order.tax,
            total_amount: checkoutData.order.total,
            created_at: orderDate,
            updated_at: orderDate
        };
        
        // Simpan pesanan ke Supabase
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();
            
        if (orderError) throw orderError;
        
        // Simpan item pesanan
        const orderItems = checkoutData.order.items.map(item => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
        }));
        
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);
            
        if (itemsError) throw itemsError;
        
        // Kosongkan keranjang di localStorage
        localStorage.removeItem('cartItems');
        
        // Kosongkan keranjang di Supabase jika ada
        const cartId = sessionStorage.getItem('checkout_cart_id');
        if (cartId) {
            console.log('Clearing cart in Supabase after successful order...');
            const { error: clearCartError } = await supabase
                .from('cart_items')
                .delete()
                .eq('cart_id', cartId);
                
            if (clearCartError) {
                console.error('Error clearing cart in Supabase:', clearCartError);
            } else {
                console.log('Cart cleared in Supabase after successful order');
                sessionStorage.removeItem('checkout_cart_id');
            }
        }
        
        // Tampilkan konfirmasi
        showLoading(false);
        goToStep(CHECKOUT_STEPS.CONFIRMATION);
        
        // Render detail konfirmasi
        renderConfirmationDetails();
        
    } catch (error) {
        console.error('Error saving order:', error);
        showLoading(false);
        showNotification('Gagal menyimpan pesanan. Silakan coba lagi.', 'error');
    }
}

// Fungsi untuk render detail konfirmasi
function renderConfirmationDetails(paymentStatus = 'success') {
    // Tampilkan nomor pesanan dan tanggal
    const orderNumberElement = document.getElementById('order-number');
    const orderDateElement = document.getElementById('order-date');
    const paymentStatusTitle = document.getElementById('payment-status-title');
    const paymentStatusMessage = document.getElementById('payment-status-message');
    const paymentStatusIcon = document.getElementById('payment-status-icon');
    
    if (orderNumberElement) {
        orderNumberElement.textContent = checkoutData.order.orderNumber;
    }
    
    if (orderDateElement) {
        const formattedDate = new Date(checkoutData.order.orderDate).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        orderDateElement.textContent = formattedDate;
    }
    
    // Update status pembayaran
    if (paymentStatusTitle) {
        if (paymentStatus === 'success') {
            paymentStatusTitle.textContent = 'Pesanan Berhasil!';
            paymentStatusMessage.textContent = 'Terima kasih telah berbelanja di Catalist Creative.';
            paymentStatusIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            `;
            paymentStatusIcon.className = 'inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4';
        } else if (paymentStatus === 'pending') {
            paymentStatusTitle.textContent = 'Pembayaran Sedang Diproses';
            paymentStatusMessage.textContent = 'Silakan selesaikan pembayaran Anda sesuai instruksi.';
            paymentStatusIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            `;
            paymentStatusIcon.className = 'inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4';
        } else {
            paymentStatusTitle.textContent = 'Pembayaran Gagal';
            paymentStatusMessage.textContent = 'Mohon maaf, pembayaran Anda gagal diproses. Silakan coba lagi.';
            paymentStatusIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            `;
            paymentStatusIcon.className = 'inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4';
        }
    }
    
    // Tampilkan detail pengiriman
    const shippingDetailsElement = document.getElementById('shipping-details');
    if (shippingDetailsElement) {
        shippingDetailsElement.innerHTML = `
            <p class="mb-1">${checkoutData.shipping.fullname}</p>
            <p class="mb-1">${checkoutData.shipping.phone}</p>
            <p class="mb-1">${checkoutData.shipping.email}</p>
            <p class="mb-1">${checkoutData.shipping.address}</p>
            <p>${checkoutData.shipping.district}, ${checkoutData.shipping.city}, ${checkoutData.shipping.province} ${checkoutData.shipping.postalCode}</p>
        `;
    }
    
    // Tampilkan detail status pembayaran
    const paymentStatusDetails = document.getElementById('payment-status-details');
    if (paymentStatusDetails) {
        if (paymentStatus === 'success') {
            paymentStatusDetails.innerHTML = `
                <p class="mb-1">Status: <span class="font-medium text-green-600">Pembayaran Berhasil</span></p>
                <p class="mb-1">Metode Pembayaran: ${checkoutData.payment.method === 'midtrans' ? 'Midtrans' : checkoutData.payment.method}</p>
                <p>Total Pembayaran: Rp ${formatPrice(checkoutData.order.total)}</p>
            `;
        } else if (paymentStatus === 'pending') {
            paymentStatusDetails.innerHTML = `
                <p class="mb-1">Status: <span class="font-medium text-yellow-600">Menunggu Pembayaran</span></p>
                <p class="mb-1">Metode Pembayaran: ${checkoutData.payment.method === 'midtrans' ? 'Midtrans' : checkoutData.payment.method}</p>
                <p>Total Pembayaran: Rp ${formatPrice(checkoutData.order.total)}</p>
            `;
        } else {
            paymentStatusDetails.innerHTML = `
                <p class="mb-1">Status: <span class="font-medium text-red-600">Pembayaran Gagal</span></p>
                <p>Silakan coba lagi atau hubungi customer service kami.</p>
            `;
        }
    }
    
    // Tampilkan instruksi pembayaran
    const paymentInstructionsElement = document.getElementById('payment-instructions');
    if (paymentInstructionsElement) {
        let instructions = '';
        
        if (checkoutData.payment.method === 'midtrans') {
            instructions = `
                <div class="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-4">
                    <div class="flex items-center mb-3">
                        <img src="https://midtrans.com/assets/images/logo-midtrans-color.png" alt="Midtrans" class="h-6 mr-2">
                        <span class="font-medium text-purple-800">Pembayaran via Midtrans</span>
                    </div>
                    <p class="text-sm text-gray-600 mb-2">
                        Pembayaran Anda sedang diproses melalui Midtrans. Anda akan menerima email konfirmasi setelah pembayaran berhasil.
                    </p>
                    <p class="text-sm text-gray-600">
                        Jika Anda belum menyelesaikan pembayaran, silakan klik tombol "Cek Status Pembayaran" di bawah untuk melanjutkan proses pembayaran.
                    </p>
                </div>
                <div class="text-sm text-gray-600">
                    <p class="font-medium mb-2">Detail Pembayaran:</p>
                    <p class="mb-1">Nomor Pesanan: ${checkoutData.order.orderNumber}</p>
                    <p class="mb-1">Total Pembayaran: Rp ${formatPrice(checkoutData.order.total)}</p>
                    <p class="mb-1">Status: <span class="font-medium text-yellow-600">Menunggu Pembayaran</span></p>
                </div>
            `;
        } else {
            instructions = `
                <p>Terima kasih atas pesanan Anda. Tim kami akan menghubungi Anda untuk konfirmasi pembayaran.</p>
            `;
        }
        
        paymentInstructionsElement.innerHTML = instructions;
    }
}

// Fungsi untuk pindah ke tahap tertentu
function goToStep(step) {
    // Update current step
    currentStep = step;
    
    // Sembunyikan semua tahap
    const steps = document.querySelectorAll('.checkout-step');
    steps.forEach(s => s.classList.add('hidden'));
    
    // Tampilkan tahap yang dipilih
    const currentStepElement = document.getElementById(`step-${step}`);
    if (currentStepElement) {
        currentStepElement.classList.remove('hidden');
        
        // Tambahkan animasi
        currentStepElement.classList.add('slide-in');
        setTimeout(() => {
            currentStepElement.classList.remove('slide-in');
        }, 500);
    }
    
    // Update indikator progress
    updateProgressIndicator(step);
    
    // Scroll ke atas
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Fungsi untuk update indikator progress
function updateProgressIndicator(step) {
    // Update step indicators
    const stepIndicators = document.querySelectorAll('.step');
    stepIndicators.forEach(indicator => {
        const indicatorStep = parseInt(indicator.dataset.step);
        
        // Reset classes
        indicator.classList.remove('active', 'completed');
        
        // Add appropriate class
        if (indicatorStep === step) {
            indicator.classList.add('active');
        } else if (indicatorStep < step) {
            indicator.classList.add('completed');
        }
    });
    
    // Update progress bar
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        let progressWidth = '0%';
        
        switch (step) {
            case CHECKOUT_STEPS.SHIPPING:
                progressWidth = '33.33%';
                break;
            case CHECKOUT_STEPS.PAYMENT:
                progressWidth = '66.66%';
                break;
            case CHECKOUT_STEPS.CONFIRMATION:
                progressWidth = '100%';
                break;
        }
        
        progressFill.style.width = progressWidth;
    }
}

// Fungsi untuk generate nomor pesanan
function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `INV/${year}${month}${day}/${random}`;
}

// Fungsi untuk format harga
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'info') {
    // Cek apakah sudah ada notifikasi
    let notification = document.getElementById('checkout-notification');
    
    if (notification) {
        // Update pesan notifikasi yang sudah ada
        notification.textContent = message;
        
        // Reset timer
        clearTimeout(notification.timer);
    } else {
        // Buat notifikasi baru
        notification = document.createElement('div');
        notification.id = 'checkout-notification';
        notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-y-0 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-dark' :
            'bg-blue-500 text-white'
        }`;
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
    }, 5000);
}

// Fungsi untuk menampilkan/menyembunyikan loading
function showLoading(isLoading) {
    // Cek apakah sudah ada loading overlay
    let loadingOverlay = document.getElementById('loading-overlay');
    
    if (isLoading) {
        if (!loadingOverlay) {
            // Buat loading overlay baru
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            loadingOverlay.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-lg text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p class="text-gray-700">Memproses pesanan Anda...</p>
                </div>
            `;
            
            document.body.appendChild(loadingOverlay);
        }
    } else {
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
}

// Export fungsi yang dibutuhkan
export {
    goToStep,
    CHECKOUT_STEPS
};