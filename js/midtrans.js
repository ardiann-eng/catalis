// midtrans.js - Integrasi Midtrans untuk pembayaran
import { supabase } from "./supabase.js";
import {
  getClientKey,
  getServerKey,
  getMerchantId,
  getBasicAuthHeader,
} from "./midtrans-config.js";

// Variabel untuk menyimpan instance Snap
let snapInstance = null;

// Inisialisasi Midtrans Snap
function initMidtransSnap() {
  // Cek apakah snap.js sudah dimuat
  if (typeof window.snap === "undefined") {
    console.error(
      "Midtrans Snap belum dimuat. Pastikan script snap.js sudah ditambahkan."
    );

    // Coba memuat Snap.js secara dinamis jika belum ada
    try {
      const clientKey = getClientKey();
      const snapUrl = "https://app.sandbox.midtrans.com/snap/snap.js";

      console.log("Mencoba memuat Snap.js secara dinamis...");

      // Buat script element
      const script = document.createElement("script");
      script.src = snapUrl;
      script.setAttribute("data-client-key", clientKey);
      script.async = true;

      // Tambahkan ke head
      document.head.appendChild(script);

      // Tunggu script dimuat
      return new Promise((resolve) => {
        script.onload = () => {
          console.log("Snap.js berhasil dimuat secara dinamis");
          snapInstance = window.snap;
          resolve(true);
        };
        script.onerror = () => {
          console.error("Gagal memuat Snap.js secara dinamis");
          resolve(false);
        };
      });
    } catch (error) {
      console.error("Error saat memuat Snap.js secara dinamis:", error);
      return false;
    }
  }

  // Inisialisasi snap instance jika belum ada
  if (!snapInstance) {
    console.log("Menggunakan Snap.js yang sudah dimuat");
    snapInstance = window.snap;
  }

  return true;
}

// Fungsi untuk memulai pembayaran dengan Midtrans
async function startMidtransPayment(orderData) {
  try {
    // Validasi data order
    if (!validateOrderData(orderData)) {
      throw new Error("Data pesanan tidak valid");
    }

    console.log("Memulai proses pembayaran untuk order:", orderData.order_id);

    // Siapkan data untuk Midtrans
    const transactionData = {
      transaction_details: {
        order_id: orderData.order_id,
        gross_amount: parseInt(orderData.gross_amount) || 0,
      },
      credit_card: {
        secure: true,
      },
    };

    // Tambahkan customer_details jika ada
    if (orderData.customer_details) {
      transactionData.customer_details = orderData.customer_details;
    }

    // Tambahkan item_details jika ada
    if (orderData.item_details) {
      transactionData.item_details = orderData.item_details;
    }

    console.log("Transaction data:", transactionData);

    // Simpan status order sebagai pending
    try {
      await updateOrderStatus(orderData.order_id, "pending", {
        transaction_data: transactionData,
      });
      console.log("Order status updated to pending");
    } catch (statusError) {
      console.error("Error updating order status:", statusError);
      // Lanjutkan meskipun ada error
    }

    // Simpan data order ke database terlebih dahulu
    try {
      if (orderData.checkoutData) {
        await saveOrderToDatabase(orderData.checkoutData, orderData.order_id);
      } else {
        console.warn(
          "checkoutData tidak tersedia, tidak dapat menyimpan order ke database"
        );
      }
      console.log("Order saved to database successfully");
    } catch (dbError) {
      console.error("Error saving order to database:", dbError);
      // Lanjutkan meskipun ada error database
    }

    // Dapatkan token dan redirect URL dari server Midtrans
    console.log("Meminta token dan redirect URL dari server Midtrans...");
    try {
      // Gunakan backend untuk mendapatkan token dan redirect URL
      // Deteksi apakah aplikasi berjalan di lingkungan produksi atau development
      const productionHostnames = [
        "catalist-omega.vercel.app",
        "catalis-lac.vercel.app",
        "www.catalis.fun",
        "catalist-9b34b5mwu-naufalspurnomos-projects-964e670f.vercel.app",
      ];
      const isProduction = productionHostnames.includes(
        window.location.hostname
      );

      const backendUrl = isProduction
        ? "https://catalist-omega.vercel.app/api/generate-snap-token" // URL produksi
        : "http://localhost:3001/generate-snap-token"; // URL development
      console.log(
        `Environment detected as: ${
          isProduction ? "Production" : "Development"
        }`
      );
      console.log("Mengirim permintaan ke:", backendUrl);

      // Dapatkan origin frontend saat ini
      const frontendOrigin = window.location.origin;

      // Tambahkan timeout untuk menghindari permintaan yang terlalu lama
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Gunakan mode no-cors untuk menghindari masalah CORS
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...transactionData, // Data transaksi yang sudah ada
          frontendOrigin: frontendOrigin, // Kirim origin frontend ke backend
        }),
        // --- SELESAI UBAHAN ---
        signal: controller.signal,
      });

      // Bersihkan timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HTTP error response:", errorText);
        throw new Error(`HTTP error: ${response.status} - ${errorText}`);
      }

      // Coba parse response sebagai JSON
      let responseData;
      try {
        responseData = await response.json();
        console.log("Response data:", responseData);
      } catch (jsonError) {
        console.error("Error parsing JSON response:", jsonError);
        throw new Error("Format respons tidak valid: " + jsonError.message);
      }

      // Periksa apakah ada redirect_url dalam response
      if (!responseData.redirect_url) {
        console.error(
          "Redirect URL tidak ditemukan dalam response:",
          responseData
        );

        // Jika tidak ada redirect_url tapi ada token, buat URL redirect
        if (responseData.token) {
          const redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${responseData.token}`;
          console.log("Membuat redirect URL dari token:", redirectUrl);

          // Simpan token autentikasi sebelum redirect
          console.log("Menyimpan token autentikasi sebelum redirect...");
          try {
            // Dapatkan session saat ini
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (session) {
              // Simpan token autentikasi di localStorage
              const authData = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                user: {
                  id: session.user.id,
                  email: session.user.email,
                },
                timestamp: new Date().getTime(),
              };

              localStorage.setItem(
                "midtrans_auth_data",
                JSON.stringify(authData)
              );
              console.log("Token autentikasi berhasil disimpan");

              // Tambahkan parameter ke URL redirect
              const redirectUrlObj = new URL(redirectUrl);
              redirectUrlObj.searchParams.append("auth_preserved", "true");
              redirectUrlObj.searchParams.append("user_id", session.user.id);

              // Redirect ke halaman pembayaran Midtrans dengan parameter tambahan
              console.log("Redirecting ke halaman pembayaran Midtrans...");
              window.location.href = redirectUrlObj.toString();
            } else {
              // Jika tidak ada session, redirect langsung
              console.log("Tidak ada session, redirecting langsung...");
              window.location.href = redirectUrl;
            }
          } catch (authError) {
            console.error("Error menyimpan token autentikasi:", authError);
            // Tetap redirect meskipun gagal menyimpan token
            window.location.href = redirectUrl;
          }

          // Kembalikan hasil
          return {
            status: "pending",
            data: {
              redirect_url: redirectUrl,
            },
          };
        } else {
          throw new Error(
            "Redirect URL dan token tidak ditemukan dalam response"
          );
        }
      }

      const redirectUrl = responseData.redirect_url;
      console.log("Redirect URL berhasil didapatkan:", redirectUrl);

      // Simpan token autentikasi sebelum redirect
      console.log("Menyimpan token autentikasi sebelum redirect...");
      try {
        // Dapatkan session saat ini
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // Simpan token autentikasi di localStorage
          const authData = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user: {
              id: session.user.id,
              email: session.user.email,
            },
            timestamp: new Date().getTime(),
          };

          localStorage.setItem("midtrans_auth_data", JSON.stringify(authData));
          console.log("Token autentikasi berhasil disimpan");

          // Tambahkan parameter ke URL redirect
          const redirectUrlObj = new URL(redirectUrl);
          redirectUrlObj.searchParams.append("auth_preserved", "true");
          redirectUrlObj.searchParams.append("user_id", session.user.id);

          // Redirect ke halaman pembayaran Midtrans dengan parameter tambahan
          console.log("Redirecting ke halaman pembayaran Midtrans...");
          window.location.href = redirectUrlObj.toString();
        } else {
          // Jika tidak ada session, redirect langsung
          console.log("Tidak ada session, redirecting langsung...");
          window.location.href = redirectUrl;
        }
      } catch (authError) {
        console.error("Error menyimpan token autentikasi:", authError);
        // Tetap redirect meskipun gagal menyimpan token
        window.location.href = redirectUrl;
      }

      // Kembalikan hasil untuk kompatibilitas dengan kode yang memanggil fungsi ini
      return {
        status: "pending",
        data: {
          redirect_url: redirectUrl,
        },
      };
    } catch (error) {
      console.error("Error mendapatkan redirect URL:", error);

      // Berikan pesan error yang lebih spesifik
      if (error.name === "AbortError") {
        throw new Error(
          "Gagal mendapatkan redirect URL pembayaran: Waktu permintaan habis"
        );
      } else if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          "Gagal mendapatkan redirect URL pembayaran: Server tidak dapat dijangkau. Pastikan server backend berjalan di http://localhost:3001"
        );
      } else {
        throw new Error(
          "Gagal mendapatkan redirect URL pembayaran: " + error.message
        );
      }
    }
  } catch (error) {
    console.error("Error saat memulai pembayaran:", error);
    showNotification("Gagal memulai pembayaran: " + error.message, "error");
    return {
      status: "error",
      message: error.message,
    };
  }
}

// Fungsi untuk validasi data order
function validateOrderData(orderData) {
  // Validasi data yang diperlukan
  if (!orderData) return false;
  if (!orderData.order_id) return false;
  if (!orderData.gross_amount || orderData.gross_amount <= 0) return false;
  if (!orderData.customer_details || !orderData.customer_details.email)
    return false;

  return true;
}

// Fungsi untuk generate token Snap
async function generateSnapToken(orderData) {
  try {
    // Siapkan data untuk request token
    const transactionDetails = {
      order_id: orderData.order_id,
      gross_amount: parseInt(orderData.gross_amount) || 0,
    };

    const customerDetails = orderData.customer_details || {
      first_name: "Pelanggan",
      email: "customer@example.com",
      phone: "08123456789",
    };

    const itemDetails = orderData.item_details || [
      {
        id: "ITEM1",
        price: parseInt(orderData.gross_amount) || 0,
        quantity: 1,
        name: "Pesanan dari Catalist Creative",
      },
    ];

    // Siapkan data untuk request
    const requestData = {
      transaction_details: transactionDetails,
      customer_details: customerDetails,
      item_details: itemDetails,
      credit_card: {
        secure: true,
      },
    };

    console.log(
      "Requesting Snap token with data:",
      JSON.stringify(requestData)
    );

    // Untuk demo, gunakan URL redirect langsung ke Midtrans Snap
    // Ini akan menghindari masalah dengan token
    const redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${orderData.order_id}`;
    console.log("Using redirect URL instead of token:", redirectUrl);

    // Simpan data order ke database terlebih dahulu
    try {
      await saveOrderToDatabase(orderData, orderData.order_id);
      console.log("Order saved to database successfully");
    } catch (dbError) {
      console.error("Error saving order to database:", dbError);
      // Lanjutkan meskipun ada error database
    }

    // Gunakan client key sebagai token statis untuk demo
    return getClientKey();
  } catch (error) {
    console.error("Error generating Snap token:", error);

    // Kategorikan error untuk pesan yang lebih spesifik
    if (error.name === "AbortError") {
      throw new Error("Gagal membuat token pembayaran: Waktu permintaan habis");
    } else if (
      error.name === "TypeError" &&
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Gagal membuat token pembayaran: Server tidak dapat dijangkau. Pastikan server backend berjalan di http://localhost:3001"
      );
    } else {
      throw new Error("Gagal membuat token pembayaran: " + error.message);
    }
  }
}

// Fungsi untuk update status order

// Fungsi untuk mendapatkan token dari backend lokal
async function getTokenFromBackend(requestData) {
  // Deteksi environment production
  const productionHostnames = [
    "catalist-omega.vercel.app",
    "catalis-lac.vercel.app",
    "www.catalis.fun",
    "catalist-9b34b5mwu-naufalspurnomos-projects-964e670f.vercel.app",
  ];
  const isProduction = productionHostnames.includes(window.location.hostname);
  const backendUrl = isProduction
    ? "https://catalist-omega.vercel.app/api/generate-snap-token"
    : "http://localhost:3001/generate-snap-token";
  console.log("Connecting to backend at:", backendUrl);

  // Tambahkan timeout untuk menghindari permintaan yang terlalu lama
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout

  try {
    // Panggil API backend dengan timeout dan mode cors
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestData),
      signal: controller.signal,
      mode: "cors",
      credentials: "include", // Kirim kredensial (cookies, dll)
    });

    // Bersihkan timeout jika berhasil
    clearTimeout(timeoutId);

    // Periksa status response
    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error("Backend error:", errorData);
        errorMessage = errorData.message || errorMessage;
        if (errorData.details) {
          console.error("Error details:", errorData.details);
        }
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    // Parse response
    let responseData;
    try {
      responseData = await response.json();
      console.log("Backend response:", responseData);
    } catch (parseError) {
      console.error("Failed to parse success response:", parseError);
      throw new Error("Format respons tidak valid dari server");
    }

    if (responseData.status !== "success" || !responseData.token) {
      throw new Error("Token tidak ditemukan dalam response");
    }

    return responseData.token;
  } catch (error) {
    throw error; // Re-throw untuk ditangani oleh fungsi utama
  }
}

// Fungsi untuk mendapatkan token langsung dari Midtrans
// Catatan: Ini hanya untuk demo/fallback, sebaiknya gunakan backend untuk keamanan
async function getTokenDirectly(requestData) {
  console.log("Getting token directly from Midtrans (demo mode)");

  // Inisialisasi Snap
  if (!initMidtransSnap()) {
    throw new Error("Gagal menginisialisasi Midtrans Snap");
  }

  // Untuk demo, kita akan menggunakan client key sebagai token dummy
  // PENTING: Ini hanya untuk demo dan tidak akan berfungsi untuk transaksi nyata
  // Dalam produksi, token harus dibuat oleh backend menggunakan server key
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulasi delay

  // Gunakan client key sebagai token dummy
  const dummyToken = getClientKey();
  console.log("Using dummy token for demo:", dummyToken);

  return dummyToken;

  // Kategorikan error untuk pesan yang lebih spesifik
  if (error.name === "AbortError") {
    throw new Error("Gagal membuat token pembayaran: Waktu permintaan habis");
  } else if (
    error.name === "TypeError" &&
    error.message.includes("Failed to fetch")
  ) {
    throw new Error(
      "Gagal membuat token pembayaran: Server tidak dapat dijangkau. Pastikan server backend berjalan di http://localhost:3001"
    );
  } else {
    throw new Error("Gagal membuat token pembayaran: " + error.message);
  }
}

// Fungsi untuk update status order
async function updateOrderStatus(orderId, status, paymentResult) {
  try {
    // Update status order di Supabase
    const { error } = await supabase
      .from("orders")
      .update({
        status: status,
        // Menghapus kolom payment_details yang menyebabkan error
        updated_at: new Date(),
      })
      .eq("order_number", orderId);

    // Simpan detail pembayaran di tabel payment_history sebagai gantinya
    if (!error) {
      try {
        await savePaymentHistory(orderId, status, paymentResult);
      } catch (paymentError) {
        console.error("Error saving payment history:", paymentError);
      }
    }

    if (error) throw error;

    // Jika pembayaran berhasil, update stok produk
    if (status === "success") {
      await updateProductStock(orderId);
    }

    // Tampilkan notifikasi
    const message =
      status === "success"
        ? "Pembayaran berhasil!"
        : status === "pending"
        ? "Pembayaran sedang diproses"
        : "Pembayaran gagal";

    showNotification(
      message,
      status === "success" ? "success" : status === "pending" ? "info" : "error"
    );

    // Redirect ke halaman konfirmasi jika pembayaran berhasil
    if (status === "success") {
      setTimeout(() => {
        window.location.href = `checkout.html?step=3&order_id=${orderId}`;
      }, 2000);
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    showNotification("Gagal memperbarui status pesanan", "error");
  }
}

// Fungsi untuk update stok produk
async function updateProductStock(orderId) {
  try {
    console.log("=== FRONTEND: UPDATING PRODUCT STOCK ===");
    console.log("Order ID (order_number):", orderId);

    // PERBAIKAN: Dapatkan UUID order dari order_number terlebih dahulu
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", orderId)
      .single();

    if (orderError) {
      console.error("Error getting order UUID:", orderError);
      return;
    }

    if (!orderData) {
      console.error("Order not found with order_number:", orderId);
      return;
    }

    console.log("Order UUID found:", orderData.id);

    // Ambil data order items menggunakan UUID yang benar
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderData.id); // Gunakan UUID, bukan order_number

    if (itemsError) {
      console.error("Error getting order items:", itemsError);
      throw itemsError;
    }

    if (!orderItems || orderItems.length === 0) {
      console.log("No order items found");
      return;
    }

    console.log("Updating stock for", orderItems.length, "items");

    // Update stok untuk setiap produk
    for (const item of orderItems) {
      // Ambil data produk
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();

      if (productError) {
        console.error("Error getting product:", productError);
        continue;
      }

      // Hitung stok baru
      const newStock = Math.max(0, product.stock - item.quantity);

      // Update stok produk
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.product_id);

      if (updateError) {
        console.error("Error updating stock:", updateError);
      } else {
        console.log(
          `Stock updated for product ${item.product_id}: ${product.stock} -> ${newStock}`
        );
      }
    }

    console.log("Product stock update completed");
  } catch (error) {
    console.error("Error updating product stock:", error);
  }
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = "info") {
  // Cek apakah ada fungsi showNotification global
  if (typeof window.showNotification === "function") {
    window.showNotification(message, type);
    return;
  }

  // Implementasi default jika tidak ada fungsi global
  let notification = document.getElementById("midtrans-notification");

  if (notification) {
    // Update pesan notifikasi yang sudah ada
    notification.textContent = message;

    // Reset timer
    clearTimeout(notification.timer);
  } else {
    // Buat notifikasi baru
    notification = document.createElement("div");
    notification.id = "midtrans-notification";
    notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-y-0 ${
      type === "success"
        ? "bg-green-500 text-white"
        : type === "error"
        ? "bg-red-500 text-white"
        : type === "warning"
        ? "bg-yellow-500 text-dark"
        : "bg-blue-500 text-white"
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);
  }

  // Animasi masuk
  setTimeout(() => {
    notification.style.transform = "translateY(0)";
    notification.style.opacity = "1";
  }, 10);

  // Set timer untuk menghilangkan notifikasi
  notification.timer = setTimeout(() => {
    notification.style.transform = "translateY(20px)";
    notification.style.opacity = "0";

    // Hapus elemen setelah animasi selesai
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// Fungsi untuk mempersiapkan data order untuk Midtrans
function prepareOrderData(checkoutData) {
  // Generate order ID unik untuk Midtrans (bukan UUID)
  // Format: ORDER-timestamp-random untuk memudahkan pelacakan
  const orderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Siapkan data customer
  const customerDetails = {
    first_name: checkoutData.shipping.fullname,
    email: checkoutData.shipping.email,
    phone: checkoutData.shipping.phone,
    billing_address: {
      first_name: checkoutData.shipping.fullname,
      email: checkoutData.shipping.email,
      phone: checkoutData.shipping.phone,
      address: checkoutData.shipping.address,
      city: checkoutData.shipping.city,
      postal_code: checkoutData.shipping.postalCode,
      country_code: "IDN",
    },
    shipping_address: {
      first_name: checkoutData.shipping.fullname,
      email: checkoutData.shipping.email,
      phone: checkoutData.shipping.phone,
      address: checkoutData.shipping.address,
      city: checkoutData.shipping.city,
      postal_code: checkoutData.shipping.postalCode,
      country_code: "IDN",
    },
  };

  // Siapkan detail item
  const itemDetails = checkoutData.order.items.map((item) => ({
    id: item.id,
    price: item.price,
    quantity: item.quantity,
    name: item.name,
    category: item.category || "Produk",
  }));

  // Tambahkan biaya pengiriman sebagai item
  if (checkoutData.order.shippingCost > 0) {
    itemDetails.push({
      id: "SHIPPING",
      price: checkoutData.order.shippingCost,
      quantity: 1,
      name: "Biaya Pengiriman",
      category: "Shipping",
    });
  }

  // Tambahkan pajak sebagai item
  if (checkoutData.order.tax > 0) {
    itemDetails.push({
      id: "TAX",
      price: checkoutData.order.tax,
      quantity: 1,
      name: "Pajak",
      category: "Tax",
    });
  }

  // Siapkan data order untuk Midtrans
  return {
    order_id: orderId,
    gross_amount: checkoutData.order.total,
    customer_details: customerDetails,
    item_details: itemDetails,
  };
}

// Fungsi untuk memulai proses checkout dengan Midtrans
async function checkoutWithMidtrans(checkoutData) {
  try {
    // Validasi data checkout
    if (!checkoutData || !checkoutData.shipping || !checkoutData.order) {
      throw new Error("Data checkout tidak lengkap");
    }

    // Persiapkan data order untuk Midtrans
    const orderData = prepareOrderData(checkoutData);

    // Simpan order ke database terlebih dahulu
    const savedOrder = await saveOrderToDatabase(
      checkoutData,
      orderData.order_id
    );

    // Mulai proses pembayaran dengan Midtrans
    return await startMidtransPayment(orderData);
  } catch (error) {
    console.error("Error saat checkout dengan Midtrans:", error);
    showNotification("Gagal memproses checkout: " + error.message, "error");
    return {
      status: "error",
      message: error.message,
    };
  }
}

// Fungsi untuk menyimpan order ke database
async function saveOrderToDatabase(checkoutData, orderId) {
  try {
    // Dapatkan user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User tidak ditemukan");

    console.log("Saving order to database with ID:", orderId);

    // Siapkan data pesanan sesuai dengan struktur tabel orders di Supabase
    // Tidak menggunakan id kustom, biarkan Supabase generate UUID otomatis
    const orderData = {
      // Menghapus id: orderId karena format tidak sesuai UUID
      order_number: orderId, // Gunakan orderId sebagai order_number
      user_id: user.id,
      status: "pending",
      shipping_address: JSON.stringify(checkoutData.shipping),
      payment_method: checkoutData.payment.method,
      subtotal: checkoutData.order.subtotal || 0,
      shipping_cost: checkoutData.order.shippingCost || 0, // Mengembalikan shipping_cost
      tax: checkoutData.order.tax || 0,
      total_amount: checkoutData.order.total || 0,
    };

    console.log("Order data to be inserted:", orderData);

    // Simpan pesanan ke Supabase
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error("Error inserting order:", orderError);
      throw orderError;
    }

    console.log("Order saved successfully:", order);

    // Simpan item pesanan sesuai dengan struktur tabel order_items di Supabase
    const orderItems = checkoutData.order.items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
    }));

    console.log("Order items to be inserted:", orderItems);

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error inserting order items:", itemsError);
      throw itemsError;
    }

    console.log("Order items saved successfully");

    // Kosongkan keranjang belanja setelah pesanan berhasil dibuat
    await clearCart(user.id);

    return order;
  } catch (error) {
    console.error("Error saving order to database:", error);
    throw new Error(`Gagal menyimpan pesanan ke database: ${error.message}`);
  }
}

// Fungsi untuk mengosongkan keranjang belanja
async function clearCart(userId) {
  try {
    // Hapus semua item di keranjang untuk user ini
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error clearing cart:", error);
    } else {
      console.log("Cart cleared successfully");
    }
  } catch (error) {
    console.error("Error clearing cart:", error);
  }
}

// Fungsi untuk menyimpan riwayat pembayaran
async function savePaymentHistory(orderId, status, paymentResult) {
  try {
    console.log("=== FRONTEND: SAVING PAYMENT HISTORY ===");
    console.log("Order ID (order_number):", orderId);

    // PERBAIKAN: Dapatkan UUID order dari order_number terlebih dahulu
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", orderId)
      .single();

    if (orderError) {
      console.error("Error getting order UUID:", orderError);
      throw new Error(`Order tidak ditemukan: ${orderError.message}`);
    }

    if (!orderData) {
      console.error("Order not found with order_number:", orderId);
      throw new Error("Order tidak ditemukan di database");
    }

    console.log("Order UUID found:", orderData.id);

    // Siapkan data riwayat pembayaran dengan UUID yang benar
    const paymentData = {
      order_id: orderData.id, // Gunakan UUID, bukan order_number
      payment_method: "midtrans",
      amount: paymentResult?.gross_amount || 0,
      status: status,
      payment_details: paymentResult ? JSON.stringify(paymentResult) : null,
      transaction_id: paymentResult?.transaction_id || orderId,
    };

    console.log("Payment history data to insert:", paymentData);

    // Simpan riwayat pembayaran ke Supabase
    const { error } = await supabase
      .from("payment_history")
      .insert(paymentData);

    if (error) {
      console.error("Error saving payment history:", error);
      throw error;
    } else {
      console.log("Payment history saved successfully from frontend");
    }
  } catch (error) {
    console.error("Error saving payment history:", error);
    // Jangan throw error untuk menghindari blocking proses checkout
    // Payment history bisa disimpan lewat webhook callback
    console.warn("Payment history will be saved via webhook callback instead");
  }
}

// Export fungsi-fungsi yang diperlukan
export {
  startMidtransPayment,
  checkoutWithMidtrans,
  updateOrderStatus,
  prepareOrderData,
};
