// footer.js - Injects a modern, consistent footer across pages and adds Back-to-Top

function insertFooter() {
  try {
    let container = document.getElementById('footer-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'footer-container';
      document.body.appendChild(container);
    }

    const year = new Date().getFullYear();
    container.innerHTML = `
      <footer class="w-full bg-gray-900 text-white pt-12 pb-32 sm:pb-12 mt-16" style="padding-bottom: calc(env(safe-area-inset-bottom) + 6rem);">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div class="flex items-center mb-4">
                <img src="logo.png" alt="Catalist Creative Logo" class="h-10 w-auto mr-3" />
                <span class="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Catalist Creative</span>
              </div>
              <p class="text-gray-400">Mengubah ide menjadi pengalaman digital yang luar biasa. Marketplace kreatif untuk berkarya dan bertransaksi.</p>
            </div>
            <div>
              <h4 class="font-bold text-lg mb-4">Navigasi</h4>
              <ul class="space-y-2">
                <li><a href="index.html" class="text-gray-400 hover:text-primary transition">Home</a></li>
                <li><a href="marketplace.html" class="text-gray-400 hover:text-primary transition">Produk & Layanan</a></li>
                <li><a href="about.html" class="text-gray-400 hover:text-primary transition">Tentang Kami</a></li>
                <li><a href="contact.html" class="text-gray-400 hover:text-primary transition">Kontak</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-bold text-lg mb-4">Kontak</h4>
              <ul class="space-y-2">
                <li class="flex items-center text-gray-300">
                  <i data-feather="map-pin" class="w-4 h-4 mr-2"></i>
                  Jakarta, Indonesia
                </li>
                <li class="flex items-center text-gray-300">
                  <i data-feather="phone" class="w-4 h-4 mr-2"></i>
                  +62 21 1234 5678
                </li>
                <li class="flex items-center text-gray-300">
                  <i data-feather="mail" class="w-4 h-4 mr-2"></i>
                  hello@catalistcreative.com
                </li>
              </ul>
            </div>
            <div>
              <h4 class="font-bold text-lg mb-4">Ikuti Kami</h4>
              <div class="flex space-x-4 mb-4">
                <a href="#" class="text-gray-400 hover:text-primary transition"><i data-feather="twitter"></i></a>
                <a href="#" class="text-gray-400 hover:text-primary transition"><i data-feather="instagram"></i></a>
                <a href="#" class="text-gray-400 hover:text-primary transition"><i data-feather="facebook"></i></a>
                <a href="#" class="text-gray-400 hover:text-primary transition"><i data-feather="linkedin"></i></a>
              </div>
              <form id="newsletter-form" class="flex flex-col sm:flex-row gap-2">
                <input type="email" id="newsletter-email" placeholder="Email Anda" class="min-w-0 flex-1 px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary" required />
                <button class="w-full sm:w-auto px-4 py-2 rounded-md bg-primary text-dark hover:bg-primary-dark transition">Berlangganan</button>
              </form>
              <div id="newsletter-msg" class="text-xs text-gray-400 mt-2"></div>
            </div>
          </div>
          <div class="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row gap-4 md:gap-0 md:items-center md:justify-between">
            <div class="text-gray-400">&copy; ${year} Catalist Creative. All rights reserved.</div>
            <div class="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
              <a href="privacy.html" class="text-gray-400 hover:text-primary transition">Kebijakan Privasi</a>
              <a href="terms.html" class="text-gray-400 hover:text-primary transition">Syarat & Ketentuan</a>
              <span class="inline-flex items-center gap-2 text-gray-400">
                <i data-feather="shield" class="w-4 h-4"></i>
                Secure Checkout
              </span>
              <span class="text-gray-400 w-full sm:w-auto mt-2 sm:mt-0">Operasional: Senin–Jumat 09:00–18:00</span>
            </div>
          </div>
        </div>
      </footer>
    `;

    if (typeof feather !== 'undefined') feather.replace();
    setupBackToTop();
    setupNewsletter();
  } catch (e) {
    console.error('Failed to insert footer:', e);
  }
}

function setupBackToTop() {
  let btn = document.getElementById('back-to-top');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.title = 'Back to Top';
    btn.className = 'hidden fixed bottom-6 right-6 z-50 bg-secondary text-white rounded-full p-3 shadow-lg hover:bg-secondary/90 transition';
    btn.innerHTML = '<i data-feather="arrow-up" class="w-5 h-5"></i>';
    document.body.appendChild(btn);
    if (typeof feather !== 'undefined') feather.replace();
  }
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) btn.classList.remove('hidden');
    else btn.classList.add('hidden');
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function setupNewsletter() {
  const form = document.getElementById('newsletter-form');
  const input = document.getElementById('newsletter-email');
  const msg = document.getElementById('newsletter-msg');
  if (!form || !input) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email) return;
    try {
      msg.textContent = 'Mendaftar...';
      await new Promise(r => setTimeout(r, 600));
      msg.textContent = 'Berhasil berlangganan!';
      input.value = '';
    } catch (err) {
      msg.textContent = 'Gagal mendaftar. Coba lagi.';
    }
  });
}

document.addEventListener('DOMContentLoaded', insertFooter);
