// midtrans-config.js - Konfigurasi untuk integrasi Midtrans

// Konfigurasi Midtrans
const MIDTRANS_CONFIG = {
    isProduction: false,
    clientKey: 'Mid-client-QZNRNJ4ROIoY8PAn',
    serverKey: 'Mid-server-XVdnQPgGcucvnoRJYNWzNw1j',
    merchantId: 'G498472407'
};

// Fungsi untuk mendapatkan URL API Midtrans berdasarkan environment
function getMidtransBaseUrl() {
    return MIDTRANS_CONFIG.isProduction
        ? 'https://app.midtrans.com/snap/v1'
        : 'https://app.sandbox.midtrans.com/snap/v1';
}

// Fungsi untuk mendapatkan URL Snap JS berdasarkan environment
function getSnapUrl() {
    return MIDTRANS_CONFIG.isProduction
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
}

// Fungsi untuk mendapatkan client key
function getClientKey() {
    return MIDTRANS_CONFIG.clientKey;
}

// Fungsi untuk mendapatkan server key
function getServerKey() {
    return MIDTRANS_CONFIG.serverKey;
}

// Fungsi untuk mendapatkan merchant ID
function getMerchantId() {
    return MIDTRANS_CONFIG.merchantId;
}

// Fungsi untuk mendapatkan basic auth header untuk API Midtrans
function getBasicAuthHeader() {
    const serverKey = getServerKey();
    const base64Key = btoa(`${serverKey}:`);
    return `Basic ${base64Key}`;
}

// Export fungsi-fungsi konfigurasi
export {
    MIDTRANS_CONFIG,
    getMidtransBaseUrl,
    getSnapUrl,
    getClientKey,
    getServerKey,
    getMerchantId,
    getBasicAuthHeader
};