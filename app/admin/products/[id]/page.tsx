import Link from "next/link";
import { notFound } from "next/navigation";

import { updateProductAction } from "@/app/admin/actions";
import {
  AdminShell,
  adminPrimaryActionClass,
  adminSecondaryActionClass
} from "@/components/admin/admin-shell";
import { ProductDeleteForm } from "@/components/admin/product-delete-form";
import { ProductForm } from "@/components/admin/product-form";
import { ProductStockForm } from "@/components/admin/product-stock-form";
import { requireAdmin } from "@/lib/auth";
import { getEditableProductById, getProductFormOptions } from "@/lib/products";

export default async function AdminProductEditPage({
  params
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const [options, product] = await Promise.all([
    getProductFormOptions(),
    getEditableProductById(params.id)
  ]);

  if (!product) {
    notFound();
  }

  return (
    <AdminShell
      currentPath="/admin"
      eyebrow="PattayaBev Admin"
      title={product.name}
      description="แก้ไขข้อมูลสินค้า อัปโหลดรูปเพิ่ม และอัปเดตรายละเอียดหน้าสินค้าได้จากหน้านี้"
      actions={
        <>
          <Link className={adminSecondaryActionClass} href="/admin">
            กลับหน้าจัดการสินค้า
          </Link>
          <Link className={adminPrimaryActionClass} href={`/products/${product.slug}`}>
            ดูหน้าสินค้าจริง
          </Link>
        </>
      }
    >
      <section className="rounded-[24px] border border-[#ece4d6] bg-[linear-gradient(135deg,#fbf7f0_0%,#ffffff_58%,#f6f8ff_100%)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">อัปเดตจำนวนสินค้า</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#171212]">เติมสต็อกสินค้าในระบบ</h2>
            <p className="mt-2 text-sm leading-7 text-[#5f5852]">
              จำนวนคงเหลือปัจจุบัน {product.stockQty} ชิ้น คุณสามารถเพิ่มจำนวนสินค้าได้จากส่วนนี้ทันที
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[22px] border border-[#ece4d6] bg-white p-4 sm:p-5">
          <ProductStockForm productId={product.id} productSlug={product.slug} />
        </div>
      </section>

      <section className="rounded-[24px] border border-[#f0c4c0] bg-[#fff8f7] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b42318]">พื้นที่ลบข้อมูล</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#171212]">ลบสินค้านี้</h2>
            <p className="mt-2 text-sm leading-7 text-[#5f5852]">
              เมื่อลบแล้ว สินค้าจะหายจากแคตตาล็อกและหน้าสินค้าจริงทันที
            </p>
          </div>
          <ProductDeleteForm
            productId={product.id}
            productSlug={product.slug}
            productName={product.name}
            redirectOnSuccess
          />
        </div>
      </section>

      <ProductForm options={options} mode="edit" product={product} action={updateProductAction} />
    </AdminShell>
  );
}
