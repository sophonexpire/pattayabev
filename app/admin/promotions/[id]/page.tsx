import Link from "next/link";
import { notFound } from "next/navigation";

import { updatePromotionAction } from "@/app/admin/promotions/actions";
import {
  AdminShell,
  adminPrimaryActionClass,
  adminSecondaryActionClass
} from "@/components/admin/admin-shell";
import { PromotionDeleteForm } from "@/components/admin/promotion-delete-form";
import { PromotionForm } from "@/components/admin/promotion-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAdmin } from "@/lib/auth";
import { getAdminPromotionById } from "@/lib/promotions";
import { getAdminProducts } from "@/lib/products";

type AdminPromotionEditPageProps = {
  params: {
    id: string;
  };
};

export default async function AdminPromotionEditPage({ params }: AdminPromotionEditPageProps) {
  const session = await requireAdmin();
  const [promotion, products] = await Promise.all([
    getAdminPromotionById(params.id),
    getAdminProducts(1000)
  ]);

  if (!promotion) {
    notFound();
  }

  return (
    <AdminShell
      currentPath="/admin/promotions"
      eyebrow="PattayaBev Admin"
      title={`แก้ไขโปรโมชั่น, ${session.user.name}`}
      description="ปรับสินค้า ส่วนลด ช่วงเวลา รูปภาพ และสถานะของโปรโมชั่นให้พร้อมแสดงบนเว็บไซต์"
      actions={
        <>
          <Link className={adminSecondaryActionClass} href="/admin/promotions">
            กลับหน้าจัดการโปรโมชั่น
          </Link>
          <Link className={adminSecondaryActionClass} href="/promotions">
            ดูหน้าโปรโมชั่น
          </Link>
          <LogoutButton className={adminPrimaryActionClass} redirectTo="/login" />
        </>
      }
    >
      <PromotionForm
        products={products}
        mode="edit"
        promotion={promotion}
        action={updatePromotionAction}
      />

      <section className="rounded-[24px] border border-[#f0c9c5] bg-[#fff8f7] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b42318]">
              พื้นที่ลบข้อมูล
            </p>
            <h2 className="mt-2 text-xl font-extrabold text-[#171212]">ลบโปรโมชั่นนี้</h2>
            <p className="mt-2 text-sm leading-7 text-[#5f5852]">
              เมื่อลบแล้วโปรโมชั่นจะหายจากหน้าเว็บไซต์และไม่สามารถย้อนกลับได้
            </p>
          </div>
          <PromotionDeleteForm
            promotionId={promotion.id}
            title={promotion.title}
            redirectOnSuccess
          />
        </div>
      </section>
    </AdminShell>
  );
}
