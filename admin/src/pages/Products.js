import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import supabase from "../lib/supabase";
import ProductsTable from "../components/ProductsTable";
import { FiPlus, FiRefreshCw, FiAlertTriangle } from "react-icons/fi";

const Products = () => {
  // State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // <-- TAMBAHKAN
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    outOfStock: 0,
    lowStock: 0,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false); // Fetch products

  useEffect(() => {
    // BUAT FUNGSI WRAPPER UNTUK CEK AUTH
    const checkAuthAndFetch = async () => {
      setLoading(true);
      setError(null);

      // 1. CEK SESI DULU
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.warn("No session, user logged out.");
        setLoading(false);
        setError("Sesi tidak ditemukan. Silakan login kembali.");
        return; // Stop
      }

      // 2. SESI VALID, LANJUTKAN FETCH
      console.log("Session valid, fetching products...");
      await fetchProducts();
    };

    checkAuthAndFetch();
  }, [categoryFilter]); // Fetch products from Supabase

  const fetchProducts = async () => {
    try {
      // Hapus setLoading(true) dan setError(null) dari sini
      // Build query
      let query = supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false }); // Apply category filter
      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      } // Execute query
      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []); // Calculate stats
      const total = data.length;
      const outOfStock = data.filter(
        (product) => !product.stock || product.stock <= 0
      ).length;
      const lowStock = data.filter(
        (product) => product.stock > 0 && product.stock < 10
      ).length;
      setStats({
        total,
        outOfStock,
        lowStock,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(error.message); // Set error di state
    } finally {
      setLoading(false); // Pindahkan setLoading(false) ke sini
    }
  }; // ... (handler lain tidak berubah) ...
  const handleCategoryChange = (category) => {
    setCategoryFilter(category);
  }; // Handle refresh
  const handleRefresh = () => {
    // Bungkus fetchProducts dengan checkAuthAndFetch
    const checkAuthAndFetch = async () => {
      setLoading(true);
      setError(null);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setLoading(false);
        setError("Sesi tidak ditemukan. Silakan login kembali.");
        return;
      }
      await fetchProducts();
    };
    checkAuthAndFetch();
  }; // Handle delete
  const handleDelete = (productId) => {
    setProductToDelete(productId);
    setShowDeleteModal(true);
  }; // Confirm delete (Ini sudah aman karena dipicu oleh user)
  const confirmDelete = async () => {
    try {
      setDeleteLoading(true); // Delete product
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete);
      if (error) throw error; // Close modal
      setShowDeleteModal(false);
      setProductToDelete(null); // Refresh products
      handleRefresh(); // Panggil handleRefresh agar ada auth check
    } catch (error) {
      console.error("Error deleting product:", error);
      setError(error.message);
    } finally {
      setDeleteLoading(false);
    }
  }; // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  // Tampilkan error jika ada
  if (error && !showDeleteModal) {
    // Jangan tampilkan error utama jika modal aktif
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex items-center">
          <FiAlertTriangle className="text-red-500 mr-3" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }
  return (
    // ... (sisa JSX tidak berubah) ...
    <div>
      {" "}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-bold text-gray-900">
            Manajemen Produk
          </h1>{" "}
          <p className="text-gray-500">Kelola dan pantau semua produk</p>{" "}
        </div>{" "}
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          {" "}
          <button
            onClick={handleRefresh}
            className="btn btn-outline flex items-center"
            disabled={loading}
          >
            {" "}
            <FiRefreshCw className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh{" "}
          </button>{" "}
          <Link
            to="/products/new"
            className="btn btn-primary flex items-center"
          >
            <FiPlus className="mr-2" /> Tambah Produk{" "}
          </Link>{" "}
        </div>{" "}
      </div>{" "}
      {/* Error message (Pindahkan ke atas agar terlihat jika komponen lain error) */}{" "}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          {" "}
          <div className="flex items-center">
            <FiAlertTriangle className="text-red-500 mr-3" />
            <p className="text-sm text-red-700">{error}</p>{" "}
          </div>{" "}
        </div>
      )}
      {/* Product Stats */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {" "}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Produk</p>
          <p className="text-xl font-bold">{stats.total}</p>{" "}
        </div>{" "}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Stok Habis</p>{" "}
          <p className="text-xl font-bold text-red-500">{stats.outOfStock}</p>{" "}
        </div>{" "}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Stok Menipis</p>{" "}
          <p className="text-xl font-bold text-yellow-500">{stats.lowStock}</p>{" "}
        </div>{" "}
      </div>
      {/* Products Table */}{" "}
      <ProductsTable
        products={products}
        loading={loading}
        onDelete={handleDelete}
        onCategoryChange={handleCategoryChange}
      />
      {/* Delete Confirmation Modal */}{" "}
      {showDeleteModal && (
        // ... (JSX Modal tidak berubah) ...
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {" "}
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {" "}
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              {" "}
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>{" "}
            </div>{" "}
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>{" "}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {" "}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                {" "}
                <div className="sm:flex sm:items-start">
                  {" "}
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    {" "}
                    <FiAlertTriangle className="h-6 w-6 text-red-600" />{" "}
                  </div>{" "}
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    {" "}
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Hapus Produk{" "}
                    </h3>{" "}
                    <div className="mt-2">
                      {" "}
                      <p className="text-sm text-gray-500">
                        Apakah Anda yakin ingin menghapus produk ini? Tindakan
                        ini tidak dapat dibatalkan.{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {" "}
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                >
                  {" "}
                  {deleteLoading ? (
                    <div className="flex items-center">
                      {" "}
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      <span>Memproses...</span>{" "}
                    </div>
                  ) : (
                    "Hapus"
                  )}{" "}
                </button>{" "}
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={cancelDelete}
                  disabled={deleteLoading}
                >
                  Batal{" "}
                </button>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
};

export default Products;
