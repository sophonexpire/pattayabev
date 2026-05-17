import Image from "next/image";
import Link from "next/link";

import {
  AdminShell,
  adminPrimaryActionClass,
  adminSecondaryActionClass
} from "@/components/admin/admin-shell";
import { PromotionDeleteForm } from "@/components/admin/promotion-delete-form";
import { PromotionForm } from "@/components/admin/promotion-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAdmin } from "@/lib/auth";
import { formatPromotionBenefit, getAdminPromotions } from "@/lib/promotions";
import { getAdminProducts } from "@/lib/products";

export default async function AdminPromotionsPage() {
  const session = await requireAdmin();
  const [promotions, products] = await Promise.all([getAdminPromotions(100), getAdminProducts(1000)]);

  return (
    <AdminShell
      currentPath="/admin/promotions"
      eyebrow="PattayaBev Admin"
      title={`จัดการโปรโมชั่น, ${session.user.name}`}
      description="สร้างโปรโมชันส่วนลด เชื่อมกับสินค้าโดยตรง และตรวจดูรายการโปรโมชันที่กำลังใช้งานบนเว็บไซต์ได้จากหน้านี้"
      actions={
        <>
          <Link className={adminSecondaryActionClass} href="/promotions">
            ดูหน้าโปรโมชั่น
          </Link>
          <Link className={adminSecondaryActionClass} href="/admin">
            กลับหน้าสินค้า
          </Link>
          <LogoutButton className={adminPrimaryActionClass} redirectTo="/login" />
        </>
      }
    >
      <div className="grid gap-6 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-[#ece4d6] bg-[linear-gradient(135deg,#fbf7f0_0%,#ffffff_55%,#f6f8ff_100%)] p-6">
          <h2 className="text-xl font-extrabold text-[#171212]">คู่มือใช้งานเร็ว</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-[#5f5852]">
            <p>1. ค้นหาและเลือกสินค้าที่ต้องการทำโปรโมชันก่อน</p>
            <p>2. กรอกเปอร์เซ็นต์ส่วนลด</p>
            <p>3. กำหนดวันเริ่มและวันสิ้นสุดโปรโมชัน</p>
            <p>4. เมื่อบันทึกแล้ว สินค้าจะไปแสดงพร้อมราคาลดบนหน้าโปรโมชั่น</p>
          </div>

          <div className="mt-6 rounded-[20px] border border-[#eadfce] bg-white p-4 text-sm leading-7 text-[#5f5852]">
            <p className="font-semibold text-[#171212]">ข้อมูลอ้างอิง</p>
            <ul className="mt-3 space-y-2">
              <li>สินค้าที่เชื่อมได้: {products.length}</li>
              <li>ประเภทโปรโมชัน: ส่วนลด</li>
            </ul>
            <p className="mt-4 text-xs leading-6 text-[#7a736b]">
              หากเพิ่งเพิ่มสินค้าใหม่ ให้รีเฟรชหน้านี้หนึ่งครั้งเพื่ออัปเดตรายการค้นหา
            </p>
          </div>
        </aside>

        <section className="min-w-0 rounded-[24px] border border-[#ece4d6] bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
          <PromotionForm products={products} />
        </section>
      </div>

      <section className="rounded-[24px] border border-[#ece4d6] bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ece4d6] pb-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b6a2b]">รายการโปรโมชั่น</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#171212] sm:text-3xl">
              โปรโมชั่นที่อยู่บนเว็บไซต์แล้ว
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#5f5852]">
            แต่ละรายการสามารถเชื่อมไปยังหน้าสินค้า หน้าหมวด หรือหน้าแคมเปญได้ตามที่กำหนด
          </p>
        </div>

        {promotions.length ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {promotions.map((promotion) => (
              <article
                key={promotion.id}
                className="overflow-hidden rounded-[24px] border border-[#ece4d6] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.04)]"
              >
                <div className="relative h-[220px] bg-[linear-gradient(135deg,#faf7f1_0%,#f2f5fb_100%)]">
                  {promotion.imageUrl ? (
                    <Image
                      src={promotion.imageUrl}
                      alt={promotion.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1280px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#9a9187]">
                      ยังไม่มีรูปภาพ
                    </div>
                  )}
                  <div className="absolute left-4 top-4 rounded-full bg-[#171212] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                    ส่วนลด
                  </div>
                </div>

                <div className="space-y-4 px-5 py-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#8b6a2b]">โปรโมชั่น</p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-extrabold text-[#171212]">
                      {promotion.title}
                    </h3>
                    <p className="mt-2 text-sm text-[#5f5852]">
                      {promotion.description || "ยังไม่มีคำอธิบาย"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">สิทธิประโยชน์</p>
                    <p className="mt-2 text-sm font-semibold text-[#171212]">
                      {formatPromotionBenefit(promotion)}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">สินค้า</p>
                      <p className="mt-2 text-sm font-semibold text-[#171212]">
                        {promotion.linkedProductName || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">ช่วงเวลาโปรโมชั่น</p>
                      <p className="mt-2 break-all text-sm font-semibold text-[#171212]">
                        {formatPromotionBenefit({
                          discountPercent: null,
                          startAt: promotion.startAt,
                          endAt: promotion.endAt
                        }).replace("เนเธเธฃเนเธกเธเธฑเนเธเธชเนเธงเธเธฅเธ”", "-")}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#ece4d6] bg-[#fbf7f0] p-3">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#8b6a2b]">จัดการโปรโมชั่น</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Link
                      href={`/admin/promotions/${promotion.id}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#171212] px-4 text-xs font-bold uppercase tracking-[0.12em] text-white"
                    >
                      แก้ไขโปรโมชั่น
                    </Link>
                      <Link
                      href={
                        promotion.linkUrl ||
                        (promotion.linkedProductSlug ? `/products/${promotion.linkedProductSlug}` : "/promotions")
                      }
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#d8cec0] bg-white px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#171212]"
                    >
                      เปิดลิงก์
                    </Link>
                      <Link
                      href="/promotions"
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#d8cec0] bg-white px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#171212]"
                    >
                      ดูหน้าโปรโมชั่น
                      </Link>
                      <PromotionDeleteForm promotionId={promotion.id} title={promotion.title} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#d8cec0] bg-[#fbf7f0] px-6 py-10 text-center text-sm leading-7 text-[#5f5852]">
            ยังไม่มีโปรโมชั่นในระบบ สามารถใช้ฟอร์มด้านบนเพื่อเพิ่มรายการแรกได้เลย
          </div>
        )}
      </section>
    </AdminShell>
  );
}
