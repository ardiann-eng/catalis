import React, { useState, useEffect } from "react";
import supabase from "../lib/supabase";
import OrdersTable from "../components/OrdersTable";
import { FiFilter, FiRefreshCw } from "react-icons/fi";

const Orders = () => {
  // State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all"); // all, today, week, month
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
    refunded: 0,
  });

  // Fetch orders
  useEffect(() => {
    fetchOrders(true);
  }, [statusFilter, dateRange]);

  // Listener untuk refetch saat window/tab kembali aktif
  useEffect(() => {
    // Fungsi ini akan dipanggil saat user kembali ke tab ini
    const handleFocus = () => {
      console.log("Window focused, refetching orders...");
      // Kita panggil fetchOrders(false) agar data di-refresh
      // di latar belakang TANPA spinner berkedip.
      fetchOrders(false);
    };

    // Tambahkan event listener
    window.addEventListener("focus", handleFocus);

    // Fungsi cleanup
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Fetch orders from Supabase
  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      // Build query
      let query = supabase
        .from("orders")
        .select(
          `
  id,
  order_number,
  user_id,
  status,
  total_amount,
  created_at,
  profiles(display_name, email)
`
        )
        .order("created_at", { ascending: false });

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply date filter
      if (dateRange !== "all") {
        const now = new Date();
        let startDate;

        switch (dateRange) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case "month":
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
          default:
            startDate = null;
        }

        if (startDate) {
          query = query.gte("created_at", startDate.toISOString());
        }
      }

      // Execute query
      const { data, error } = await query;

      if (error) throw error;

      // Optional: lihat hasil mentah (bantu debugging)
      console.log("orders raw:", data);

      // Cari orders yang tidak punya order.profiles (null)
      const ordersMissingProfiles = data.filter((o) => !o.profiles);

      // Kumpulkan user_id unik untuk yang missing profiles
      const missingUserIds = [
        ...new Set(ordersMissingProfiles.map((o) => o.user_id).filter(Boolean)),
      ];

      // Ambil profiles batch untuk user_id yang terdaftar sebagai profiles.id
      let profilesById = {};
      if (missingUserIds.length > 0) {
        const { data: missingProfiles, error: missingProfilesError } =
          await supabase
            .from("profiles")
            .select("id, display_name, email")
            .in("id", missingUserIds);

        if (missingProfilesError) {
          console.warn(
            "Error fetching missing profiles:",
            missingProfilesError
          );
        } else {
          profilesById = missingProfiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      // Transform data to include user email (merge fallback)
      const transformedData = data.map((order) => {
        // prefer relasi langsung (order.profiles) — ini ada kalau profile_id terisi
        const profileFromRelation = order.profiles ?? null;

        // jika tidak ada, coba cari di profilesById menggunakan user_id
        const profileFromLookup =
          !profileFromRelation && order.user_id
            ? profilesById[order.user_id] || null
            : null;

        const finalProfile = profileFromRelation || profileFromLookup;

        return {
          ...order,
          customer_name:
            finalProfile?.display_name || finalProfile?.email || "Anonymous",
          customer_email: finalProfile?.email || "Tidak ada email",
        };
      });

      setOrders(transformedData);

      // Fetch order stats
      await fetchOrderStats();
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch order stats
  const fetchOrderStats = async () => {
    try {
      // Get total count
      const { count: total, error: totalError } = await supabase
        .from("orders")
        .select("id", { count: "exact" });

      if (totalError) throw totalError;

      // Get counts by status
      const statuses = [
        "pending",
        "processing",
        "completed",
        "cancelled",
        "refunded",
      ];
      const statusCounts = {};

      for (const status of statuses) {
        const { count, error } = await supabase
          .from("orders")
          .select("id", { count: "exact" })
          .eq("status", status);

        if (error) throw error;

        statusCounts[status] = count;
      }

      setStats({
        total,
        ...statusCounts,
      });
    } catch (error) {
      console.error("Error fetching order stats:", error);
    }
  };

  // Handle status filter change
  const handleStatusChange = (status) => {
    setStatusFilter(status);
  };

  // Handle date range change
  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchOrders(true);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manajemen Pesanan
          </h1>
          <p className="text-gray-500">Kelola dan pantau semua pesanan</p>
        </div>
        <button
          onClick={handleRefresh}
          className="mt-4 sm:mt-0 btn btn-outline flex items-center"
          disabled={loading}
        >
          <FiRefreshCw className={`mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div
          className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer border-2 ${
            statusFilter === "all" ? "border-primary" : "border-transparent"
          }`}
          onClick={() => handleStatusChange("all")}
        >
          <p className="text-sm text-gray-500">Semua</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div
          className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer border-2 ${
            statusFilter === "pending" ? "border-primary" : "border-transparent"
          }`}
          onClick={() => handleStatusChange("pending")}
        >
          <p className="text-sm text-gray-500">Menunggu</p>
          <p className="text-xl font-bold">{stats.pending}</p>
        </div>
        <div
          className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer border-2 ${
            statusFilter === "processing"
              ? "border-primary"
              : "border-transparent"
          }`}
          onClick={() => handleStatusChange("processing")}
        >
          <p className="text-sm text-gray-500">Diproses</p>
          <p className="text-xl font-bold">{stats.processing}</p>
        </div>
        <div
          className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer border-2 ${
            statusFilter === "completed"
              ? "border-primary"
              : "border-transparent"
          }`}
          onClick={() => handleStatusChange("completed")}
        >
          <p className="text-sm text-gray-500">Selesai</p>
          <p className="text-xl font-bold">{stats.completed}</p>
        </div>
        <div
          className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer border-2 ${
            statusFilter === "cancelled"
              ? "border-primary"
              : "border-transparent"
          }`}
          onClick={() => handleStatusChange("cancelled")}
        >
          <p className="text-sm text-gray-500">Dibatalkan</p>
          <p className="text-xl font-bold">{stats.cancelled}</p>
        </div>
        <div
          className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer border-2 ${
            statusFilter === "refunded"
              ? "border-primary"
              : "border-transparent"
          }`}
          onClick={() => handleStatusChange("refunded")}
        >
          <p className="text-sm text-gray-500">Dikembalikan</p>
          <p className="text-xl font-bold">{stats.refunded}</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center mb-4">
            <FiFilter className="text-gray-500 mr-2" />
            <h3 className="text-lg font-medium">Filter Tanggal</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleDateRangeChange("all")}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm ${
                dateRange === "all"
                  ? "bg-primary text-dark"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Semua Waktu
            </button>
            <button
              onClick={() => handleDateRangeChange("today")}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm ${
                dateRange === "today"
                  ? "bg-primary text-dark"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => handleDateRangeChange("week")}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm ${
                dateRange === "week"
                  ? "bg-primary text-dark"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => handleDateRangeChange("month")}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm ${
                dateRange === "month"
                  ? "bg-primary text-dark"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              30 Hari Terakhir
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <OrdersTable
        orders={orders}
        loading={loading}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default Orders;
