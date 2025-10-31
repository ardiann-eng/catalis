// Import modul yang diperlukan
const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const axios = require("axios");
const cors = require("cors");
const midtransClient = require("midtrans-client");

// Konfigurasi Supabase
const supabaseUrl =
  process.env.SUPABASE_URL || "https://anzsbqqippijhemwxkqh.supabase.co";
const supabaseKey =
  process.env.SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuenNicXFpcHBpamhlbXd4a3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDM1MTQsImV4cCI6MjA3Njc3OTUxNH0.6l1Bt9_5_5ohFeH8IN6mP9jU0pFUToHMmV1NwQEeP-Q";
const supabase = createClient(supabaseUrl, supabaseKey);

// Log koneksi Supabase
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase connection initialized");

// Deteksi lingkungan produksi
const isProduction = process.env.NODE_ENV === "production";
console.log("Environment:", isProduction ? "Production" : "Development");

// Konfigurasi Midtrans
const MIDTRANS_SERVER_KEY =
  process.env.MIDTRANS_SERVER_KEY || "Mid-server-XVdnQPgGcucvnoRJYNWzNw1j";
const MIDTRANS_CLIENT_KEY =
  process.env.MIDTRANS_CLIENT_KEY || "Mid-client-QZNRNJ4ROIoY8PAn";
const MIDTRANS_MERCHANT_ID = process.env.MIDTRANS_MERCHANT_ID || "G498472407";
const MIDTRANS_IS_PRODUCTION =
  process.env.MIDTRANS_IS_PRODUCTION === "true" ? true : false;
const MIDTRANS_API_URL = MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

// Inisialisasi Express
const app = express();
app.use(bodyParser.json());

// Konfigurasi CORS untuk mengizinkan semua permintaan
app.use(
  cors({
    origin: "*", // Izinkan permintaan dari mana saja
    methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Authorization",
      "X-Requested-With",
      "Origin",
    ],
    exposedHeaders: ["Content-Length", "Content-Type"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Endpoint untuk callback Midtrans
app.post("/midtrans-callback", async (req, res) => {
  try {
    const notification = req.body;

    // Verifikasi signature dari Midtrans (opsional tapi direkomendasikan)
    const isSignatureValid = verifySignature(notification);
    if (!isSignatureValid) {
      return res
        .status(403)
        .json({ status: "error", message: "Invalid signature" });
    }

    // Proses notifikasi berdasarkan status transaksi
    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    let status = "pending";

    if (transactionStatus == "capture") {
      if (fraudStatus == "challenge") {
        status = "challenge";
      } else if (fraudStatus == "accept") {
        status = "success";
      }
    } else if (transactionStatus == "settlement") {
      status = "success";
    } else if (
      transactionStatus == "cancel" ||
      transactionStatus == "deny" ||
      transactionStatus == "expire"
    ) {
      status = "failed";
    } else if (transactionStatus == "pending") {
      status = "pending";
    }

    // Update status order di database
    const { error } = await supabase
      .from("orders")
      .update({
        status: status,
        updated_at: new Date(),
      })
      .eq("order_number", orderId);

    if (error) {
      console.error("Error updating order:", error);
      return res
        .status(500)
        .json({ status: "error", message: "Failed to update order" });
    }

    // Simpan riwayat pembayaran ke tabel payment_history
    try {
      console.log("=== PAYMENT HISTORY SAVING PROCESS START ===");
      console.log("Order ID (from notification):", orderId);

      // Dapatkan ID order (UUID) dari order_number
      console.log("Fetching order data from database...");
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, user_id, status")
        .eq("order_number", orderId)
        .single();

      if (orderError) {
        console.error("Error getting order ID:", orderError);
        console.error("Error details:", JSON.stringify(orderError));

        // Coba cari order dengan metode alternatif jika ada
        console.log("Trying alternative method to find order...");
        const { data: altOrderData, error: altOrderError } = await supabase
          .from("orders")
          .select("id, user_id, status")
          .ilike("order_number", `%${orderId}%`)
          .limit(1);

        if (altOrderError || !altOrderData || altOrderData.length === 0) {
          console.error(
            "Alternative method also failed:",
            altOrderError || "No matching orders found"
          );
          throw orderError;
        }

        console.log("Found order using alternative method:", altOrderData[0]);
        orderData = altOrderData[0];
      }

      if (!orderData) {
        console.error("Order not found:", orderId);
        console.error(
          "This might indicate a mismatch between order_number in notification and database"
        );

        // Buat log khusus untuk debugging
        const { data: allOrders, error: listError } = await supabase
          .from("orders")
          .select("order_number, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        if (!listError) {
          console.log("Recent orders in database:", allOrders);
        }

        throw new Error("Order not found");
      }

      console.log("Order found in database:", orderData);

      // Siapkan data riwayat pembayaran
      const paymentData = {
        order_id: orderData.id, // Gunakan UUID dari tabel orders
        payment_method: "midtrans",
        amount: parseInt(notification.gross_amount) || 0,
        status: status,
        payment_details: JSON.stringify(notification),
        transaction_id: notification.transaction_id || orderId,
      };

      console.log(
        "Payment data prepared:",
        JSON.stringify(paymentData, null, 2)
      );

      // Periksa apakah payment history sudah ada untuk menghindari duplikasi
      console.log("Checking for existing payment history...");
      const { data: existingPayment, error: checkError } = await supabase
        .from("payment_history")
        .select("id")
        .eq("order_id", orderData.id)
        .eq("transaction_id", paymentData.transaction_id)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing payment:", checkError);
      } else if (existingPayment) {
        console.log("Payment history already exists:", existingPayment);
        console.log("Updating existing payment history...");

        // Update payment history yang sudah ada
        const { data: updatedData, error: updateError } = await supabase
          .from("payment_history")
          .update({
            status: status,
            payment_details: JSON.stringify(notification),
            updated_at: new Date(),
          })
          .eq("id", existingPayment.id)
          .select();

        if (updateError) {
          console.error("Error updating payment history:", updateError);
          throw updateError;
        } else {
          console.log("Payment history updated successfully");
          console.log("Updated data:", updatedData);
          console.log("=== PAYMENT HISTORY UPDATE COMPLETE ===");
          return;
        }
      }

      // Simpan riwayat pembayaran ke Supabase
      console.log("Inserting payment history to database...");
      const { data: insertedData, error: paymentError } = await supabase
        .from("payment_history")
        .insert(paymentData)
        .select();

      if (paymentError) {
        console.error("Error saving payment history:", paymentError);
        console.error("Error code:", paymentError.code);
        console.error("Error message:", paymentError.message);
        console.error("Error details:", JSON.stringify(paymentError));

        // Coba metode alternatif jika error adalah foreign key constraint
        if (
          paymentError.code === "23503" ||
          paymentError.message?.includes("foreign key constraint")
        ) {
          console.log(
            "Foreign key constraint error detected, trying alternative approach..."
          );

          // Coba tanpa select untuk menghindari error
          const { error: altInsertError } = await supabase
            .from("payment_history")
            .insert(paymentData);

          if (altInsertError) {
            console.error("Alternative insert also failed:", altInsertError);
            throw altInsertError;
          } else {
            console.log(
              "Payment history saved successfully using alternative method"
            );
          }
        } else {
          throw paymentError;
        }
      } else {
        console.log("Payment history saved successfully");
        console.log("Inserted data:", insertedData);
      }

      console.log("=== PAYMENT HISTORY SAVING PROCESS COMPLETE ===");
    } catch (paymentError) {
      console.error("=== PAYMENT HISTORY SAVING PROCESS FAILED ===");
      console.error("Error saving payment history:", paymentError);
      console.error("Stack trace:", paymentError.stack);

      // Simpan error log ke tabel khusus untuk debugging
      try {
        const { error: logError } = await supabase.from("error_logs").insert({
          error_source: "payment_history_insert",
          error_message: paymentError.message,
          error_details: JSON.stringify({
            stack: paymentError.stack,
            notification: notification,
          }),
          order_id: orderId,
        });

        if (logError) {
          console.error("Failed to save error log:", logError);
        } else {
          console.log("Error log saved for debugging");
        }
      } catch (logError) {
        console.error("Error while saving error log:", logError);
      }

      // Lanjutkan meskipun ada error saat menyimpan riwayat pembayaran
    }

    // Jika pembayaran sukses, update stok produk (opsional)
    if (status === "success") {
      await updateProductStock(orderId);
    }

    return res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Error processing callback:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// Fungsi untuk verifikasi signature
function verifySignature(notification) {
  // Implementasi verifikasi signature Midtrans
  // Ini adalah contoh sederhana, silakan sesuaikan dengan dokumentasi Midtrans
  const orderId = notification.order_id;
  const statusCode = notification.status_code;
  const grossAmount = notification.gross_amount;
  const serverKey = MIDTRANS_SERVER_KEY;

  const signatureKey = crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest("hex");

  return signatureKey === notification.signature_key;
}

// Fungsi untuk update stok produk
async function updateProductStock(orderNumber) {
  try {
    // Dapatkan ID order (UUID) dari order_number
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", orderNumber)
      .single();

    if (orderError) {
      console.error("Error getting order ID:", orderError);
      throw orderError;
    }

    if (!orderData) {
      console.error("Order not found:", orderNumber);
      throw new Error("Order not found");
    }

    const orderId = orderData.id;

    // Dapatkan item pesanan dari database
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);

    if (itemsError) throw itemsError;

    if (!orderItems || orderItems.length === 0) {
      console.log("No order items found for order:", orderNumber);
      return;
    }

    console.log("Updating stock for order items:", orderItems);

    // Update stok untuk setiap produk
    for (const item of orderItems) {
      // Dapatkan stok saat ini
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
      const newStock = Math.max(0, (product.stock || 0) - item.quantity);

      // Update stok produk
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.product_id);

      if (updateError) {
        console.error("Error updating product stock:", updateError);
      } else {
        console.log(
          `Stock updated for product ${item.product_id}: ${product.stock} -> ${newStock}`
        );
      }
    }
  } catch (error) {
    console.error("Error updating product stock:", error);
  }
}

// Endpoint untuk menghasilkan token Snap
app.post("/generate-snap-token", async (req, res) => {
  try {
    const requestData = req.body;

    // Dapatkan origin frontend dari request body
    // Berikan default value jika tidak ada (meskipun seharusnya selalu ada)
    const frontendOrigin =
      requestData.frontendOrigin ||
      (isProduction ? "https://www.catalis.fun" : "http://localhost:8080");
    console.log(`Generating token for frontend origin: ${frontendOrigin}`);

    // Validasi data yang diperlukan
    if (
      !requestData.transaction_details ||
      !requestData.transaction_details.order_id ||
      !requestData.transaction_details.gross_amount
    ) {
      return res.status(400).json({
        status: "error",
        message: "Data transaksi tidak lengkap",
      });
    }

    // Pastikan format data sesuai dengan yang diharapkan Midtrans
    const formattedData = {
      transaction_details: {
        order_id: requestData.transaction_details.order_id,
        gross_amount: parseInt(requestData.transaction_details.gross_amount),
      },
      credit_card: {
        secure: true,
      },
      callbacks: {
        // Gunakan frontendOrigin yang didapat dari request
        finish: `${frontendOrigin}/payment-success.html`,
        error: `${frontendOrigin}/checkout.html`,
        // Anda bisa tambahkan pending URL juga jika perlu
        // pending: `${frontendOrigin}/payment-pending.html`
      },
    };

    // Tambahkan customer_details jika ada
    if (requestData.customer_details) {
      formattedData.customer_details = requestData.customer_details;
    }

    // Tambahkan item_details jika ada
    if (requestData.item_details && Array.isArray(requestData.item_details)) {
      formattedData.item_details = requestData.item_details.map((item) => ({
        id: item.id,
        price: parseInt(item.price),
        quantity: parseInt(item.quantity),
        name: item.name,
        category: item.category || "Produk",
      }));
    }

    console.log(
      "Generating Snap token with data:",
      JSON.stringify(formattedData)
    );

    // Buat Basic Auth header untuk Midtrans
    const auth = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64");

    // Panggil API Midtrans untuk mendapatkan token Snap
    const response = await axios.post(MIDTRANS_API_URL, formattedData, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
    });

    console.log("Midtrans API response:", response.data);

    // Buat redirect URL jika tidak ada dalam response
    let redirectUrl = response.data.redirect_url;
    if (!redirectUrl && response.data.token) {
      // Format URL redirect sesuai dokumentasi Midtrans
      const snapDomain = MIDTRANS_IS_PRODUCTION
        ? "https://app.midtrans.com"
        : "https://app.sandbox.midtrans.com";
      redirectUrl = `${snapDomain}/snap/v2/vtweb/${response.data.token}`;
      console.log("Created redirect URL:", redirectUrl);
    }

    // Kirim token dan redirect URL ke client
    return res.status(200).json({
      status: "success",
      token: response.data.token,
      redirect_url: redirectUrl,
    });
  } catch (error) {
    console.error(
      "Error generating Snap token:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      status: "error",
      message: "Gagal membuat token pembayaran",
      details: error.response?.data || error.message,
    });
  }
});

// Jalankan server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Midtrans callback server running on port ${PORT}`);
  console.log(`Midtrans configuration:`);
  console.log(`- Merchant ID: ${MIDTRANS_MERCHANT_ID}`);
  console.log(
    `- Environment: ${MIDTRANS_IS_PRODUCTION ? "Production" : "Sandbox"}`
  );
  console.log(`- API URL: ${MIDTRANS_API_URL}`);
});

module.exports = app;
