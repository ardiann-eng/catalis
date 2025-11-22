// Import modul yang diperlukan
const axios = require("axios");

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

// Deteksi lingkungan produksi
const isProduction = process.env.NODE_ENV === "production";

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
    const requestData = req.body;

    // Dapatkan origin frontend dari request body
    const frontendOrigin =
      requestData.frontendOrigin ||
      (isProduction ? "https://catalist-omega.vercel.app" : "http://localhost:8080");
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
        finish: `${frontendOrigin}/payment-success.html`,
        error: `${frontendOrigin}/checkout.html`,
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
};
