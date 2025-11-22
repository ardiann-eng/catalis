import React from 'react';

const OrderStatusBadge = ({ status }) => {
  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'processing':
        return 'badge-info';
      case 'completed':
        return 'badge-success';
      case 'cancelled':
        return 'badge-danger';
      case 'refunded':
        return 'badge-gray';
      default:
        return 'badge-gray';
    }
  };

  // Get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Menunggu';
      case 'processing':
        return 'Diproses';
      case 'completed':
        return 'Selesai';
      case 'cancelled':
        return 'Dibatalkan';
      case 'refunded':
        return 'Dikembalikan';
      default:
        return status;
    }
  };

  return (
    <span className={`badge ${getStatusBadgeClass(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
};

export default OrderStatusBadge;