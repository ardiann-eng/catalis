import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import supabase from "../lib/supabase";
import OrderStatusBadge from "../components/OrderStatusBadge";
import {
  FiArrowLeft,
  FiUser,
  FiMapPin,
  FiPackage,
  FiCreditCard,
  FiCalendar,
  FiAlertTriangle,
  FiCheck,
} from "react-icons/fi";

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [shippingHistory, setShippingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(false);

  // Fetch order data
  useEffect(() => {
    fetchOrderData();
  }, [id]);

  // Fetch order data from Supabase
  const fetchOrderData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          user_id,
          status,
          shipping_address,
          payment_method,
          subtotal,
          shipping_cost,
          tax,
          total_amount,
          payment_details,
          created_at,
          updated_at,
          profiles (display_name, email)
        `
        )
        .eq("id", id)
        .single();

      if (orderError) throw orderError;

      if (!orderData) {
        throw new Error("Pesanan tidak ditemukan");
      }

      setOrder(orderData);
      setNewStatus(orderData.status);

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select(
          `
          id,
          product_id,
          quantity,
          price,
          subtotal,
          products:product_id (name, image_url)
        `
        )
        .eq("order_id", id);

      if (itemsError) throw itemsError;

      setOrderItems(itemsData);

      // Fetch payment history
      const { data: paymentData, error: paymentError } = await supabase
        .from("payment_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false });

      if (paymentError) throw paymentError;

      setPaymentHistory(paymentData);

      // Fetch shipping history
      const { data: shippingData, error: shippingError } = await supabase
        .from("shipping_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false });

      if (shippingError) throw shippingError;

      setShippingHistory(shippingData);
    } catch (error) {
      console.error("Error fetching order data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async () => {
    try {
      setStatusLoading(true);
      setStatusSuccess(false);

      const newUpdatedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: newUpdatedAt,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      const historyItem = {
        order_id: id,
        status: newStatus,
        shipping_details: {
          updated_by: "admin",
          notes: `Status diubah menjadi ${newStatus}`,
        },
      };

      const { error: historyError } = await supabase
        .from("shipping_history")
        .insert(historyItem);

      if (historyError) throw historyError;

      setOrder((prevOrder) => ({
        ...prevOrder,
        status: newStatus,
        updated_at: newUpdatedAt,
      }));

      const { data: newShippingHistory, error: shippingHistoryError } =
        await supabase
          .from("shipping_history")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: false });

      if (shippingHistoryError) {
        console.warn(
          "Gagal mengambil ulang riwayat status:",
          shippingHistoryError
        );
      } else {
        setShippingHistory(newShippingHistory);
      } // --- AKHIR PERUBAHAN ---
      setStatusSuccess(true); // Hide success message after 3 seconds

      setTimeout(() => {
        setStatusSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error updating order status:", error);
      setError(error.message);
    } finally {
      setStatusLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("id-ID", options);
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex items-center">
          <FiAlertTriangle className="text-red-500 mr-3" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <div className="mt-4">
          <button
            onClick={() => navigate("/orders")}
            className="btn btn-outline"
          >
            <FiArrowLeft className="mr-2" />
            Kembali ke Daftar Pesanan
          </button>
        </div>
      </div>
    );
  }

  // If order not found
  if (!order) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
        <div className="flex items-center">
          <FiAlertTriangle className="text-yellow-500 mr-3" />
          <p className="text-sm text-yellow-700">Pesanan tidak ditemukan</p>
        </div>
        <div className="mt-4">
          <button
            onClick={() => navigate("/orders")}
            className="btn btn-outline"
          >
            <FiArrowLeft className="mr-2" />
            Kembali ke Daftar Pesanan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/orders"
            className="inline-flex items-center text-sm text-primary hover:text-primary-dark mb-2"
          >
            <FiArrowLeft className="mr-1" />
            Kembali ke Daftar Pesanan
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Detail Pesanan #{order.order_number}
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center">
          <div className="mr-4">
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="form-input py-2"
              disabled={statusLoading}
            >
              <option value="pending">Menunggu</option>
              <option value="processing">Diproses</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
              <option value="refunded">Dikembalikan</option>
            </select>
            <button
              onClick={updateOrderStatus}
              disabled={statusLoading || newStatus === order.status}
              className="btn btn-primary"
            >
              {statusLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-dark mr-2"></div>
                  <span>Memproses...</span>
                </div>
              ) : (
                "Update Status"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success message */}
      {statusSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex items-center">
            <FiCheck className="text-green-500 mr-3" />
            <p className="text-sm text-green-700">
              Status pesanan berhasil diperbarui
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Informasi Pesanan
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-start mb-4">
                    <FiCalendar className="text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Tanggal Pesanan</p>
                      <p className="font-medium">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start mb-4">
                    <FiUser className="text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Pelanggan</p>
                      <p className="font-medium">
                        {order.profiles?.display_name || "N/A"}
                      </p>

                      <p className="text-sm text-gray-500">
                        {order.profiles?.email || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-start mb-4">
                    <FiCreditCard className="text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Metode Pembayaran</p>
                      <p className="font-medium">{order.payment_method}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <FiMapPin className="text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Alamat Pengiriman</p>
                      {order.shipping_address && (
                        <>
                          <p className="font-medium">
                            {order.shipping_address.recipient_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.shipping_address.phone}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.shipping_address.address},{" "}
                            {order.shipping_address.city},{" "}
                            {order.shipping_address.postal_code}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Item Pesanan
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Produk
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Harga
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Jumlah
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orderItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        Tidak ada item
                      </td>
                    </tr>
                  ) : (
                    orderItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img
                                className="h-10 w-10 rounded-md object-cover"
                                src={
                                  item.products?.image_url ||
                                  "https://via.placeholder.com/40"
                                }
                                alt={item.products?.name}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.products?.name ||
                                  "Produk tidak ditemukan"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPrice(item.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPrice(item.subtotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td
                      colSpan="3"
                      className="px-6 py-3 text-right text-sm font-medium text-gray-500"
                    >
                      Subtotal
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {formatPrice(order.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan="3"
                      className="px-6 py-3 text-right text-sm font-medium text-gray-500"
                    >
                      Biaya Pengiriman
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {formatPrice(order.shipping_cost)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan="3"
                      className="px-6 py-3 text-right text-sm font-medium text-gray-500"
                    >
                      Pajak
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {formatPrice(order.tax)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan="3"
                      className="px-6 py-3 text-right text-sm font-bold text-gray-900"
                    >
                      Total
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900">
                      {formatPrice(order.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Payment History */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <FiCreditCard className="text-gray-400 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">
                  Riwayat Pembayaran
                </h3>
              </div>
            </div>
            <div className="p-6">
              {paymentHistory.length === 0 ? (
                <p className="text-gray-500 text-center">
                  Tidak ada riwayat pembayaran
                </p>
              ) : (
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="border-b border-gray-200 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">
                            {payment.payment_method}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(payment.created_at)}
                          </p>
                        </div>
                        <OrderStatusBadge status={payment.status} />
                      </div>
                      <p className="text-lg font-bold">
                        {formatPrice(payment.amount)}
                      </p>
                      {payment.transaction_id && (
                        <p className="text-sm text-gray-500">
                          ID: {payment.transaction_id}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Shipping History */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <FiPackage className="text-gray-400 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">
                  Riwayat Status
                </h3>
              </div>
            </div>
            <div className="p-6">
              {shippingHistory.length === 0 ? (
                <p className="text-gray-500 text-center">
                  Tidak ada riwayat status
                </p>
              ) : (
                <div className="relative max-h-72 overflow-y-auto pr-2">
                  {/* Timeline line */}
                  <div className="absolute top-0 left-4 bottom-0 w-0.5 bg-gray-200"></div>

                  {/* Timeline items */}
                  <div className="space-y-6">
                    {shippingHistory.map((history, index) => (
                      <div key={history.id} className="relative pl-10">
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <FiPackage className="text-dark" />
                        </div>

                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <OrderStatusBadge status={history.status} />
                              <p className="text-sm text-gray-500 mt-1">
                                {formatDate(history.created_at)}
                              </p>
                            </div>
                          </div>

                          {history.shipping_details?.notes && (
                            <p className="mt-2 text-sm text-gray-600">
                              {history.shipping_details.notes}
                            </p>
                          )}

                          {history.tracking_number && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Nomor Resi:
                              </p>
                              <p className="font-medium">
                                {history.tracking_number}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
