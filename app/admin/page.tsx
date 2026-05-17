import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import {
  AdminShell,
  adminPrimaryActionClass,
  adminSecondaryActionClass
} from "@/components/admin/admin-shell";
import { ProductDeleteForm } from "@/components/admin/product-delete-form";
import { ProductForm } from "@/components/admin/product-form";
import { ProductStockForm } from "@/components/admin/product-stock-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminProducts,
  getLatestProducts,
  getProductFormOptions,
  type AdminProductListItem
} from "@/lib/products";

export const dynamic = "force-dynamic";

function mapLatestProductToAdminItem(
  product: Awaited<ReturnType<typeof getLatestProducts>>[number]
): AdminProductListItem {
  return {
    ...product,
    createdAt: null,
    stockQty: 0,
    sku: null
  };
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(price);
}

export default async function AdminPage() {
  noStore();

  const session = await requireAdmin();
  const [options, adminProducts] = await Promise.all([getProductFormOptions(), getAdminProducts(100)]);
  const products =
    adminProducts.length > 0 ? adminProducts : (await getLatestProducts(100)).map(mapLatestProductToAdminItem);

  return (
    <AdminShell
      currentPath="/admin"
      eyebrow="PattayaBev Admin"
      title={`จัดการสินค้า, ${session.user.name}`}
      description="เพิ่มสินค้าใหม่ ตรวจสอบสินค้าที่อยู่บนเว็บไซต์ และเปิดแก้ไขรายละเอียดสินค้าแต่ละรายการได้จากหน้าเดียว"
      actions={
        <>
          <Link className={adminSecondaryActionClass} href="/products">
            ดูหน้าสินค้า
          </Link>
          <Link className={adminSecondaryActionClass} href="/whisky">
            ดูหน้าวิสกี้
          </Link>
          <LogoutButton className={adminPrimaryActionClass} redirectTo="/login" />
        </>
      }
    >
      <div className="grid gap-6 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-[#ece4d6] bg-[linear-gradient(135deg,#fbf7f0_0%,#ffffff_55%,#f6f8ff_100%)] p-6">
          <h2 className="text-xl font-extrabold text-[#171212]">คู่มือใช้งานเร็ว</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-[#5f5852]">
            <p>1. กรอกข้อมูลสินค้าในฟอร์มและบันทึก</p>
            <p>2. สินค้าในหมวดวิสกี้จะแสดงในหน้าวิสกี้อัตโนมัติ</p>
            <p>3. รูปที่อัปโหลดจะถูกเก็บในโปรเจกต์ และรูปแรกจะเป็นรูปหลัก</p>
            <p>4. กดการ์ดสินค้าด้านล่างเพื่อเข้าไปแก้ไขภายหลังได้</p>
          </div>

          <div className="mt-6 rounded-[20px] border border-[#eadfce] bg-white p-4 text-sm leading-7 text-[#5f5852]">
            <p className="font-semibold text-[#171212]">ข้อมูลอ้างอิง</p>
            <ul className="mt-3 space-y-2">
              <li>แบรนด์: {options.brands.length}</li>
              <li>หมวดสินค้า: {options.categories.length}</li>
              <li>ประเภทสินค้า: {options.productTypes.length}</li>
              <li>ประเทศ: {options.countries.length}</li>
              <li>ภูมิภาค: {options.regions.length}</li>
            </ul>
          </div>
        </aside>

        <section className="min-w-0 rounded-[24px] border border-[#ece4d6] bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
          <ProductForm options={options} />
        </section>
      </div>

      <section className="rounded-[24px] border border-[#ece4d6] bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ece4d6] pb-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b6a2b]">รายการสินค้า</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#171212] sm:text-3xl">
              สินค้าที่อยู่บนเว็บไซต์แล้ว
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#5f5852]">
            กดที่การ์ดสินค้าเพื่อแก้ไขรายละเอียดได้ทันที และสามารถเปิดดูหน้าสินค้าจริงจากปุ่มดูหน้าสินค้า
            {adminProducts.length === 0 && products.length > 0
              ? " ระบบดึงรายการจากหน้าร้านจริงมาแสดงแทน เนื่องจากรายการฝั่งแอดมินยังไม่มีข้อมูลในแคช"
              : ""}
          </p>
        </div>

        {products.length ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-[24px] border border-[#ece4d6] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.04)]"
              >
                <Link href={`/admin/products/${product.id}`} className="block">
                  <div className="relative h-[220px] bg-[linear-gradient(135deg,#faf7f1_0%,#f2f5fb_100%)]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-contain p-5"
                        sizes="(max-width: 1280px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#9a9187]">
                        ยังไม่มีรูปภาพ
                      </div>
                    )}
                  </div>
                </Link>

                <div className="space-y-4 px-5 py-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#8b6a2b]">
                      {product.brandName ?? product.categoryName ?? "สินค้า"}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-extrabold text-[#171212]">
                      {product.name}
                    </h3>
                    <p className="mt-2 text-sm text-[#5f5852]">
                      {product.subtitle || product.categoryName || "พร้อมแก้ไขรายละเอียด"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg font-extrabold text-[#171212]">
                      {formatPrice(product.price, product.currency)}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                        product.inStock ? "bg-[#edf7ef] text-[#207443]" : "bg-[#fbe9e9] text-[#a61b1f]"
                      }`}
                    >
                      {product.inStock ? "พร้อมขาย" : "สินค้าหมด"}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">หมวดสินค้า</p>
                      <p className="mt-2 text-sm font-semibold text-[#171212]">
                        {product.categoryName ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">จำนวนคงเหลือ</p>
                      <p className="mt-2 text-sm font-semibold text-[#171212]">{product.stockQty}</p>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[#ece4d6] bg-[#faf7f1] p-4">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#8b6a2b]">
                      เพิ่มจำนวนสินค้าในระบบ
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#5f5852]">
                      ใช้ส่วนนี้เมื่อต้องการเติมสต็อกอย่างรวดเร็ว โดยไม่ต้องเปิดฟอร์มแก้ไขทั้งรายการ
                    </p>
                    <div className="mt-4">
                      <ProductStockForm productId={product.id} productSlug={product.slug} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="inline-flex rounded-full bg-[#171212] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white"
                    >
                      แก้ไขสินค้า
                    </Link>
                    <Link
                      href={`/products/${product.slug}`}
                      className="inline-flex rounded-full border border-[#d8cec0] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#171212]"
                    >
                      ดูหน้าสินค้า
                    </Link>
                    <ProductDeleteForm
                      productId={product.id}
                      productSlug={product.slug}
                      productName={product.name}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#d8cec0] bg-[#fbf7f0] px-6 py-10 text-center text-sm leading-7 text-[#5f5852]">
            ยังไม่มีสินค้าในระบบ สามารถใช้ฟอร์มด้านบนเพื่อเพิ่มสินค้าแรกได้เลย
          </div>
        )}
      </section>
    </AdminShell>
  );
}
