import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api, extractError } from "../api/client";
import { Order, Product, Customer, OrderItemInput } from "../types";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";

interface DraftItem {
  product_id: number | "";
  quantity: number;
}

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const statusColor = (s: string) =>
  ({
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    shipped: "bg-indigo-100 text-indigo-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  }[s] || "bg-slate-100 text-slate-700");

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [items, setItems] = useState<DraftItem[]>([{ product_id: "", quantity: 1 }]);
  const [saving, setSaving] = useState(false);

  const productsById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const load = async () => {
    setLoading(true);
    try {
      const [o, p, c] = await Promise.all([
        api.get<Order[]>("/orders/"),
        api.get<Product[]>("/products/"),
        api.get<Customer[]>("/customers/"),
      ]);
      setOrders(o.data);
      setProducts(p.data);
      setCustomers(c.data);
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setCustomerId("");
    setItems([{ product_id: "", quantity: 1 }]);
    setModalOpen(true);
  };

  const total = items.reduce((sum, it) => {
    if (it.product_id === "") return sum;
    const p = productsById[it.product_id];
    return sum + (p ? p.price * it.quantity : 0);
  }, 0);

  const save = async () => {
    if (customerId === "") {
      toast.error("Select a customer");
      return;
    }
    const validItems: OrderItemInput[] = items
      .filter((it) => it.product_id !== "" && it.quantity > 0)
      .map((it) => ({ product_id: it.product_id as number, quantity: it.quantity }));
    if (validItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    setSaving(true);
    try {
      await api.post("/orders/", { customer_id: customerId, items: validItems });
      toast.success("Order placed");
      setModalOpen(false);
      load();
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (order: Order, status: string) => {
    try {
      const { data } = await api.patch<Order>(`/orders/${order.id}/status`, { status });
      toast.success(`Order #${order.id} → ${status}`);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? data : o)));
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        action={
          <button
            className="btn-primary w-full sm:w-auto"
            onClick={openCreate}
            disabled={customers.length === 0 || products.length === 0}
          >
            + New Order
          </button>
        }
      />

      {(customers.length === 0 || products.length === 0) && !loading && (
        <div className="card mb-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            You need at least one customer and one product before placing orders.
          </p>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : orders.length === 0 ? (
          <EmptyState title="No orders yet" message="Place your first order to see it here." />
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="sm:hidden divide-y divide-slate-100">
              {orders.map((o) => (
                <li key={o.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">Order #{o.id}</div>
                      <div className="text-sm text-slate-500 truncate">{o.customer?.name || "—"}</div>
                      <div className="text-xs text-slate-500">{o.items.length} item{o.items.length === 1 ? "" : "s"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-slate-900">${o.total_amount.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <select
                      className={`badge border-0 cursor-pointer ${statusColor(o.status)}`}
                      value={o.status}
                      onChange={(e) => changeStatus(o, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setDetailOrder(o)}>
                      View
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Order #</th>
                    <th className="text-left px-6 py-3 font-medium">Customer</th>
                    <th className="text-left px-6 py-3 font-medium">Items</th>
                    <th className="text-right px-6 py-3 font-medium">Total</th>
                    <th className="text-left px-6 py-3 font-medium">Status</th>
                    <th className="text-right px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium">#{o.id}</td>
                      <td className="px-6 py-3">{o.customer?.name || "—"}</td>
                      <td className="px-6 py-3">{o.items.length}</td>
                      <td className="px-6 py-3 text-right">${o.total_amount.toFixed(2)}</td>
                      <td className="px-6 py-3">
                        <select
                          className={`badge border-0 cursor-pointer ${statusColor(o.status)}`}
                          value={o.status}
                          onChange={(e) => changeStatus(o, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => setDetailOrder(o)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal open={modalOpen} title="New Order" onClose={() => setModalOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-4"
        >
          <div>
            <label className="label">Customer</label>
            <select
              className="input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value === "" ? "" : Number(e.target.value))}
              required
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Items</label>
              <button
                type="button"
                className="text-xs text-brand-600 hover:underline"
                onClick={() => setItems([...items, { product_id: "", quantity: 1 }])}
              >
                + Add item
              </button>
            </div>
            <div className="space-y-3">
              {items.map((it, idx) => {
                const p = it.product_id === "" ? null : productsById[it.product_id];
                return (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:items-start p-3 sm:p-0 border sm:border-0 border-slate-100 rounded-lg">
                    <select
                      className="input flex-1 min-w-0"
                      value={it.product_id}
                      onChange={(e) => {
                        const v = e.target.value === "" ? "" : Number(e.target.value);
                        setItems(items.map((x, i) => (i === idx ? { ...x, product_id: v } : x)));
                      }}
                      required
                    >
                      <option value="">Product…</option>
                      {products.map((pr) => (
                        <option key={pr.id} value={pr.id} disabled={pr.stock === 0}>
                          {pr.name} — ${pr.price.toFixed(2)} ({pr.stock} in stock)
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        max={p?.stock || 9999}
                        className="input w-full sm:w-24"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) =>
                          setItems(
                            items.map((x, i) => (i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x))
                          )
                        }
                        required
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn-danger !px-3 !py-2 shrink-0"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          aria-label="Remove"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-sm text-slate-500">Estimated total</span>
            <span className="text-lg font-semibold">${total.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Placing…" : "Place Order"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detailOrder} title={`Order #${detailOrder?.id || ""}`} onClose={() => setDetailOrder(null)}>
        {detailOrder && (
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-slate-500">Customer</div>
              <div className="font-medium">{detailOrder.customer?.name}</div>
              <div className="text-slate-500 text-xs">{detailOrder.customer?.email}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-2">Items</div>
              <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {detailOrder.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between px-4 py-2">
                    <div>
                      <div className="font-medium">{it.product?.name || `Product #${it.product_id}`}</div>
                      <div className="text-xs text-slate-500">
                        {it.quantity} × ${it.unit_price.toFixed(2)}
                      </div>
                    </div>
                    <div className="font-medium">${(it.quantity * it.unit_price).toFixed(2)}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-slate-500">Total</span>
              <span className="text-lg font-semibold">${detailOrder.total_amount.toFixed(2)}</span>
            </div>
            <div>
              <span className={`badge ${statusColor(detailOrder.status)}`}>{detailOrder.status}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
