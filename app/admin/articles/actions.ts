"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createArticle, deleteArticle, updateArticle, type ArticleSection } from "@/lib/articles";
import { IMAGE_UPLOAD_POLICY, assertUploadMatchesPolicy, getSafeUploadExtension } from "@/lib/upload-security";

export type ArticleFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type ParsedSection = {
  id: string;
  title: string;
  image?: string;
  intro?: string;
  paragraphs?: string[];
  bullets?: string[];
};

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function splitParagraphs(value: string) {
  return value
    .split(/\r?\n\r?\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMixedContent(value: string) {
  const lines = value.split(/\r?\n/g);
  const paragraphs: string[] = [];
  const bullets: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    const paragraph = paragraphBuffer.join(" ").trim();

    if (paragraph) {
      paragraphs.push(paragraph);
    }

    paragraphBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      flushParagraph();
      bullets.push(trimmed.replace(/^[-*•]\s+/, "").trim());
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();

  return {
    paragraphs: paragraphs.length ? paragraphs : undefined,
    bullets: bullets.length ? bullets : undefined
  };
}

function parseSections(value: string) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((section): ParsedSection | null => {
        if (!section || typeof section !== "object") {
          return null;
        }

        const id = typeof section.id === "string" ? section.id.trim() : "";
        const title = typeof section.title === "string" ? section.title.trim() : "";
        const image = typeof section.image === "string" ? section.image.trim() : "";

        if (!id || !title) {
          return null;
        }

        const intro = typeof section.intro === "string" ? section.intro.trim() : "";
        const content = typeof section.content === "string" ? section.content : "";
        const { paragraphs, bullets } = parseMixedContent(content);

        return {
          id,
          title,
          image: image || undefined,
          intro: intro || undefined,
          paragraphs,
          bullets
        };
      })
      .filter((section): section is ParsedSection => Boolean(section));
  } catch {
    return [];
  }
}

function formatPublishedDate(value: string) {
  if (!value) {
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Bangkok"
    }).format(new Date());
  }

  const parsedDate = new Date(`${value}T12:00:00+07:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok"
  }).format(parsedDate);
}

async function saveUploadedImage(file: File, slugOrTitle: string, prefix = "cover") {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  assertUploadMatchesPolicy(file, IMAGE_UPLOAD_POLICY);

  const safeBase =
    slugOrTitle
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "article";
  const extension = getSafeUploadExtension(file, ".png", IMAGE_UPLOAD_POLICY.allowedExtensions);
  const fileName = `${safeBase}-${prefix}-${randomUUID()}${extension.toLowerCase()}`;
  const uploadDir = path.join(process.cwd(), "public", "images", "uploads", "articles");
  const filePath = path.join(uploadDir, fileName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  return `/images/uploads/articles/${fileName}`;
}

function validationError(message: string): ArticleFormState {
  return {
    status: "error",
    message
  };
}

function revalidateArticlePaths(slug: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${slug}`);
  revalidatePath("/articles");
  revalidatePath("/catalog");
  revalidatePath(`/articles/${slug}`);
}

export async function createArticleAction(_: ArticleFormState, formData: FormData): Promise<ArticleFormState> {
  await requireAdmin();

  const title = getTextValue(formData, "title");
  const category = getTextValue(formData, "category");
  const excerpt = getTextValue(formData, "excerpt");
  const readTime = getTextValue(formData, "readTime");
  const publishedDate = getTextValue(formData, "publishedDate");
  const introduction = splitParagraphs(getTextValue(formData, "introduction"));
  const parsedSections = parseSections(getTextValue(formData, "sectionsJson"));
  const coverImageFile = formData.get("coverImageFile");

  if (!title || !category || !excerpt) {
    return validationError("กรุณากรอกชื่อบทความ หมวดหมู่ และคำเกริ่นสั้น");
  }

  if (!introduction.length) {
    return validationError("กรุณาเพิ่มบทนำอย่างน้อย 1 ย่อหน้า");
  }

  if (!parsedSections.length) {
    return validationError("กรุณาเพิ่ม section ของบทความอย่างน้อย 1 ส่วน");
  }

  try {
    const sections: ArticleSection[] = [];

    for (const section of parsedSections) {
      const imageField = formData.get(`sectionImage-${section.id}`);
      const sectionImage =
        imageField instanceof File && imageField.size > 0
          ? await saveUploadedImage(imageField, title, `section-${section.id}`)
          : null;

      sections.push({
        title: section.title,
        image: sectionImage ?? undefined,
        intro: section.intro,
        paragraphs: section.paragraphs,
        bullets: section.bullets
      });
    }

    const imagePath =
      coverImageFile instanceof File && coverImageFile.size > 0
        ? await saveUploadedImage(coverImageFile, title)
        : "/images/categories/recommended.jpg";

    const article = await createArticle({
      category,
      title,
      excerpt,
      image: imagePath ?? "/images/categories/recommended.jpg",
      publishedAt: formatPublishedDate(publishedDate),
      readTime: readTime || "อ่าน 5 นาที",
      introduction,
      sections
    });

    revalidateArticlePaths(article.slug);

    return {
      status: "success",
      message: "เพิ่มบทความเรียบร้อยแล้ว"
    };
  } catch (error) {
    return validationError(error instanceof Error ? error.message : "ไม่สามารถบันทึกบทความได้");
  }
}

export async function updateArticleAction(_: ArticleFormState, formData: FormData): Promise<ArticleFormState> {
  await requireAdmin();

  const originalSlug = getTextValue(formData, "originalSlug");
  const title = getTextValue(formData, "title");
  const category = getTextValue(formData, "category");
  const excerpt = getTextValue(formData, "excerpt");
  const readTime = getTextValue(formData, "readTime");
  const publishedDate = getTextValue(formData, "publishedDate");
  const existingPublishedAt = getTextValue(formData, "existingPublishedAt");
  const introduction = splitParagraphs(getTextValue(formData, "introduction"));
  const parsedSections = parseSections(getTextValue(formData, "sectionsJson"));
  const coverImageFile = formData.get("coverImageFile");
  const existingImage = getTextValue(formData, "existingImage");

  if (!originalSlug) {
    return validationError("ไม่พบบทความที่ต้องการแก้ไข");
  }

  if (!title || !category || !excerpt) {
    return validationError("กรุณากรอกชื่อบทความ หมวดหมู่ และคำเกริ่นสั้น");
  }

  if (!introduction.length) {
    return validationError("กรุณาเพิ่มบทนำอย่างน้อย 1 ย่อหน้า");
  }

  if (!parsedSections.length) {
    return validationError("กรุณาเพิ่มส่วนเนื้อหาอย่างน้อย 1 ส่วน");
  }

  try {
    const sections: ArticleSection[] = [];

    for (const section of parsedSections) {
      const imageField = formData.get(`sectionImage-${section.id}`);
      const sectionImage =
        imageField instanceof File && imageField.size > 0
          ? await saveUploadedImage(imageField, title, `section-${section.id}`)
          : section.image;

      sections.push({
        title: section.title,
        image: sectionImage ?? undefined,
        intro: section.intro,
        paragraphs: section.paragraphs,
        bullets: section.bullets
      });
    }

    const imagePath =
      coverImageFile instanceof File && coverImageFile.size > 0
        ? await saveUploadedImage(coverImageFile, title)
        : existingImage || "/images/categories/recommended.jpg";

    const { article, previousSlug } = await updateArticle(originalSlug, {
      category,
      title,
      excerpt,
      image: imagePath ?? "/images/categories/recommended.jpg",
      publishedAt: publishedDate ? formatPublishedDate(publishedDate) : existingPublishedAt,
      readTime: readTime || "อ่าน 5 นาที",
      introduction,
      sections
    });

    revalidateArticlePaths(previousSlug);
    revalidateArticlePaths(article.slug);

    return {
      status: "success",
      message: "บันทึกการแก้ไขบทความเรียบร้อยแล้ว"
    };
  } catch (error) {
    return validationError(error instanceof Error ? error.message : "ไม่สามารถแก้ไขบทความได้");
  }
}

export async function deleteArticleAction(_: ArticleFormState, formData: FormData): Promise<ArticleFormState> {
  await requireAdmin();

  const slug = getTextValue(formData, "slug");

  if (!slug) {
    return validationError("ไม่พบบทความที่ต้องการลบ");
  }

  try {
    await deleteArticle(slug);
    revalidateArticlePaths(slug);

    return {
      status: "success",
      message: "ลบบทความเรียบร้อยแล้ว"
    };
  } catch (error) {
    return validationError(error instanceof Error ? error.message : "ไม่สามารถลบบทความได้");
  }
}
