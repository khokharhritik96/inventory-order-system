import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import ProductsPage from "./pages/ProductsPage";
import CustomersPage from "./pages/CustomersPage";
import OrdersPage from "./pages/OrdersPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
      isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between h-14 sm:h-16 gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
              IO
            </div>
            <span className="font-bold text-slate-900 hidden md:block">Inventory & Orders</span>
          </div>
          <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
            <NavLink to="/" end className={linkClass}>Home</NavLink>
            <NavLink to="/products" className={linkClass}>Products</NavLink>
            <NavLink to="/customers" className={linkClass}>Customers</NavLink>
            <NavLink to="/orders" className={linkClass}>Orders</NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          Inventory & Order Management System
        </div>
      </footer>
    </div>
  );
}
