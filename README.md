# 🎨 Catalis Creative - Creative Product Marketplace

<div align="center">

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://catalist-omega.vercel.app)
[![Vercel Deployment](https://img.shields.io/badge/vercel-deployed-black.svg)](https://catalist-omega.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Modern marketplace platform untuk produk kreatif Indonesia dengan integrasi payment gateway Midtrans**

[Live Demo](https://catalist-omega.vercel.app) • [Admin Panel](https://catalis-admin.vercel.app) • [Documentation](DEPLOYMENT-GUIDE.md)

</div>

---

## 📖 Tentang Catalis

Catalis Creative adalah platform marketplace modern yang dirancang khusus untuk para kreator Indonesia. Platform ini memungkinkan kreator untuk menjual produk kreatif mereka dengan sistem pembayaran terintegrasi menggunakan Midtrans.

### ✨ Fitur Utama

- 🤖 **AI Chatbot Assistant** - Chatbot pintar powered by Google Gemini AI untuk bantuan customer 24/7
- 🛒 **Product Catalog** - Tampilan produk yang menarik dengan kategori terstruktur
- 💳 **Payment Gateway** - Integrasi lengkap dengan Midtrans (Credit Card, E-Wallet, Bank Transfer)
- 👨‍💼 **Admin Dashboard** - Panel admin untuk mengelola produk, order, dan user
- 📱 **Responsive Design** - Tampilan optimal di semua perangkat (mobile, tablet, desktop)
- ⚡ **Serverless Backend** - Backend API yang scalable dengan Vercel Functions
- 🔐 **Secure Authentication** - Auth system dengan Supabase
- 📊 **Order Management** - Sistem tracking pesanan real-time
- 🎯 **User Profiles** - Profil lengkap untuk pembeli dan penjual

---

## 🚀 Tech Stack

### Frontend
- **HTML5/CSS3/JavaScript** - Core web technologies
- **Vanilla JS** - Lightweight dan performant
- **Google Gemini AI** - Intelligent chatbot assistant
- **Midtrans Snap** - Payment popup integration
- **Supabase Client** - Real-time database

### Backend
- **Node.js + Express** - REST API server
- **Vercel Serverless** - Cloud functions deployment
- **Midtrans API** - Payment processing
- **Supabase** - PostgreSQL database with real-time features

### Admin Panel
- **React** - Modern UI framework
- **Supabase Auth** - Authentication system
- **React Router** - SPA routing

### DevOps
- **Vercel** - Continuous deployment
- **Git** - Version control
- **GitHub Actions** - CI/CD (optional)

---

## 🌐 Live Deployment

| Service | URL | Status |
|---------|-----|--------|
| **Main App** | [catalist-omega.vercel.app](https://catalist-omega.vercel.app) | ✅ Live |
| **Admin Panel** | [catalis-admin.vercel.app](https://catalis-admin.vercel.app) | ✅ Live |
| **API Backend** | `https://catalist-omega.vercel.app/api` | ✅ Live |
| **Domain** | [www.catalis.fun](https://www.catalis.fun) | ✅ Live |

---

## 📦 Quick Start

### Prerequisites

- Node.js 18+ dan npm
- Akun Vercel (gratis)
- Akun Supabase (gratis)
- Akun Midtrans Sandbox (gratis)

### Installation

1. **Clone repository**
   ```bash
   git clone https://github.com/Naufalspurnomo/catalis.git
   cd catalis
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd admin && npm install && cd ..
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` dengan kredensial Anda:**
   ```env
   NODE_ENV=development
   SUPABASE_URL=your-supabase-url
   SUPABASE_KEY=your-supabase-anon-key
   MIDTRANS_SERVER_KEY=your-midtrans-server-key
   MIDTRANS_CLIENT_KEY=your-midtrans-client-key
   MIDTRANS_MERCHANT_ID=your-merchant-id
   MIDTRANS_IS_PRODUCTION=false
   ```

5. **Jalankan development server**
   ```bash
   # Terminal 1: Backend
   npm start

   # Terminal 2: Frontend
   npx http-server -p 8080
   ```

6. **Buka aplikasi**
   - Frontend: `http://localhost:8080`
   - Backend API: `http://localhost:3001`

---

## 🚢 Deployment to Vercel

### Full Online Deployment (Frontend + Backend)

Ikuti panduan lengkap di **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** untuk deploy aplikasi secara **full online** tanpa perlu running local server.

**Quick Deploy:**

1. **Push ke GitHub**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. **Import project di Vercel**
   - Buka [Vercel Dashboard](https://vercel.com/new)
   - Import repository GitHub Anda
   - Configure project dengan root directory: `.` (root)

3. **Set environment variables di Vercel Dashboard**
   - Masuk ke `Settings → Environment Variables`
   - Tambahkan semua variabel dari `.env.example`

4. **Deploy!**
   - Vercel akan otomatis build & deploy
   - Frontend dan Backend akan online dalam ~2-3 menit

**Admin Panel Deployment:**

Untuk deploy admin panel secara terpisah, ikuti [admin/DEPLOY.md](admin/DEPLOY.md)

---

## 📚 Documentation

- **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** - Panduan lengkap deployment production
- **[admin/DEPLOY.md](admin/DEPLOY.md)** - Panduan deploy admin panel
- **[TESTING.md](TESTING.md)** - Testing guide dan flow pembayaran
- **[SUPABASE-QUICKSTART.md](SUPABASE-QUICKSTART.md)** - Setup database Supabase

---

## 🏗️ Project Structure

```
catalis/
├── api/
│   └── midtrans-callback.js    # Backend serverless API
├── admin/                       # React admin panel
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── contexts/           # Auth context
│   │   ├── pages/              # Dashboard pages
│   │   └── lib/                # Supabase client
│   ├── public/
│   └── vercel.json
├── js/
│   ├── midtrans.js             # Payment integration
│   ├── auth.js                 # Authentication logic
│   └── supabase-client.js      # Supabase configuration
├── css/                        # Stylesheets
├── pages/                      # HTML pages
│   ├── about.html
│   ├── shop.html
│   ├── product-detail.html
│   └── payment-success.html
├── vercel.json                 # Vercel configuration
├── package.json                # Dependencies
├── .env.example                # Environment template
└── README.md                   # This file
```

---

## 🔐 Security

- ✅ Environment variables disimpan secara aman di Vercel Dashboard
- ✅ Credentials tidak di-commit ke Git (`.gitignore`)
- ✅ CORS configured untuk production
- ✅ Supabase RLS (Row Level Security) enabled
- ✅ Midtrans Sandbox untuk testing yang aman

**⚠️ Catatan:** Jangan pernah commit file `.env` ke repository!

---

## 🧪 Testing Payment

Aplikasi menggunakan **Midtrans Sandbox** untuk testing. Gunakan kartu test berikut:

| Card Type | Card Number | CVV | Exp Date |
|-----------|-------------|-----|----------|
| Success | `4811 1111 1111 1114` | `123` | `01/25` |
| Failure | `4911 1111 1111 1113` | `123` | `01/25` |

**Test Flow:**
1. Buka website → Pilih produk → Klik "Buy Now"
2. Isi form checkout dengan data test
3. Klik "Bayar Sekarang"
4. Gunakan kartu test di atas
5. Payment success → Redirect ke payment-success page

---

## 👥 Admin Panel

Admin panel tersedia di [catalis-admin.vercel.app](https://catalis-admin.vercel.app)

**Features:**
- 📊 Dashboard overview
- 🛍️ Product management (CRUD)
- 📦 Order tracking & management
- 👤 User management
- 📈 Sales analytics

**Default Admin Login:**
```
Email: admin@catalis.com
Password: [Setup di Supabase]
```

Lihat [admin/DEPLOY.md](admin/DEPLOY.md) untuk cara setup admin user.

---

## 🤝 Contributing

Kontribusi sangat welcome! Jika ingin berkontribusi:

1. Fork repository ini
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 Development Roadmap

- [ ] User registration & login
- [ ] Wishlist functionality
- [ ] Product reviews & ratings
- [ ] Search & filter produk
- [ ] Multiple product images
- [ ] Email notifications
- [ ] Payment history
- [ ] Seller dashboard
- [ ] Analytics & reporting
- [ ] Mobile app (React Native)

---

## 🐛 Known Issues

Lihat [Issues](https://github.com/yourusername/catalis/issues) untuk bug reports dan feature requests.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Catalis Team**

- Website: [www.catalis.fun](https://www.catalis.fun)


---

## 🙏 Acknowledgments

- [Midtrans](https://midtrans.com) - Payment gateway Indonesia
- [Supabase](https://supabase.com) - Open source Firebase alternative
- [Vercel](https://vercel.com) - Deployment platform
- [React](https://reactjs.org) - UI framework untuk admin panel

---

## 📞 Support

Butuh bantuan?

- 📧 Email: support@catalis.fun
- 💬 GitHub Issues: [Create an issue](https://github.com/yourusername/catalis/issues)
- 📖 Documentation: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ by Catalis Team

</div>
