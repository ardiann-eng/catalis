import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  usePagination,
} from "react-table";
import {
  FiEdit2,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
} from "react-icons/fi";

const ProductsTable = ({ products, loading, onDelete, onCategoryChange }) => {
  const [filterInput, setFilterInput] = useState("");

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Define columns
  const columns = useMemo(
    () => [
      {
        Header: "Produk",
        accessor: "name",
        Cell: ({ row }) => (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
              <img
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-md object-cover"
                src={row.original.image_url || "https://via.placeholder.com/40"}
                alt={row.original.name}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                {row.original.name}
              </div>
            </div>
          </div>
        ),
      },
      {
        Header: "Kategori",
        accessor: "category",
        Cell: ({ value }) => (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100">
            {value || "Uncategorized"}
          </span>
        ),
      },
      {
        Header: "Harga",
        accessor: "price",
        Cell: ({ value }) => formatPrice(value || 0),
      },
      {
        Header: "Stok",
        accessor: "stock",
        Cell: ({ value }) => {
          const stock = value || 0;
          let stockClass = "text-gray-500";

          if (stock <= 0) {
            stockClass = "text-red-500 font-medium";
          } else if (stock < 10) {
            stockClass = "text-yellow-500 font-medium";
          } else {
            stockClass = "text-green-500 font-medium";
          }

          return <span className={stockClass}>{stock}</span>;
        },
      },
      {
        Header: "Aksi",
        accessor: "id",
        Cell: ({ value }) => (
          <div className="flex gap-2 sm:gap-3">
            <Link
              to={`/products/edit/${value}`}
              className="text-blue-500 hover:text-blue-700 transition-colors p-1"
              title="Edit"
            >
              <FiEdit2 className="w-4 h-4" />
            </Link>
            <button
              onClick={() => onDelete(value)}
              className="text-red-500 hover:text-red-700 transition-colors p-1"
              title="Hapus"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
            <Link
              to={`/products/${value}`}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1"
              title="Detail"
            >
              <FiEye className="w-4 h-4" />
            </Link>
          </div>
        ),
        disableSortBy: true,
      },
    ],
    [onDelete]
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
      data: products,
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
          <h3 className="text-lg font-medium text-gray-900">Daftar Produk</h3>
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
        <h3 className="text-lg font-medium text-gray-900">Daftar Produk</h3>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              value={filterInput}
              onChange={handleFilterChange}
              placeholder="Cari produk..."
              className="form-input pl-10 py-2 w-full"
            />
          </div>
          <select
            onChange={(e) => onCategoryChange(e.target.value)}
            className="form-input py-2 w-full sm:w-auto max-w-xs"
          >
            <option value="all">Semua Kategori</option>
            {/* Get unique categories */}
            {[
              ...new Set(
                products.map((product) => product.category).filter(Boolean)
              ),
            ].map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
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
              // REVISI (Peringatan baris 205): Pisahkan 'key' dari props <tr>
              const { key: headerGroupKey, ...otherHeaderGroupProps } =
                headerGroup.getHeaderGroupProps();

              return (
                <tr key={headerGroupKey} {...otherHeaderGroupProps}>
                  {headerGroup.headers.map((column) => {
                    // REVISI (Peringatan baris 207): Pisahkan 'key' dari props <th>
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
                  Tidak ada produk yang ditemukan
                </td>
              </tr>
            ) : (
              page.map((row) => {
                prepareRow(row);

                // REVISI (Peringatan baris 242): Pisahkan 'key' dari props <tr>
                const { key: rowKey, ...otherRowProps } = row.getRowProps();

                return (
                  <tr
                    key={rowKey}
                    {...otherRowProps}
                    className="hover:bg-gray-50"
                  >
                    {row.cells.map((cell) => {
                      // REVISI (Peringatan baris 243): Pisahkan 'key' dari props <td>
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
                  products.length
                )}
              </span>{" "}
              dari <span className="font-medium">{products.length}</span> hasil
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

export default ProductsTable;
