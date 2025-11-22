#!/bin/bash

# Script untuk testing aplikasi Catalist secara local

echo "🚀 Starting Catalist Testing Environment..."
echo ""

# Warna untuk output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function untuk cleanup saat script dihentikan
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# 1. Start Backend Server (Midtrans Callback)
echo -e "${YELLOW}📦 Starting Backend Server (Port 3001)...${NC}"
npm start &
BACKEND_PID=$!
sleep 2

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✅ Backend server running (PID: $BACKEND_PID)${NC}"
else
    echo "❌ Failed to start backend server"
    exit 1
fi

# 2. Start Frontend Server (Python HTTP Server)
echo -e "${YELLOW}🌐 Starting Frontend Server (Port 8080)...${NC}"
python3 -m http.server 8080 > /dev/null 2>&1 &
FRONTEND_PID=$!
sleep 2

# Check if frontend is running
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✅ Frontend server running (PID: $FRONTEND_PID)${NC}"
else
    echo "❌ Failed to start frontend server"
    kill $BACKEND_PID
    exit 1
fi

echo ""
echo "============================================"
echo "✨ Testing Environment Ready!"
echo "============================================"
echo ""
echo "📱 Frontend: http://localhost:8080"
echo "🔧 Backend:  http://localhost:3001"
echo ""
echo "💡 Testing Steps:"
echo "   1. Buka browser ke http://localhost:8080"
echo "   2. Login/Register sebagai user"
echo "   3. Tambahkan produk ke cart"
echo "   4. Lakukan checkout dengan Midtrans"
echo "   5. Selesaikan pembayaran di Midtrans Sandbox"
echo "   6. Cek Riwayat Pembayaran di profil"
echo ""
echo "🧪 Test Midtrans Sandbox Cards:"
echo "   Card:   4811 1111 1111 1114"
echo "   Expiry: 01/25"
echo "   CVV:    123"
echo ""
echo "Press Ctrl+C to stop all servers..."
echo "============================================"
echo ""

# Keep script running
wait
