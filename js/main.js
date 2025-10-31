// main.js - Script utama untuk halaman
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Load cart sidebar
    const cartSidebarContainer = document.getElementById('cart-sidebar-container');
    if (cartSidebarContainer) {
        fetch('cart-sidebar.html')
            .then(response => response.text())
            .then(html => {
                cartSidebarContainer.innerHTML = html;
                
                // Berikan waktu untuk DOM dirender
                setTimeout(() => {
                    // Setup cart event listeners setelah sidebar dimuat
                    if (typeof window.setupCartEventListeners === 'function') {
                        window.setupCartEventListeners();
                    }
                    
                    // Memastikan keranjang dirender setelah sidebar dimuat
                    if (typeof window.loadCartFromStorage === 'function') {
                        window.loadCartFromStorage();
                        if (typeof window.renderCartItems === 'function') {
                            window.renderCartItems();
                        }
                    }
                }, 100); // Delay 100ms untuk memastikan DOM sudah dirender
            })
            .catch(error => console.error('Error loading cart sidebar:', error));
    }
    
    // Inisialisasi feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Inisialisasi AOS (Animate on Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });
    }
});

// Expose fungsi untuk global scope
window.formatPrice = function(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};