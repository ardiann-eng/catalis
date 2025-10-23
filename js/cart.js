document.addEventListener('DOMContentLoaded', () => {
    const shoppingCart = document.getElementById('shopping-cart');
    const cartCount = document.getElementById('cart-count');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const closeCartButton = document.getElementById('close-cart');

    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // Function to open the cart
    function openCart() {
        shoppingCart.classList.remove('hidden');
    }

    // Function to close the cart
    function closeCart() {
        shoppingCart.classList.add('hidden');
    }

    // Function to update the cart
    function updateCart() {
        cartItemsContainer.innerHTML = '';
        let total = 0;
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'flex justify-between items-center mb-4';
            cartItem.innerHTML = `
                <div class="flex items-center">
                    <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-md mr-4">
                    <div>
                        <h3 class="text-sm font-semibold text-gray-800">${item.name}</h3>
                        <p class="text-xs text-gray-500">Rp ${item.price.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div class="flex items-center">
                    <input type="number" min="1" value="${item.quantity}" data-id="${item.id}" class="w-16 text-center border rounded-md p-1 quantity-input">
                    <button data-id="${item.id}" class="text-red-500 hover:text-red-700 ml-2 remove-item">
                        <i data-feather="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItem);
            total += item.price * item.quantity;
        });

        cartTotal.textContent = `Rp ${total.toLocaleString('id-ID')}`;
        cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
        localStorage.setItem('cart', JSON.stringify(cart));
        feather.replace();
    }

    // Function to add a product to the cart
    function addToCart(product) {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        updateCart();
        showFeedback(product.name);
    }

    // Function to show feedback
    function showFeedback(productName) {
        const feedback = document.createElement('div');
        feedback.className = 'fixed bottom-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg';
        feedback.textContent = `${productName} berhasil ditambahkan ke keranjang!`;
        document.body.appendChild(feedback);
        setTimeout(() => {
            feedback.remove();
        }, 3000);
    }

    // Event listener for adding to cart
    document.getElementById('product-grid').addEventListener('click', e => {
        if (e.target.closest('.add-to-cart-btn')) {
            const button = e.target.closest('.add-to-cart-btn');
            const card = button.closest('.group');
            const product = {
                id: card.querySelector('h3').textContent,
                name: card.querySelector('h3').textContent,
                price: parseFloat(card.querySelector('.text-lg.font-bold').textContent.replace(/[^0-9,-]+/g,"").replace(",", ".")),
                image: card.querySelector('img').src,
            };
            addToCart(product);
        }
    });

    // Event listeners for cart actions
    if (shoppingCart) {
        shoppingCart.addEventListener('click', e => {
            if (e.target.closest('.remove-item')) {
                const id = e.target.closest('.remove-item').dataset.id;
                cart = cart.filter(item => item.id !== id);
                updateCart();
            }
        });

        shoppingCart.addEventListener('change', e => {
            if (e.target.classList.contains('quantity-input')) {
                const id = e.target.dataset.id;
                const quantity = parseInt(e.target.value);
                const item = cart.find(item => item.id === id);
                if (item && quantity > 0) {
                    item.quantity = quantity;
                    updateCart();
                } else if (item && quantity <= 0) {
                    cart = cart.filter(item => item.id !== id);
                    updateCart();
                }
            }
        });

        if (closeCartButton) {
            closeCartButton.addEventListener('click', closeCart);
        }
    }

    // Initial cart update
    updateCart();

    // Expose functions to global scope
    window.openCart = openCart;
});