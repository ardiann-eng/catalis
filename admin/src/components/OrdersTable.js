import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  usePagination,
} from "react-table";
import {
  FiEye,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import OrderStatusBadge from "./OrderStatusBadge";

const OrdersTable = ({ orders, loading, onStatusChange }) => {
  const [filterInput, setFilterInput] = useState("");

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
  console.log("Orders data:", orders);

  // Define columns
  const columns = useMemo(
    () => [
      {
        Header: "Order ID",
        accessor: "order_number",
        Cell: ({ value }) => (
          <span className="font-medium text-gray-900">{value}</span>
        ),
      },
      {
        Header: "Tanggal",
        accessor: "created_at",
        Cell: ({ value }) => formatDate(value),
      },
      {
        Header: "Customer",
        accessor: "customer_email",
        Cell: ({ value }) => value || "Anonymous",
      },
      {
        Header: "Total",
        accessor: "total_amount",
        Cell: ({ value }) => formatPrice(value),
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ value }) => <OrderStatusBadge status={value} />,
      },
      {
        Header: "Aksi",
        accessor: "id",
        Cell: ({ value }) => (
          <Link
            to={`/orders/${value}`}
            className="text-primary hover:text-primary-dark"
          >
            <FiEye className="inline-block mr-1" /> Detail
          </Link>
        ),
        disableSortBy: true,
      },
    ],
    []
  );

  // Use the useTable hook to create the table configuration
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    state,
    setGlobalFilter,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
  } = useTable(
    {
      columns,
      data: orders,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  // Update the global filter when the filter input changes
  const handleFilterChange = (e) => {
    const value = e.target.value || "";
    setGlobalFilter(value);
    setFilterInput(value);
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Daftar Pesanan</h3>
          <div className="animate-pulse w-64 h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 border-b border-gray-200"></div>
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-16 border-b border-gray-200"></div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200">
          <div className="animate-pulse w-full h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h3 className="text-lg font-medium text-gray-900">Daftar Pesanan</h3>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              value={filterInput}
              onChange={handleFilterChange}
              placeholder="Cari pesanan..."
              className="form-input pl-10 py-2 w-full"
            />
          </div>
          <select
            onChange={(e) => onStatusChange(e.target.value)}
            className="form-input py-2 w-full sm:w-auto"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="processing">Diproses</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
            <option value="refunded">Dikembalikan</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table
          {...getTableProps()}
          className="min-w-full divide-y divide-gray-200"
        >
          <thead className="bg-gray-50">
            {headerGroups.map((headerGroup) => {
              // 1. Pisahkan 'key' dari props <tr>
              const { key: headerGroupKey, ...otherHeaderGroupProps } =
                headerGroup.getHeaderGroupProps();

              return (
                <tr key={headerGroupKey} {...otherHeaderGroupProps}>
                  {headerGroup.headers.map((column) => {
                    // 2. Pisahkan 'key' dari props <th>
                    const thProps = column.getHeaderProps(
                      column.getSortByToggleProps()
                    );
                    const { key: thKey, ...otherThProps } = thProps;

                    return (
                      <th
                        key={thKey}
                        {...otherThProps}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <div className="flex items-center">
                          {column.render("Header")}
                          <span>
                            {column.isSorted ? (
                              column.isSortedDesc ? (
                                <FiChevronDown className="ml-1" />
                              ) : (
                                <FiChevronUp className="ml-1" />
                              )
                            ) : (
                              ""
                            )}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              );
            })}
          </thead>
          <tbody
            {...getTableBodyProps()}
            className="bg-white divide-y divide-gray-200"
          >
            {page.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-4 text-center text-gray-500"
                >
                  Tidak ada pesanan yang ditemukan
                </td>
              </tr>
            ) : (
              page.map((row) => {
                prepareRow(row);

                // 1. Pisahkan 'key' dari props baris (row)
                const { key: rowKey, ...otherRowProps } = row.getRowProps();

                return (
                  <tr
                    key={rowKey}
                    {...otherRowProps}
                    className="hover:bg-gray-50"
                  >
                    {row.cells.map((cell) => {
                      // 2. Pisahkan 'key' dari props sel (cell)
                      const { key: cellKey, ...otherCellProps } =
                        cell.getCellProps();

                      return (
                        <td
                          key={cellKey}
                          {...otherCellProps}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {cell.render("Cell")}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => previousPage()}
            disabled={!canPreviousPage}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => nextPage()}
            disabled={!canNextPage}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Menampilkan{" "}
              <span className="font-medium">
                {page.length === 0 ? 0 : state.pageIndex * state.pageSize + 1}
              </span>{" "}
              -{" "}
              <span className="font-medium">
                {Math.min(
                  (state.pageIndex + 1) * state.pageSize,
                  orders.length
                )}
              </span>{" "}
              dari <span className="font-medium">{orders.length}</span> hasil
            </p>
          </div>
          <div>
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={() => gotoPage(0)}
                disabled={!canPreviousPage}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">First</span>
                <FiChevronLeft className="h-5 w-5" />
                <FiChevronLeft className="h-5 w-5 -ml-2" />
              </button>
              <button
                onClick={() => previousPage()}
                disabled={!canPreviousPage}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <FiChevronLeft className="h-5 w-5" />
              </button>

              {/* Page numbers */}
              {[...Array(pageCount)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => gotoPage(index)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    state.pageIndex === index
                      ? "z-10 bg-primary border-primary text-dark"
                      : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() => nextPage()}
                disabled={!canNextPage}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <FiChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => gotoPage(pageCount - 1)}
                disabled={!canNextPage}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Last</span>
                <FiChevronRight className="h-5 w-5" />
                <FiChevronRight className="h-5 w-5 -ml-2" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersTable;
