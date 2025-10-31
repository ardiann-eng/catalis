import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FiHome, 
  FiShoppingBag, 
  FiUsers, 
  FiPackage, 
  FiMenu, 
  FiX, 
  FiLogOut,
  FiBell,
  FiUser
} from 'react-icons/fi';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const closeSidebar = () => {
    setSidebarOpen(false);
  };
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={closeSidebar}
        ></div>
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center">
            <img src="/logo.png" alt="Catalis" className="h-8 w-auto" />
            <h1 className="ml-3 text-xl font-bold text-gray-800">Catalis Admin</h1>
          </div>
          <button 
            onClick={closeSidebar}
            className="lg:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <FiX size={24} />
          </button>
        </div>
        
        <nav className="px-4 py-6">
          <ul className="space-y-2">
            <li>
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
                onClick={closeSidebar}
              >
                <FiHome size={20} />
                <span>Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/orders" 
                className={({ isActive }) => 
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
                onClick={closeSidebar}
              >
                <FiShoppingBag size={20} />
                <span>Pesanan</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/products" 
                className={({ isActive }) => 
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
                onClick={closeSidebar}
              >
                <FiPackage size={20} />
                <span>Produk</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/users" 
                className={({ isActive }) => 
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
                onClick={closeSidebar}
              >
                <FiUsers size={20} />
                <span>Pengguna</span>
              </NavLink>
            </li>
          </ul>
        </nav>
        
        <div className="absolute bottom-0 w-full border-t p-4">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center px-4 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
          >
            <FiLogOut size={20} className="mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden text-gray-500 focus:outline-none"
            >
              <FiMenu size={24} />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="text-gray-500 hover:text-gray-700 focus:outline-none">
                  <FiBell size={20} />
                </button>
              </div>
              
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-dark font-medium">
                  {user?.email?.charAt(0).toUpperCase() || <FiUser />}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:block">
                  {user?.email || 'Admin'}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;