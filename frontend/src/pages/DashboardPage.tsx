import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Product, Customer, Order } from "../types";

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Product[]>("/products/"),
      api.get<Customer[]>("/customers/"),
      api.get<Order[]>("/orders/"),
    ])
      .then(([p, c, o]) => {
        setProducts(p.data);
        setCustomers(c.data);
        setOrders(o.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const lowStock = products.filter((p) => p.stock < 10).length;

  const stats = [
    { label: "Products", value: products.length, color: "bg-brand-50 text-brand-700" },
    { label: "Customers", value: customers.length, color: "bg-emerald-50 text-emerald-700" },
    { label: "Orders", value: orders.length, color: "bg-amber-50 text-amber-700" },
    { label: "Revenue", value: `$${totalRevenue.toFixed(2)}`, color: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="card">
                <div className={`inline-flex px-2 py-1 rounded text-xs font-medium ${s.color}`}>{s.label}</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
              {orders.length === 0 ? (
                <p className="text-sm text-slate-500">No orders yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {orders.slice(0, 5).map((o) => (
                    <li key={o.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">Order #{o.id}</div>
                        <div className="text-sm text-slate-500">{o.customer?.name || `Customer ${o.customer_id}`}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${o.total_amount.toFixed(2)}</div>
                        <div className="text-xs text-slate-500 capitalize">{o.status}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">
                Low Stock {lowStock > 0 && <span className="text-red-600 text-sm">({lowStock})</span>}
              </h2>
              {products.length === 0 ? (
                <p className="text-sm text-slate-500">No products yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {[...products]
                    .sort((a, b) => a.stock - b.stock)
                    .slice(0, 5)
                    .map((p) => (
                      <li key={p.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-sm text-slate-500">SKU: {p.sku}</div>
                        </div>
                        <span
                          className={`badge ${
                            p.stock === 0
                              ? "bg-red-100 text-red-700"
                              : p.stock < 10
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {p.stock} in stock
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
