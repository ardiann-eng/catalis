// Import modul yang diperlukan
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

// Konfigurasi Supabase
const supabaseUrl =
  process.env.SUPABASE_URL || "https://anzsbqqippijhemwxkqh.supabase.co";
const supabaseKey =
  process.env.SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuenNicXFpcHBpamhlbXd4a3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDM1MTQsImV4cCI6MjA3Njc3OTUxNH0.6l1Bt9_5_5ohFeH8IN6mP9jU0pFUToHMmV1NwQEeP-Q";
const supabase = createClient(supabaseUrl, supabaseKey);

// Konfigurasi Midtrans
const MIDTRANS_SERVER_KEY =
  process.env.MIDTRANS_SERVER_KEY || "Mid-server-XVdnQPgGcucvnoRJYNWzNw1j";

// Fungsi untuk verifikasi signature
function verifySignature(notification) {
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
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !orderData) {
      console.error("Error getting order ID:", orderError);
      return;
    }

    const orderId = orderData.id;

    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
      console.log("No order items found for order:", orderNumber);
      return;
    }

    console.log("Updating stock for order items:", orderItems);

    for (const item of orderItems) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();

      if (productError) {
        console.error("Error getting product:", productError);
        continue;
      }

      const newStock = Math.max(0, (product.stock || 0) - item.quantity);

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

// Vercel Serverless Function Handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      status: "error",
      message: "Method not allowed",
    });
  }

  try {
    const notification = req.body;

    console.log("=== MIDTRANS CALLBACK RECEIVED ===");
    console.log("Notification:", JSON.stringify(notification));

    // Verifikasi signature dari Midtrans
    const isSignatureValid = verifySignature(notification);
    if (!isSignatureValid) {
      console.error("Invalid signature from Midtrans");
      return res.status(403).json({
        status: "error",
        message: "Invalid signature",
      });
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

    console.log(`Order ${orderId} status: ${status}`);

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
      return res.status(500).json({
        status: "error",
        message: "Failed to update order",
      });
    }

    // Simpan riwayat pembayaran ke tabel payment_history
    try {
      console.log("=== PAYMENT HISTORY SAVING PROCESS START ===");

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, user_id, status")
        .eq("order_number", orderId)
        .single();

      if (orderError || !orderData) {
        console.error("Error getting order ID:", orderError);
        // Coba metode alternatif
        const { data: altOrderData, error: altOrderError } = await supabase
          .from("orders")
          .select("id, user_id, status")
          .ilike("order_number", `%${orderId}%`)
          .limit(1)
          .single();

        if (altOrderError || !altOrderData) {
          console.error("Order not found:", orderId);
          throw new Error("Order not found");
        }
        orderData = altOrderData;
      }

      const paymentData = {
        order_id: orderData.id,
        payment_method: "midtrans",
        amount: parseInt(notification.gross_amount) || 0,
        status: status,
        payment_details: JSON.stringify(notification),
        transaction_id: notification.transaction_id || orderId,
      };

      // Periksa apakah payment history sudah ada
      const { data: existingPayment, error: checkError } = await supabase
        .from("payment_history")
        .select("id")
        .eq("order_id", orderData.id)
        .eq("transaction_id", paymentData.transaction_id)
        .maybeSingle();

      if (existingPayment) {
        // Update existing payment
        const { error: updateError } = await supabase
          .from("payment_history")
          .update({
            status: status,
            payment_details: JSON.stringify(notification),
            updated_at: new Date(),
          })
          .eq("id", existingPayment.id);

        if (updateError) {
          console.error("Error updating payment history:", updateError);
        } else {
          console.log("Payment history updated successfully");
        }
      } else {
        // Insert new payment
        const { error: paymentError } = await supabase
          .from("payment_history")
          .insert(paymentData);

        if (paymentError) {
          console.error("Error saving payment history:", paymentError);
        } else {
          console.log("Payment history saved successfully");
        }
      }

      console.log("=== PAYMENT HISTORY PROCESS COMPLETE ===");
    } catch (paymentError) {
      console.error("Error in payment history process:", paymentError);
      // Simpan error log
      try {
        await supabase.from("error_logs").insert({
          error_source: "payment_history_insert",
          error_message: paymentError.message,
          error_details: JSON.stringify({
            stack: paymentError.stack,
            notification: notification,
          }),
          order_id: orderId,
        });
      } catch (logError) {
        console.error("Error saving error log:", logError);
      }
    }

    // Update stok produk jika pembayaran sukses
    if (status === "success") {
      await updateProductStock(orderId);
    }

    console.log("=== MIDTRANS CALLBACK PROCESSED SUCCESSFULLY ===");
    return res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Error processing callback:", error);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
