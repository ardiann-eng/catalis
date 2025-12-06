import React from "react";
import { Link } from "react-router-dom";
import { FiEye, FiClock } from "react-icons/fi";

const RecentOrdersTable = ({ orders, loading }) => {
  // Format date
  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "short",
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

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "badge-warning";
      case "processing":
        return "badge-info";
      case "completed":
        return "badge-success";
      case "cancelled":
        return "badge-danger";
      case "refunded":
        return "badge-gray";
      default:
        return "badge-gray";
    }
  };

  // Get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Menunggu";
      case "processing":
        return "Diproses";
      case "completed":
        return "Selesai";
      case "cancelled":
        return "Dibatalkan";
      case "refunded":
        return "Dikembalikan";
      default:
        return status;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Pesanan Terbaru</h3>
        </div>
        <div className="animate-pulse">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="p-6 border-b border-gray-200 flex items-center space-x-4"
            >
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="w-24">
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="w-24">
                <div className="h-6 bg-gray-200 rounded"></div>
              </div>
              <div className="w-8">
                <div className="h-8 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Pesanan Terbaru</h3>
      </div>
      {orders.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <FiClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p>Belum ada pesanan</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Order ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Tanggal
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Customer
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Total
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.customer_email || "Anonymous"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPrice(order.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`badge ${getStatusBadgeClass(order.status)}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/orders/${order.id}`}
                      className="text-primary hover:text-primary-dark"
                    >
                      <FiEye className="inline-block" /> Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="p-4 border-t border-gray-200 text-center">
        <Link
          to="/orders"
          className="text-sm font-medium text-primary hover:text-primary-dark"
        >
          Lihat Semua Pesanan
        </Link>
      </div>
    </div>
  );
};

export default RecentOrdersTable;
