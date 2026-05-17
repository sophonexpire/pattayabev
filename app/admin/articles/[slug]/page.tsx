import Link from "next/link";
import { notFound } from "next/navigation";

import { updateArticleAction } from "@/app/admin/articles/actions";
import {
  AdminShell,
  adminPrimaryActionClass,
  adminSecondaryActionClass
} from "@/components/admin/admin-shell";
import { ArticleDeleteForm } from "@/components/admin/article-delete-form";
import { ArticleForm } from "@/components/admin/article-form";
import { requireAdmin } from "@/lib/auth";
import { getArticleBySlug, getArticleCategories } from "@/lib/articles";

export default async function AdminArticleEditPage({
  params
}: {
  params: { slug: string };
}) {
  const session = await requireAdmin();
  const [article, categories] = await Promise.all([
    getArticleBySlug(params.slug),
    getArticleCategories()
  ]);

  if (!article) {
    notFound();
  }

  return (
    <AdminShell
      currentPath="/admin/articles"
      eyebrow="PattayaBev Admin"
      title={`แก้ไขบทความ, ${session.user.name}`}
      description="แก้ไขหัวข้อ รูปภาพ บทนำ และส่วนเนื้อหาของบทความที่เผยแพร่บนเว็บไซต์"
      actions={
        <>
          <Link className={adminSecondaryActionClass} href="/admin/articles">
            กลับหน้าจัดการบทความ
          </Link>
          <Link className={adminPrimaryActionClass} href={`/articles/${article.slug}`}>
            ดูบทความจริง
          </Link>
        </>
      }
    >
      <section className="rounded-[24px] border border-[#f0c4c0] bg-[#fff8f7] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b42318]">พื้นที่ลบข้อมูล</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#171212]">ลบบทความนี้</h2>
            <p className="mt-2 text-sm leading-7 text-[#5f5852]">
              เมื่อลบแล้ว บทความจะหายจากหน้ารวมบทความและหน้าบทความจริงทันที
            </p>
          </div>
          <ArticleDeleteForm slug={article.slug} title={article.title} redirectOnSuccess />
        </div>
      </section>

      <ArticleForm
        categories={categories}
        mode="edit"
        article={article}
        action={updateArticleAction}
      />
    </AdminShell>
  );
}
