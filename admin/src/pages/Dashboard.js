import React, { useState, useEffect } from "react";
import {
  FiShoppingBag,
  FiDollarSign,
  FiUsers,
  FiPackage,
  FiCalendar,
  FiAlertTriangle, // Tambahkan ini
} from "react-icons/fi";
import supabase from "../lib/supabase";
import StatCard from "../components/StatCard";
import SalesChart from "../components/SalesChart";
import OrderStatusChart from "../components/OrderStatusChart";
import RecentOrdersTable from "../components/RecentOrdersTable";

const Dashboard = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // <-- TAMBAHKAN
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesData, setSalesData] = useState(null);
  const [orderStatusData, setOrderStatusData] = useState(null);
  const [period, setPeriod] = useState("weekly"); // daily, weekly, monthly // Fetch dashboard data

  useEffect(() => {
    // BUAT FUNGSI WRAPPER UNTUK CEK AUTH
    const checkAuthAndFetch = async () => {
      try {
        setLoading(true);
        setError(null); // Reset error

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
        } // 2. SESI VALID, LANJUTKAN FETCH

        console.log("Session valid, fetching dashboard data...");
        await Promise.all([
          fetchStats(),
          fetchRecentOrders(),
          fetchSalesData(period),
          fetchOrderStatusData(),
        ]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError(error.message); // Tampilkan RLS error jika ada
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, [period]); // Fetch stats

  const fetchStats = async () => {
    try {
      // Total revenue
      const { data: revenueData, error: revenueError } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "completed");

      if (revenueError) throw revenueError;

      const totalRevenue = revenueData.reduce(
        (sum, order) => sum + order.total_amount,
        0
      ); // Total orders

      const { count: totalOrders, error: ordersError } = await supabase
        .from("orders")
        .select("id", { count: "exact" });

      if (ordersError) throw ordersError; // Total customers

      const { count: totalCustomers, error: customersError } = await supabase
        .from("profiles")
        .select("id", { count: "exact" });

      if (customersError) throw customersError; // Total products

      const { count: totalProducts, error: productsError } = await supabase
        .from("products")
        .select("id", { count: "exact" });

      if (productsError) throw productsError;

      setStats({
        totalRevenue,
        totalOrders,
        totalCustomers,
        totalProducts,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Lempar error agar ditangkap oleh Promise.all
      throw new Error(`Error fetching stats: ${error.message}`);
    }
  }; // Fetch recent orders

  const fetchRecentOrders = async () => {
    try {
      const { data, error } = await supabase
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
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!data) {
        setRecentOrders([]);
        return;
      } // Cari orders yang tidak punya relasi profiles

      const missing = data.filter((o) => !o.profiles);
      const missingUserIds = [
        ...new Set(missing.map((o) => o.user_id).filter(Boolean)),
      ]; // Ambil profil fallback berdasarkan user_id

      let profilesById = {};
      if (missingUserIds.length > 0) {
        const { data: fallbackProfiles, error: fallbackError } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", missingUserIds);

        if (fallbackError)
          console.warn("Error fetching fallback profiles:", fallbackError);
        else {
          profilesById = fallbackProfiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      } // Transform data

      const transformedData = data.map((order) => {
        const relProfile = order.profiles ?? null;
        const fallbackProfile = relProfile
          ? null
          : profilesById[order.user_id] || null;
        const finalProfile = relProfile || fallbackProfile;

        return {
          ...order,
          customer_name:
            finalProfile?.display_name || finalProfile?.email || "Anonymous",
          customer_email: finalProfile?.email || "Tidak ada email",
        };
      });

      setRecentOrders(transformedData);
    } catch (error) {
      console.error("Error fetching recent orders:", error);
      throw new Error(`Error fetching recent orders: ${error.message}`);
    }
  }; // Fetch sales data

  const fetchSalesData = async (period) => {
    try {
      let query = supabase
        .from("orders")
        .select("created_at, total_amount")
        .eq("status", "completed"); // Get date range based on period

      const now = new Date();
      let startDate;

      switch (period) {
        case "daily": // Last 7 days
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "weekly": // Last 8 weeks
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 56); // 8 weeks * 7 days
          break;
        case "monthly": // Last 6 months
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 6);
          break;
        default:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
      }

      query = query.gte("created_at", startDate.toISOString());

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setSalesData(null); // Set null jika tidak ada data
        return;
      } // Process data based on period

      const processedData = processChartData(data, period);
      setSalesData(processedData);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      throw new Error(`Error fetching sales data: ${error.message}`);
    }
  }; // Process chart data

  const processChartData = (data, period) => {
    // ... (fungsi ini tidak perlu diubah) ...
    // Group data by period
    const groupedData = {};

    data.forEach((order) => {
      const date = new Date(order.created_at);
      let key;

      switch (period) {
        case "daily": // Format: "Jan 1"
          key = date.toLocaleDateString("id-ID", {
            month: "short",
            day: "numeric",
          });
          break;
        case "weekly": // Get week number and year
          const weekNumber = getWeekNumber(date);
          key = `W${weekNumber}`;
          break;
        case "monthly": // Format: "Jan 2023"
          key = date.toLocaleDateString("id-ID", {
            month: "short",
            year: "numeric",
          });
          break;
        default:
          key = date.toLocaleDateString("id-ID", {
            month: "short",
            day: "numeric",
          });
      }

      if (!groupedData[key]) {
        groupedData[key] = 0;
      }

      groupedData[key] += order.total_amount;
    }); // Sort keys based on period

    const sortedKeys = Object.keys(groupedData).sort((a, b) => {
      if (period === "weekly") {
        // Sort by week number
        return parseInt(a.substring(1)) - parseInt(b.substring(1));
      } // For daily and monthly, convert to date and sort // Perlu logika parsing yang lebih baik untuk "Jan 1" atau "Jan 2023"

      // Untuk saat ini, kita biarkan, tapi idealnya ini perlu perbaikan
      try {
        const dateA = new Date(a);
        const dateB = new Date(b);
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return dateA - dateB;
        }
      } catch (e) {
        // fallback to string sort
      }
      return a.localeCompare(b);
    }); // Prepare chart data

    return {
      labels: sortedKeys,
      datasets: [
        {
          label: "Penjualan",
          data: sortedKeys.map((key) => groupedData[key]),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }; // Get week number

  const getWeekNumber = (date) => {
    // ... (fungsi ini tidak perlu diubah) ...
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }; // Fetch order status data

  const fetchOrderStatusData = async () => {
    try {
      const { data, error } = await supabase.from("orders").select("status");

      if (error) throw error;

      if (!data || data.length === 0) {
        setOrderStatusData(null); // Set null jika tidak ada data
        return;
      } // Count orders by status

      const statusCounts = {
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
        refunded: 0,
      };

      data.forEach((order) => {
        if (statusCounts.hasOwnProperty(order.status)) {
          statusCounts[order.status]++;
        }
      }); // Prepare chart data

      setOrderStatusData({
        labels: [
          "Menunggu",
          "Diproses",
          "Selesai",
          "Dibatalkan",
          "Dikembalikan",
        ],
        datasets: [
          {
            data: [
              statusCounts.pending,
              statusCounts.processing,
              statusCounts.completed,
              statusCounts.cancelled,
              statusCounts.refunded,
            ],
            backgroundColor: [
              "#FBBF24", // yellow for pending
              "#60A5FA", // blue for processing
              "#34D399", // green for completed
              "#F87171", // red for cancelled
              "#9CA3AF", // gray for refunded
            ],
            borderWidth: 0,
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching order status data:", error);
      throw new Error(`Error fetching order status data: ${error.message}`);
    }
  }; // Format currency

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }; // Handle period change

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  // Tampilkan error jika ada
  if (error) {
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
    <div>
      {/* ... sisa JSX ... */}{" "}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>{" "}
        <p className="text-gray-500">
          Ringkasan statistik dan performa toko Anda{" "}
        </p>{" "}
      </div>
      {/* Stats Cards */}{" "}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {" "}
        <StatCard
          title="Total Pendapatan"
          value={formatCurrency(stats.totalRevenue)}
          icon={<FiDollarSign className="text-primary" size={20} />}
          loading={loading}
        />{" "}
        <StatCard
          title="Total Pesanan"
          value={stats.totalOrders}
          icon={<FiShoppingBag className="text-blue-500" size={20} />}
          loading={loading}
        />{" "}
        <StatCard
          title="Total Pelanggan"
          value={stats.totalCustomers}
          icon={<FiUsers className="text-purple-500" size={20} />}
          loading={loading}
        />{" "}
        <StatCard
          title="Total Produk"
          value={stats.totalProducts}
          icon={<FiPackage className="text-green-500" size={20} />}
          loading={loading}
        />{" "}
      </div>
      {/* Charts */}{" "}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {" "}
        <div className="lg:col-span-2">
          {" "}
          <div className="bg-white rounded-xl shadow-md p-6">
            {" "}
            <div className="flex items-center justify-between mb-4">
              {" "}
              <h3 className="text-lg font-medium text-gray-900">
                Grafik Penjualan{" "}
              </h3>{" "}
              <div className="flex flex-wrap gap-2">
                {" "}
                <button
                  onClick={() => handlePeriodChange("daily")}
                  className={`px-3 py-1 text-xs rounded-md ${
                    period === "daily"
                      ? "bg-primary text-dark"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {" "}
                  <FiCalendar className="inline mr-1" size={12} />
                  Harian{" "}
                </button>{" "}
                <button
                  onClick={() => handlePeriodChange("weekly")}
                  className={`px-3 py-1 text-xs rounded-md ${
                    period === "weekly"
                      ? "bg-primary text-dark"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {" "}
                  <FiCalendar className="inline mr-1" size={12} />
                  Mingguan{" "}
                </button>{" "}
                <button
                  onClick={() => handlePeriodChange("monthly")}
                  className={`px-3 py-1 text-xs rounded-md ${
                    period === "monthly"
                      ? "bg-primary text-dark"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {" "}
                  <FiCalendar className="inline mr-1" size={12} />
                  Bulanan{" "}
                </button>{" "}
              </div>{" "}
            </div>{" "}
            <div className="h-64 sm:h-72 lg:h-80">
              {" "}
              {salesData ? (
                <SalesChart
                  data={salesData}
                  period={period}
                  loading={loading}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  {" "}
                  <p className="text-gray-400">Tidak ada data penjualan</p>{" "}
                </div>
              )}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          {orderStatusData ? (
            <OrderStatusChart data={orderStatusData} loading={loading} />
          ) : (
            <div className="bg-white rounded-xl shadow-md p-6 h-full flex items-center justify-center">
              {" "}
              <p className="text-gray-400">
                Tidak ada data status pesanan
              </p>{" "}
            </div>
          )}{" "}
        </div>{" "}
      </div>
      {/* Recent Orders */}{" "}
      <div className="mb-6">
        <RecentOrdersTable orders={recentOrders} loading={loading} />{" "}
      </div>{" "}
    </div>
  );
};

export default Dashboard;
