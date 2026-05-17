import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import {
  AdminShell,
  adminPrimaryActionClass,
  adminSecondaryActionClass
} from "@/components/admin/admin-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminPayments,
  getAdminPaymentSummary,
  type AdminPaymentListItem
} from "@/lib/admin-payments";
import { formatPrice } from "@/lib/currency";

export const dynamic = "force-dynamic";

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function getOrderStatusLabel(status: string) {
  if (status === "pending_payment") return "รอชำระเงิน";
  if (status === "paid") return "ชำระแล้ว";
  if (status === "processing") return "กำลังจัดเตรียม";
  if (status === "shipped") return "จัดส่งแล้ว";
  if (status === "completed") return "สำเร็จ";
  if (status === "cancelled") return "ยกเลิก";
  if (status === "cart") return "ตะกร้า";
  return status || "-";
}

function getPaymentStatusLabel(status: string) {
  if (status === "paid") return "ชำระแล้ว";
  if (status === "pending") return "รอดำเนินการ";
  if (status === "failed") return "ไม่สำเร็จ";
  if (status === "expired") return "หมดอายุ";
  if (status === "refunded") return "คืนเงินแล้ว";
  return "ยังไม่ชำระ";
}

function getStatusPillClass(status: string) {
  if (["paid", "processing", "shipped", "completed"].includes(status)) {
    return "border-[#d6eadc] bg-[#edf7ef] text-[#207443]";
  }

  if (["pending_payment", "pending", "cart"].includes(status)) {
    return "border-[#eedeb2] bg-[#fff7e8] text-[#9a5d00]";
  }

  return "border-[#f3d1d3] bg-[#fbe9e9] text-[#a61b1f]";
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-[#ece4d6] bg-white px-5 py-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">{label}</p>
      <p className="mt-3 text-3xl font-extrabold text-[#171212]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#625b54]">{helper}</p>
    </div>
  );
}

function OrderRow({ order }: { order: AdminPaymentListItem }) {
  return (
    <article className="rounded-[24px] border border-[#ece4d6] bg-white p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">คำสั่งซื้อ</p>
          <h3 className="mt-2 text-xl font-extrabold text-[#171212]">{order.orderNumber}</h3>
          <p className="mt-2 text-sm text-[#5f5852]">
            {order.customerName} / {order.customerEmail}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">ยอดรวม</p>
          <p className="mt-2 text-2xl font-extrabold text-[#171212]">
            {formatPrice(order.totalAmount, order.currency)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8b6a2b]">สถานะคำสั่งซื้อ</p>
          <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusPillClass(order.orderStatus)}`}>
            {getOrderStatusLabel(order.orderStatus)}
          </span>
        </div>
        <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8b6a2b]">การชำระเงิน</p>
          <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusPillClass(order.paymentStatus)}`}>
            {getPaymentStatusLabel(order.paymentStatus)}
          </span>
        </div>
        <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8b6a2b]">เบอร์ลูกค้า</p>
          <p className="mt-2 text-sm font-semibold text-[#171212]">{order.customerPhone}</p>
        </div>
        <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8b6a2b]">เลขอ้างอิง</p>
          <p className="mt-2 truncate text-sm font-semibold text-[#171212]">{order.paymentReference ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8b6a2b]">วันที่สร้าง</p>
          <p className="mt-2 text-sm font-semibold text-[#171212]">{formatDateTime(order.createdAt)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/admin/orders/${order.orderNumber}`}
          className="inline-flex rounded-full bg-[#171212] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white"
        >
          จัดการคำสั่งซื้อ
        </Link>
        <Link
          href={`/order-confirmation/${order.orderNumber}`}
          className="inline-flex rounded-full border border-[#d8cec0] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#171212]"
        >
          ดูหน้าลูกค้า
        </Link>
      </div>
    </article>
  );
}

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  noStore();

  const session = await requireAdmin();
  const query = getFirstValue(searchParams?.q);
  const orderStatus = getFirstValue(searchParams?.orderStatus);
  const paymentStatus = getFirstValue(searchParams?.paymentStatus);
  const paymentMethod = getFirstValue(searchParams?.paymentMethod);

  let summary = {
    totalOrders: 0,
    awaitingPayment: 0,
    paidOrders: 0,
    problemOrders: 0,
    totalPaidAmount: 0
  };
  let orders: AdminPaymentListItem[] = [];
  let schemaMessage = "";

  try {
    [summary, orders] = await Promise.all([
      getAdminPaymentSummary(),
      getAdminPayments({ query, orderStatus, paymentStatus, paymentMethod }, 120)
    ]);
  } catch (error) {
    schemaMessage = error instanceof Error ? error.message : "ไม่สามารถโหลดคำสั่งซื้อได้";
  }

  return (
    <AdminShell
      currentPath="/admin/orders"
      eyebrow="PattayaBev Admin"
      title={`จัดการคำสั่งซื้อ, ${session.user.name}`}
      description="ค้นหาคำสั่งซื้อ ตรวจสถานะการชำระเงิน เปิดรายละเอียดคำสั่งซื้อ และอัปเดตสถานะจัดส่งได้จากหน้าเดียว"
      actions={
        <>
          <Link className={adminSecondaryActionClass} href="/admin/payments">
            การชำระเงิน
          </Link>
          <LogoutButton className={adminPrimaryActionClass} redirectTo="/login" />
        </>
      }
    >
      {schemaMessage ? (
        <div className="rounded-[24px] border border-[#f0d8be] bg-[#fff7ec] px-5 py-4 text-sm leading-7 text-[#7a5a21]">
          {schemaMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="คำสั่งซื้อทั้งหมด" value={String(summary.totalOrders)} helper="รายการที่อยู่ในระบบเช็กเอาต์" />
        <SummaryCard label="รอชำระเงิน" value={String(summary.awaitingPayment)} helper="รายการที่ยังไม่ชำระหรือรอดำเนินการ" />
        <SummaryCard label="ชำระแล้ว" value={String(summary.paidOrders)} helper="รายการที่ยืนยันการชำระเงินแล้ว" />
        <SummaryCard label="ต้องตรวจสอบ" value={String(summary.problemOrders)} helper="รายการที่ล้มเหลว หมดอายุ หรือคืนเงินแล้ว" />
        <SummaryCard label="ยอดชำระรวม" value={formatPrice(summary.totalPaidAmount)} helper="ยอดรวมของรายการที่ชำระแล้ว" />
      </div>

      <section className="rounded-[24px] border border-[#ece4d6] bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ece4d6] pb-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b6a2b]">ตัวกรอง</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#171212] sm:text-3xl">ค้นหาคำสั่งซื้อ</h2>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_190px_190px_190px_auto]">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="ค้นหาเลขคำสั่งซื้อ ชื่อลูกค้า อีเมล หรือเลขอ้างอิง"
            className="min-h-[46px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
          />
          <select
            name="orderStatus"
            defaultValue={orderStatus}
            className="min-h-[46px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
          >
            <option value="">ทุกสถานะคำสั่งซื้อ</option>
            <option value="pending_payment">รอชำระเงิน</option>
            <option value="paid">ชำระแล้ว</option>
            <option value="processing">กำลังจัดเตรียม</option>
            <option value="shipped">จัดส่งแล้ว</option>
            <option value="completed">สำเร็จ</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <select
            name="paymentStatus"
            defaultValue={paymentStatus}
            className="min-h-[46px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
          >
            <option value="">ทุกสถานะชำระเงิน</option>
            <option value="unpaid">ยังไม่ชำระ</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="paid">ชำระแล้ว</option>
            <option value="failed">ไม่สำเร็จ</option>
            <option value="expired">หมดอายุ</option>
            <option value="refunded">คืนเงินแล้ว</option>
          </select>
          <select
            name="paymentMethod"
            defaultValue={paymentMethod}
            className="min-h-[46px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
          >
            <option value="">ทุกวิธีชำระเงิน</option>
            <option value="promptpay">PromptPay QR</option>
            <option value="card">บัตรเครดิต/เดบิต</option>
            <option value="cod">ชำระเงินปลายทาง</option>
          </select>
          <button
            type="submit"
            className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#171212] px-6 text-sm font-bold text-white"
          >
            ค้นหา
          </button>
        </form>
      </section>

      <section className="rounded-[24px] border border-[#ece4d6] bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ece4d6] pb-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b6a2b]">รายการคำสั่งซื้อ</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#171212] sm:text-3xl">คำสั่งซื้อของลูกค้า</h2>
          </div>
        </div>

        {orders.length ? (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <OrderRow key={order.orderId} order={order} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#d8cec0] bg-[#fbf7f0] px-6 py-10 text-center text-sm leading-7 text-[#5f5852]">
            ไม่พบคำสั่งซื้อที่ตรงกับตัวกรอง
          </div>
        )}
      </section>
    </AdminShell>
  );
}
