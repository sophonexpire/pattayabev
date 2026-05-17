"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { createArticleAction, type ArticleFormState } from "@/app/admin/articles/actions";
import type { ArticleItem } from "@/lib/articles";

type ArticleFormAction = (
  state: ArticleFormState,
  formData: FormData
) => Promise<ArticleFormState>;

type ArticleSectionDraft = {
  id: string;
  title: string;
  image: string;
  intro: string;
  content: string;
  imagePreview: string;
};

const initialFormState: ArticleFormState = {
  status: "idle",
  message: ""
};

function createSectionId() {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptySection(): ArticleSectionDraft {
  return {
    id: createSectionId(),
    title: "",
    image: "",
    intro: "",
    content: "",
    imagePreview: ""
  };
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[#171212] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#2a2323] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "กำลังบันทึก..." : mode === "edit" ? "บันทึกการแก้ไข" : "เพิ่มบทความ"}
    </button>
  );
}

function buildPreviewLines(value: string) {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function buildSectionContent(section: ArticleItem["sections"][number]) {
  return [
    ...(section.paragraphs ?? []),
    ...(section.bullets ?? []).map((bullet) => `- ${bullet}`)
  ].join("\n\n");
}

function buildInitialSections(article?: ArticleItem): ArticleSectionDraft[] {
  if (!article?.sections.length) {
    return [createEmptySection()];
  }

  return article.sections.map((section, index) => ({
    id: `section-${index}-${Math.random().toString(36).slice(2, 8)}`,
    title: section.title,
    image: section.image ?? "",
    intro: section.intro ?? "",
    content: buildSectionContent(section),
    imagePreview: section.image ?? ""
  }));
}

export function ArticleForm({
  categories,
  mode = "create",
  article,
  action
}: {
  categories: string[];
  mode?: "create" | "edit";
  article?: ArticleItem;
  action?: ArticleFormAction;
}) {
  const formActionToUse = action ?? createArticleAction;
  const [state, formAction] = useFormState(formActionToUse, initialFormState);
  const [title, setTitle] = useState(article?.title ?? "");
  const [category, setCategory] = useState(article?.category ?? categories[0] ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [readTime, setReadTime] = useState(article?.readTime ?? "อ่าน 5 นาที");
  const [introduction, setIntroduction] = useState(article?.introduction.join("\n\n") ?? "");
  const [coverPreview, setCoverPreview] = useState(article?.image ?? "/images/categories/recommended.jpg");
  const [sections, setSections] = useState<ArticleSectionDraft[]>(() => buildInitialSections(article));

  const sectionsJson = useMemo(
    () =>
      JSON.stringify(
        sections
          .map((section) => ({
            id: section.id,
            title: section.title.trim(),
            image: section.image,
            intro: section.intro.trim(),
            content: section.content
          }))
          .filter((section) => section.title)
      ),
    [sections]
  );

  const populatedSections = sections.filter((section) => section.title.trim() || section.intro.trim() || section.content.trim());

  const updateSection = (id: string, field: keyof ArticleSectionDraft, value: string) => {
    setSections((current) => current.map((section) => (section.id === id ? { ...section, [field]: value } : section)));
  };

  const addSection = () => {
    setSections((current) => [...current, createEmptySection()]);
  };

  const removeSection = (id: string) => {
    setSections((current) => {
      const nextSections = current.filter((section) => section.id !== id);
      return nextSections.length ? nextSections : [createEmptySection()];
    });
  };

  const updateSectionImage = (id: string, file: File | null) => {
    if (!file) {
      updateSection(id, "imagePreview", "");
      return;
    }

    updateSection(id, "imagePreview", URL.createObjectURL(file));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form action={formAction} className="grid gap-6">
        {article ? (
          <>
            <input type="hidden" name="originalSlug" value={article.slug} />
            <input type="hidden" name="existingImage" value={article.image} />
            <input type="hidden" name="existingPublishedAt" value={article.publishedAt} />
          </>
        ) : null}

        <section className="grid gap-5 rounded-[28px] border border-[#ece4d6] bg-[linear-gradient(135deg,#fffdf8_0%,#ffffff_58%,#f9fbff_100%)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">ข้อมูลพื้นฐานบทความ</p>
            <h3 className="mt-2 text-2xl font-extrabold text-[#171212]">
              {mode === "edit" ? "แก้ไขบทความ" : "เพิ่มบทความใหม่"}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[#5f5852]">
              กรอกรายละเอียดหลักก่อน แล้วค่อยเพิ่มแต่ละ section ของเนื้อหาด้านล่าง ระบบจะจัดโครงบทความให้อัตโนมัติ
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[#171212] xl:col-span-2">
              <span>ชื่อบทความ</span>
              <input
                name="title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="กรอกชื่อบทความ"
                className="min-h-[48px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#171212]">
              <span>หมวดหมู่</span>
              <input
                name="category"
                list="article-category-options"
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="หมวดบทความ"
                className="min-h-[48px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
              />
              <datalist id="article-category-options">
                {categories.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#171212]">
              <span>เวลาอ่าน</span>
              <input
                name="readTime"
                value={readTime}
                onChange={(event) => setReadTime(event.target.value)}
                placeholder="อ่าน 5 นาที"
                className="min-h-[48px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#171212]">
              <span>วันที่เผยแพร่</span>
              <input
                name="publishedDate"
                type="date"
                className="min-h-[48px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#171212]">
              <span>รูปหน้าปก</span>
              <input
                name="coverImageFile"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setCoverPreview(URL.createObjectURL(file));
                  }
                }}
                className="min-h-[48px] rounded-2xl border border-[#ddd3c5] bg-white px-4 py-3 text-sm text-[#171212] outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-[#171212] file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-[0.12em] file:text-white focus:border-[#171212]"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-[#171212]">
            <span>คำเกริ่นสั้น</span>
            <textarea
              name="excerpt"
              required
              rows={3}
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              placeholder="ข้อความสรุปสั้นที่จะใช้แสดงบนหน้ารวมบทความ"
              className="rounded-[24px] border border-[#ddd3c5] bg-white px-4 py-4 text-sm leading-7 text-[#171212] outline-none transition focus:border-[#171212]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#171212]">
            <span>บทนำ</span>
            <textarea
              name="introduction"
              required
              rows={6}
              value={introduction}
              onChange={(event) => setIntroduction(event.target.value)}
              placeholder="เขียนบทนำของบทความตรงนี้ เว้นบรรทัดเพื่อขึ้นย่อหน้าใหม่"
              className="rounded-[24px] border border-[#ddd3c5] bg-white px-4 py-4 text-sm leading-7 text-[#171212] outline-none transition focus:border-[#171212]"
            />
          </label>
        </section>

        <section className="grid gap-5 rounded-[28px] border border-[#ece4d6] bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">ส่วนเนื้อหา</p>
              <h3 className="mt-2 text-2xl font-extrabold text-[#171212]">จัดวางแต่ละ section ของบทความ</h3>
              <p className="mt-2 text-sm leading-7 text-[#5f5852]">
                เขียนแต่ละ section ให้กระชับ ใช้บรรทัดปกติสำหรับย่อหน้า และขึ้นต้นด้วย <span className="font-bold">-</span> หากต้องการให้แสดงเป็น bullet
              </p>
            </div>

            <button
              type="button"
              onClick={addSection}
              className="rounded-full border border-[#171212] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#171212] transition hover:bg-[#171212] hover:text-white"
            >
              เพิ่มส่วนเนื้อหา
            </button>
          </div>

          <input type="hidden" name="sectionsJson" value={sectionsJson} />

          <div className="grid gap-5">
            {sections.map((section, index) => (
              <article key={section.id} className="grid gap-4 rounded-[24px] border border-[#ece4d6] bg-[#fffdf9] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-lg font-extrabold text-[#171212]">ส่วนที่ {index + 1}</h4>
                  {sections.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeSection(section.id)}
                      className="text-xs font-bold uppercase tracking-[0.12em] text-[#a61b1f]"
                    >
                      ลบส่วนนี้
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm font-semibold text-[#171212]">
                    <span>ชื่อส่วนเนื้อหา</span>
                    <input
                      value={section.title}
                      onChange={(event) => updateSection(section.id, "title", event.target.value)}
                      placeholder="กรอกชื่อส่วนเนื้อหา"
                      className="min-h-[48px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-[#171212]">
                    <span>คำเกริ่นของส่วนนี้</span>
                    <input
                      value={section.intro}
                      onChange={(event) => updateSection(section.id, "intro", event.target.value)}
                      placeholder="ข้อความสั้นก่อนเข้าสู่เนื้อหาหลัก ไม่บังคับ"
                      className="min-h-[48px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-[#171212]">
                    <span>เนื้อหาส่วนนี้</span>
                    <textarea
                      rows={8}
                      value={section.content}
                      onChange={(event) => updateSection(section.id, "content", event.target.value)}
                      placeholder={"เขียนย่อหน้าตามปกติ\n\n- ขึ้นต้นด้วยขีดเพื่อทำ bullet\n- เพิ่ม bullet ต่อในบรรทัดใหม่ได้"}
                      className="rounded-[24px] border border-[#ddd3c5] bg-white px-4 py-4 text-sm leading-7 text-[#171212] outline-none transition focus:border-[#171212]"
                    />
                  </label>

                  <div className="grid gap-3 rounded-[22px] border border-[#ece4d6] bg-[#fdf9f2] p-4">
                    <div>
                      <p className="text-sm font-bold text-[#171212]">รูปของส่วนนี้</p>
                      <p className="mt-1 text-xs leading-6 text-[#6a625b]">อัปโหลดรูป 1 รูป หากต้องการให้แสดงในเนื้อหาบทความ</p>
                    </div>

                    <input
                      name={`sectionImage-${section.id}`}
                      type="file"
                      accept="image/*"
                      onChange={(event) => updateSectionImage(section.id, event.target.files?.[0] ?? null)}
                      className="min-h-[48px] rounded-2xl border border-[#ddd3c5] bg-white px-4 py-3 text-sm text-[#171212] outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-[#171212] file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-[0.12em] file:text-white focus:border-[#171212]"
                    />

                    {section.imagePreview ? (
                      <div className="overflow-hidden rounded-[18px] border border-[#ece4d6] bg-white">
                        <img src={section.imagePreview} alt={section.title || `Section ${index + 1}`} className="h-[220px] w-full object-cover" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#e8decf] bg-white/95 px-5 py-4 shadow-[0_14px_34px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="max-w-2xl text-sm text-[#5f5852]">
            {state.message ? (
              <p className={state.status === "success" ? "font-semibold text-[#207443]" : "font-semibold text-[#b3171f]"}>{state.message}</p>
            ) : (
              <p>เมื่อบันทึกแล้ว หน้ารวมบทความและหน้าบทความจริงจะอัปเดตอัตโนมัติ</p>
            )}
          </div>
          <SubmitButton mode={mode} />
        </div>
      </form>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-[28px] border border-[#ece4d6] bg-[linear-gradient(135deg,#fbf7f0_0%,#ffffff_58%,#f5f8ff_100%)] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.05)] sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">ตัวอย่าง</p>
          <h3 className="mt-2 text-xl font-extrabold text-[#171212]">บทความก่อนบันทึก</h3>

          <article className="mt-5 overflow-hidden rounded-[28px] border border-[#ece4d6] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
            <div className="relative h-[220px] bg-[#f7f3ec]">
              <img src={coverPreview} alt={title || "ตัวอย่างบทความ"} className="h-full w-full object-cover" />
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-sm bg-[#be1e2d] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white">PattayaBev</span>
                <span className="rounded-sm bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#3646d4]">
                  {category || "หมวดหมู่"}
                </span>
              </div>

                <h4 className="text-[24px] font-extrabold leading-7 text-[#171212]">{title || "ชื่อบทความ"}</h4>
              <p className="text-sm leading-7 text-[#5f5852]">{excerpt || "คำเกริ่นสั้นของบทความจะแสดงตรงนี้ก่อนบันทึก"}</p>

              <div className="rounded-[20px] border border-[#ece4d6] bg-[#faf7f1] px-4 py-4 text-sm leading-7 text-[#5f5852]">
                <p>จำนวนส่วนเนื้อหา: {populatedSections.length || 0}</p>
                <p>เวลาอ่าน: {readTime || "อ่าน 5 นาที"}</p>
              </div>
            </div>
          </article>

          <div className="mt-5 grid gap-4">
            {populatedSections.length ? (
              populatedSections.map((section, index) => (
                <article key={section.id} className="overflow-hidden rounded-[22px] border border-[#ece4d6] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
                  {section.imagePreview ? (
                    <div className="h-[150px] overflow-hidden bg-[#f7f3ec]">
                      <img src={section.imagePreview} alt={section.title || `Section ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ) : null}

                  <div className="space-y-3 px-4 py-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">ส่วนที่ {index + 1}</p>
                    <h5 className="text-lg font-extrabold leading-6 text-[#171212]">{section.title || "ยังไม่ได้ตั้งชื่อส่วนนี้"}</h5>
                    {section.intro ? <p className="text-sm leading-6 text-[#5f5852]">{section.intro}</p> : null}

                    {buildPreviewLines(section.content).length ? (
                      <ul className="space-y-2">
                        {buildPreviewLines(section.content).map((line, lineIndex) => (
                          <li key={`${section.id}-preview-${lineIndex}`} className="text-sm leading-6 text-[#5f5852]">
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-[#ddd3c5] bg-white px-4 py-5 text-sm leading-7 text-[#6a625b]">
                เพิ่มชื่อ section และเนื้อหา เพื่อดูตัวอย่างบทความเต็มจากตรงนี้
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
