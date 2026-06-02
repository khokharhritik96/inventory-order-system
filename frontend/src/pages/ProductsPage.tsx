import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, extractError } from "../api/client";
import { Product } from "../types";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";

interface ProductForm {
  sku: string;
  name: string;
  description: string;
  price: string;
  stock: string;
}

const empty: ProductForm = { sku: "", name: "", description: "", price: "", stock: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Product[]>("/products/");
      setProducts(data);
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
    setEditing(null);
    setForm(empty);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      stock: String(p.stock),
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        stock: parseInt(form.stock, 10),
      };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products/", { sku: form.sku, ...payload });
        toast.success("Product created");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      toast.success("Product deleted");
      load();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  const stockBadge = (stock: number) =>
    stock === 0
      ? "bg-red-100 text-red-700"
      : stock < 10
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";

  return (
    <div>
      <PageHeader
        title="Products"
        action={<button className="btn-primary w-full sm:w-auto" onClick={openCreate}>+ Add Product</button>}
      />

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : products.length === 0 ? (
          <EmptyState
            title="No products yet"
            message="Add your first product to start managing inventory."
            action={<button className="btn-primary" onClick={openCreate}>+ Add Product</button>}
          />
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="sm:hidden divide-y divide-slate-100">
              {products.map((p) => (
                <li key={p.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{p.sku}</div>
                    </div>
                    <span className={`badge ${stockBadge(p.stock)}`}>{p.stock} in stock</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold text-slate-900">${p.price.toFixed(2)}</span>
                    <div className="flex gap-2">
                      <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                      <button className="btn-danger !px-3 !py-1.5 text-xs" onClick={() => remove(p)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">SKU</th>
                    <th className="text-left px-6 py-3 font-medium">Name</th>
                    <th className="text-right px-6 py-3 font-medium">Price</th>
                    <th className="text-right px-6 py-3 font-medium">Stock</th>
                    <th className="text-right px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono text-xs">{p.sku}</td>
                      <td className="px-6 py-3 font-medium">{p.name}</td>
                      <td className="px-6 py-3 text-right">${p.price.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`badge ${stockBadge(p.stock)}`}>{p.stock}</span>
                      </td>
                      <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                        <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => openEdit(p)}>
                          Edit
                        </button>
                        <button className="btn-danger !px-3 !py-1 text-xs" onClick={() => remove(p)}>
                          Delete
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

      <Modal open={modalOpen} title={editing ? "Edit Product" : "New Product"} onClose={() => setModalOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-4"
        >
          <div>
            <label className="label">SKU</label>
            <input
              className="input"
              value={form.sku}
              disabled={!!editing}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
            />
            {editing && <p className="text-xs text-slate-500 mt-1">SKU cannot be changed.</p>}
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Stock</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
