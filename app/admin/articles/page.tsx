import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import {
  AdminShell,
  adminPrimaryActionClass,
  adminSecondaryActionClass
} from "@/components/admin/admin-shell";
import { ArticleDeleteForm } from "@/components/admin/article-delete-form";
import { ArticleForm } from "@/components/admin/article-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAdmin } from "@/lib/auth";
import { getArticleCategories, getArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  noStore();

  const session = await requireAdmin();
  const [articles, categories] = await Promise.all([getArticles(), getArticleCategories()]);

  return (
    <AdminShell
      currentPath="/admin/articles"
      eyebrow="PattayaBev Admin"
      title={`จัดการบทความ, ${session.user.name}`}
      description="เพิ่มบทความใหม่ อัปเดตเนื้อหาบนเว็บไซต์ และตรวจรายการบทความที่เผยแพร่แล้วให้เป็นระเบียบในที่เดียว"
      actions={
        <>
          <Link className={adminSecondaryActionClass} href="/articles">
            ดูหน้าบทความ
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
            <p>1. กรอกชื่อบทความ หมวดหมู่ และคำเกริ่นสั้นก่อน</p>
            <p>2. เพิ่มบทนำ และอย่างน้อย 1 ส่วนของเนื้อหา</p>
            <p>3. อัปโหลดรูปหน้าปกหรือใช้รูปเริ่มต้นของระบบ</p>
            <p>4. เมื่อบันทึกแล้ว บทความจะไปแสดงบนหน้าเว็บไซต์ทันที</p>
          </div>

          <div className="mt-6 rounded-[20px] border border-[#eadfce] bg-white p-4 text-sm leading-7 text-[#5f5852]">
            <p className="font-semibold text-[#171212]">ข้อมูลอ้างอิง</p>
            <ul className="mt-3 space-y-2">
              <li>บทความทั้งหมด: {articles.length}</li>
              <li>หมวดที่ใช้งาน: {categories.length}</li>
            </ul>
          </div>
        </aside>

        <section className="min-w-0 rounded-[24px] border border-[#ece4d6] bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
          <ArticleForm categories={categories} />
        </section>
      </div>

      <section className="rounded-[24px] border border-[#ece4d6] bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ece4d6] pb-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b6a2b]">รายการบทความ</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#171212] sm:text-3xl">
              บทความที่อยู่บนเว็บไซต์แล้ว
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#5f5852]">
            ตรวจสอบบทความที่เผยแพร่แล้วได้จากตรงนี้ โดยบทความใหม่จะถูกจัดไว้ด้านบนอัตโนมัติ
          </p>
        </div>

        {articles.length ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => (
              <article
                key={article.slug}
                className="overflow-hidden rounded-[24px] border border-[#ece4d6] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.04)]"
              >
                <div className="relative h-[220px] bg-[#f7f3ec]">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 50vw, 33vw"
                  />
                </div>

                <div className="space-y-4 px-5 py-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#8b6a2b]">{article.category}</p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-extrabold text-[#171212]">
                      {article.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-7 text-[#5f5852]">{article.excerpt}</p>
                  </div>

                  <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">วันที่เผยแพร่</p>
                    <p className="mt-2 text-sm font-semibold text-[#171212]">{article.publishedAt}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/admin/articles/${article.slug}`}
                      className="inline-flex rounded-full bg-[#171212] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white"
                    >
                      แก้ไขบทความ
                    </Link>
                    <Link
                      href={`/articles/${article.slug}`}
                      className="inline-flex rounded-full border border-[#d8cec0] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#171212]"
                    >
                      ดูบทความ
                    </Link>
                    <ArticleDeleteForm slug={article.slug} title={article.title} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#d8cec0] bg-[#fbf7f0] px-6 py-10 text-center text-sm leading-7 text-[#5f5852]">
            ยังไม่มีบทความในระบบ สามารถใช้ฟอร์มด้านบนเพื่อเพิ่มบทความแรกได้เลย
          </div>
        )}
      </section>
    </AdminShell>
  );
}
