"use client";

import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/admin/AdminShell";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Modal,
  Panel,
  PanelHeader,
  Select,
  TableSkeleton,
  TableShell,
} from "@/components/admin/ui";
import { formatDate } from "@/lib/admin-format";
import { formatPrice } from "@/lib/price";

type Item = {
  id: string;
  productId: string | null;
  quantity: number;
  currency: "USD" | "TRY";
  unitPrice: number | null;
  regularPrice: number | null;
  lineTotal: number | null;
  lineRegular: number | null;
  product: {
    id: string;
    name: string;
    image: string | null;
    family: string | null;
    category: string;
    visible: boolean;
  } | null;
};

type Order = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  notes: string | null;
  status: "DRAFT" | "SUBMITTED" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED";
  currency: "USD" | "TRY";
  subtotal: number;
  discount: number;
  total: number;
  submittedAt: string | null;
  createdAt: string;
  itemCount: number;
  items: Item[];
};

const PAGE_SIZE = 20;

function formatStatusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

const STATUS_OPTIONS = [
  "SUBMITTED",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;

function hasPricing(order: Order) {
  return order.items.some((item) => item.unitPrice !== null);
}

export function ListsTable({
  initialOrders,
  initialTotal,
}: {
  initialOrders: Order[];
  initialTotal: number;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [selected, setSelected] = useState<Order | null>(null);
  const [removing, setRemoving] = useState<Order | null>(null);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const order of orders) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }

    return counts;
  }, [orders]);

  function flash(message: string) {
    setNotice(message);
    setError("");
    setTimeout(() => setNotice(""), 4000);
  }

  async function load(nextOffset: number, nextStatus: string, nextSearch: string) {
    setError("");
    setPendingId("__load__");

    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(nextOffset),
    });

    if (nextStatus) params.set("status", nextStatus);
    if (nextSearch) params.set("search", nextSearch);

    try {
      const response = await fetch(`/api/orders?${params.toString()}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error("Could not load lists.");
      }

      setOrders(payload.orders ?? []);
      setTotal(payload.total ?? 0);
      setOffset(nextOffset);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load lists.",
      );
    } finally {
      setPendingId(null);
    }
  }

  async function updateStatus(order: Order, nextStatus: string) {
    setPendingId(order.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          Array.isArray(payload.errors) && payload.errors.length > 0
            ? payload.errors.join(" ")
            : "Update failed.",
        );
      }

      const updated = (payload.order ?? payload) as Order;

      setOrders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );

      setSelected((current) =>
        current && current.id === updated.id ? updated : current,
      );

      flash(`Marked as ${formatStatusLabel(updated.status)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setPendingId(null);
    }
  }

  async function remove() {
    if (!removing) return;

    setPendingId(removing.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/orders/${removing.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed.");
      }

      setOrders((current) => current.filter((item) => item.id !== removing.id));
      setTotal((current) => Math.max(0, current - 1));
      setRemoving(null);
      setSelected(null);
      flash("List deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Submitted lists"
          description={`${total} list${total === 1 ? "" : "s"} · customers send their list from the storefront`}
        />

        <div className="panel-toolbar">
          <div className="relative min-w-56 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
              aria-hidden="true"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") load(0, status, search);
              }}
              placeholder="Search name, email or phone…"
              aria-label="Search lists"
              className="control pl-9"
            />
          </div>

          <label className="sr-only" htmlFor="list-status">
            Filter by status
          </label>
          <select
            id="list-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              load(0, event.target.value, search);
            }}
            className="control w-auto"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatStatusLabel(option)}
                {statusCounts[option] ? ` (${statusCounts[option]})` : ""}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            onClick={() => load(0, status, search)}
            loading={pendingId === "__load__"}
          >
            Apply
          </Button>
        </div>

        {(error || notice) && (
          <div className="px-5 pt-4">
            {error ? (
              <Alert>{error}</Alert>
            ) : (
              <Alert tone="success">{notice}</Alert>
            )}
          </div>
        )}

        {pendingId === "__load__" && orders.length === 0 ? (
          <TableSkeleton />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No lists yet"
            description="Lists sent by customers appear here immediately."
          />
        ) : (
          <TableShell
            head={["List", "Customer", "Contact", "Items", "Total", "Status", "Submitted", ""]}
          >
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <button
                    type="button"
                    onClick={() => setSelected(order)}
                    className="mono font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
                  >
                    {order.id.slice(0, 8)}
                  </button>
                </td>

                <td className="cell-strong">
                  {[order.firstName, order.lastName]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </td>

                <td className="cell-muted">
                  <span className="block">{order.email ?? "—"}</span>
                  <span className="block">{order.phone ?? ""}</span>
                </td>

                <td className="cell-numeric cell-strong">
                  {order.itemCount}
                </td>

                <td className="cell-numeric cell-strong whitespace-nowrap">
                  {hasPricing(order)
                    ? formatPrice(order.total, order.currency)
                    : "—"}
                </td>

                <td>
                  <StatusBadge status={order.status} />
                </td>

                <td className="cell-muted whitespace-nowrap">
                  {formatDate(order.submittedAt ?? order.createdAt)}
                </td>

                <td>
                  <div className="flex items-center justify-end gap-1">
                    <label
                      className="sr-only"
                      htmlFor={`status-${order.id}`}
                    >
                      Status for list {order.id}
                    </label>
                    <select
                      id={`status-${order.id}`}
                      value={order.status}
                      onChange={(event) =>
                        updateStatus(order, event.target.value)
                      }
                      disabled={pendingId === order.id}
                      className="control h-8 w-32"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {formatStatusLabel(option)}
                        </option>
                      ))}
                    </select>

                    <IconButton
                      label={`Delete list ${order.id}`}
                      onClick={() => setRemoving(order)}
                    >
                      <Trash2 className="size-4 text-danger" aria-hidden="true" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </TableShell>
        )}

        <div className="panel-footer">
          <p className="cell-muted">
            Page {page} of {pages}
          </p>

          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={offset === 0}
              onClick={() =>
                load(Math.max(0, offset - PAGE_SIZE), status, search)
              }
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>

            <Button
              size="sm"
              disabled={page >= pages}
              onClick={() => load(offset + PAGE_SIZE, status, search)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Panel>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `List ${selected.id}` : "List"}
        description={selected ? formatDate(selected.submittedAt ?? selected.createdAt) : undefined}
        size="lg"
        footer={
          selected && (
            <>
              <Button onClick={() => setSelected(null)}>Close</Button>
              <Button
                variant="danger"
                onClick={() => setRemoving(selected)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <span className="field-label">Status</span>
                <StatusBadge status={selected.status} />
              </div>

              <Select
                label="Update status"
                value={selected.status}
                onChange={(event) =>
                  updateStatus(selected, event.target.value)
                }
                disabled={pendingId === selected.id}
                className="w-44"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatStatusLabel(option)}
                  </option>
                ))}
              </Select>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-sunken px-3 py-2.5">
                <dt className="flex items-center gap-1.5 cell-muted">
                  <User className="size-3.5" aria-hidden="true" />
                  Customer
                </dt>

                <dd className="mt-1 cell-strong">
                  {[selected.firstName, selected.lastName]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </dd>
              </div>

              <div className="rounded-lg border border-line bg-sunken px-3 py-2.5">
                <dt className="flex items-center gap-1.5 cell-muted">
                  <Mail className="size-3.5" aria-hidden="true" />
                  Email
                </dt>

                <dd className="mt-1 cell-strong break-all">
                  {selected.email ? (
                    <a
                      href={`mailto:${selected.email}`}
                      className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
                    >
                      {selected.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>

              <div className="rounded-lg border border-line bg-sunken px-3 py-2.5">
                <dt className="flex items-center gap-1.5 cell-muted">
                  <Phone className="size-3.5" aria-hidden="true" />
                  Phone
                </dt>

                <dd className="mt-1 cell-strong">
                  {selected.phone ? (
                    <a
                      href={`tel:${selected.phone}`}
                      className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
                    >
                      {selected.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>

              <div className="rounded-lg border border-line bg-sunken px-3 py-2.5">
                <dt className="cell-muted">Notes</dt>

                <dd className="mt-1 cell-strong whitespace-pre-wrap">
                  {selected.notes || "—"}
                </dd>
              </div>
            </dl>

            <div className="table-scroll rounded-lg border border-line">
              <table className="data-table" style={{ minWidth: "30rem" }}>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Unit</th>
                    <th scope="col" className="text-right">
                      Qty
                    </th>
                    <th scope="col" className="text-right">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {selected.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="cell-strong">
                          {item.product?.name ?? "Product removed"}
                        </p>

                        <p className="cell-muted">
                          {item.product?.category ??
                            item.product?.family ??
                            item.productId ??
                            "—"}
                        </p>

                        {item.product && !item.product.visible && (
                          <Badge>hidden in catalog</Badge>
                        )}
                      </td>

                      <td className="cell-muted whitespace-nowrap">
                        {item.unitPrice === null ? (
                          "—"
                        ) : (
                          <>
                            {formatPrice(item.unitPrice, item.currency)}

                            {item.regularPrice !== null &&
                              item.regularPrice > item.unitPrice && (
                                <span className="block text-xs line-through">
                                  {formatPrice(
                                    item.regularPrice,
                                    item.currency,
                                  )}
                                </span>
                              )}
                          </>
                        )}
                      </td>

                      <td className="cell-numeric cell-strong text-right">
                        {item.quantity}
                      </td>

                      <td className="cell-numeric cell-strong whitespace-nowrap text-right">
                        {item.lineTotal === null
                          ? "—"
                          : formatPrice(item.lineTotal, item.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasPricing(selected) && (
              <div className="space-y-1.5 rounded-lg border border-line bg-sunken px-4 py-3">
                <div className="flex items-center justify-between cell-muted">
                  <span>Subtotal</span>

                  <span>
                    {formatPrice(selected.subtotal, selected.currency)}
                  </span>
                </div>

                {selected.discount > 0 && (
                  <div className="flex items-center justify-between cell-muted">
                    <span>Discount</span>

                    <span>
                      -{formatPrice(selected.discount, selected.currency)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between cell-strong">
                  <span>Total</span>

                  <span>
                    {formatPrice(selected.total, selected.currency)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Delete list"
        description={removing ? removing.id : undefined}
        footer={
          <>
            <Button onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={remove}
              disabled={pendingId === removing?.id}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="cell-muted">
          This permanently removes the list and its items. This cannot be
          undone.
        </p>
      </Modal>
    </div>
  );
}