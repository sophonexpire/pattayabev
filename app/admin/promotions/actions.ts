"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { savePublicImageUpload } from "@/lib/upload-storage";

export type PromotionFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableNumber(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getUniquePromotionSlug(baseValue: string, excludeId?: string) {
  const baseSlug = slugify(baseValue) || "promotion";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    let existing;

    try {
      existing = excludeId
        ? await db.query(`select id from public.promotions where slug = $1 and id <> $2::uuid limit 1`, [candidate, excludeId])
        : await db.query(`select id from public.promotions where slug = $1 limit 1`, [candidate]);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        const code = (error as { code?: string }).code;

        if (code === "42P01" || code === "42703") {
          return candidate;
        }
      }

      throw error;
    }

    if (!existing.rowCount) {
      return candidate;
    }
  }

  return `${baseSlug}-${randomUUID().slice(0, 8)}`;
}

function buildValidationError(message: string): PromotionFormState {
  return {
    status: "error",
    message
  };
}

async function resolvePromotionProduct(productId: string) {
  if (!productId) {
    return {
      linkUrl: "",
      productId: null as string | null
    };
  }

  const productResult = await db.query(
    `
      select id, slug
      from public.products
      where id = $1
      limit 1
    `,
    [productId]
  );

  if (!productResult.rowCount) {
    return {
      linkUrl: "",
      productId: null as string | null
    };
  }

  return {
    linkUrl: `/products/${String(productResult.rows[0].slug)}`,
    productId: String(productResult.rows[0].id)
  };
}

function isMissingPromotionSchemaError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      ["42P01", "42703"].includes((error as { code?: string }).code ?? "")
  );
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505");
}

function mapPromotionSaveError(error: unknown): PromotionFormState {
  if (isMissingPromotionSchemaError(error)) {
    return buildValidationError("ตารางโปรโมชั่นยังไม่มีฟิลด์ที่จำเป็น กรุณารัน supabase/create-promotions.sql ก่อน");
  }

  if (isUniqueViolation(error)) {
    return buildValidationError("ชื่อโปรโมชั่นนี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น");
  }

  return buildValidationError(error instanceof Error ? error.message : "ไม่สามารถบันทึกโปรโมชั่นได้");
}

async function saveUploadedPromotionImage(file: File, slug: string) {
  return savePublicImageUpload({
    file,
    folder: "promotions",
    baseName: slug,
    fallbackBaseName: "promotion"
  });
}

export async function createPromotionAction(_: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  await requireAdmin();

  const title = getTextValue(formData, "title");
  const promotionType = "DISCOUNT";
  const description = getTextValue(formData, "description");
  const productId = getTextValue(formData, "productId");
  const discountPercent = getNullableNumber(getTextValue(formData, "discountPercent"));
  const startDate = getTextValue(formData, "startDate");
  const endDate = getTextValue(formData, "endDate");
  const isActive = getTextValue(formData, "isActive") === "true";
  const imageFile = formData.get("promotionImage");

  if (!title) {
    return {
      status: "error",
      message: "กรุณากรอกชื่อโปรโมชั่น"
    };
  }

  if (!productId) {
    return {
      status: "error",
      message: "กรุณาเลือกสินค้าก่อน"
    };
  }

  if (promotionType === "DISCOUNT" && (!discountPercent || discountPercent <= 0 || discountPercent > 100)) {
    return {
      status: "error",
      message: "กรุณากรอกเปอร์เซ็นต์ส่วนลดให้ถูกต้อง"
    };
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return {
      status: "error",
      message: "วันสิ้นสุดโปรโมชั่นต้องอยู่หลังวันเริ่มต้น"
    };
  }

  const slug = await getUniquePromotionSlug(title);

  try {
    const { linkUrl: resolvedLinkUrl, productId: resolvedProductId } = await resolvePromotionProduct(productId);

    const imageUrl = imageFile instanceof File && imageFile.size > 0 ? await saveUploadedPromotionImage(imageFile, slug) : null;

    await db.query(
      `
        insert into public.promotions (
          title,
          slug,
          promotion_type,
          description,
          image_url,
          link_url,
          product_id,
          discount_percent,
          start_at,
          end_at,
          min_quantity,
          bundle_price,
          fixed_price,
          is_active,
          sort_order
        )
        values ($1, $2, $3, nullif($4, ''), $5, nullif($6, ''), $7::uuid, $8, $9, $10, $11, $12, $13, $14, 1)
      `,
      [
        title,
        slug,
        promotionType,
        description,
        imageUrl,
        resolvedLinkUrl,
        resolvedProductId,
        discountPercent,
        startDate ? new Date(`${startDate}T00:00:00`) : null,
        endDate ? new Date(`${endDate}T23:59:59`) : null,
        null,
        null,
        null,
        isActive
      ]
    );

    revalidatePath("/admin/promotions");
    revalidatePath("/promotions");

    return {
      status: "success",
      message: "เพิ่มโปรโมชั่นเรียบร้อยแล้ว"
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code?: string }).code;

      if (code === "42P01" || code === "42703") {
        return {
          status: "error",
          message: "ตารางโปรโมชั่นยังไม่มีฟิลด์ที่จำเป็น กรุณารัน supabase/create-promotions.sql ก่อน"
        };
      }

      if (code === "23505") {
        return {
          status: "error",
          message: "ชื่อโปรโมชั่นนี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น"
        };
      }
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "ไม่สามารถบันทึกโปรโมชั่นได้"
    };
  }
}

export async function updatePromotionAction(_: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  await requireAdmin();

  const promotionId = getTextValue(formData, "promotionId");
  const title = getTextValue(formData, "title");
  const promotionType = "DISCOUNT";
  const description = getTextValue(formData, "description");
  const productId = getTextValue(formData, "productId");
  const discountPercent = getNullableNumber(getTextValue(formData, "discountPercent"));
  const startDate = getTextValue(formData, "startDate");
  const endDate = getTextValue(formData, "endDate");
  const isActive = getTextValue(formData, "isActive") === "true";
  const existingImageUrl = getTextValue(formData, "existingImageUrl");
  const imageFile = formData.get("promotionImage");

  if (!promotionId) {
    return buildValidationError("ไม่พบโปรโมชั่นที่ต้องการแก้ไข");
  }

  if (!title) {
    return buildValidationError("กรุณากรอกชื่อโปรโมชั่น");
  }

  if (!productId) {
    return buildValidationError("กรุณาเลือกสินค้าก่อน");
  }

  if (!discountPercent || discountPercent <= 0 || discountPercent > 100) {
    return buildValidationError("กรุณากรอกเปอร์เซ็นต์ส่วนลดให้ถูกต้อง");
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return buildValidationError("วันสิ้นสุดโปรโมชั่นต้องอยู่หลังวันเริ่มต้น");
  }

  try {
    const existingPromotion = await db.query(
      `
        select id, slug
        from public.promotions
        where id = $1::uuid
        limit 1
      `,
      [promotionId]
    );

    if (!existingPromotion.rowCount) {
      return buildValidationError("ไม่พบโปรโมชั่นที่ต้องการแก้ไข");
    }

    const requestedSlug = slugify(title);
    const currentSlug = String(existingPromotion.rows[0].slug);
    const finalSlug =
      !requestedSlug || requestedSlug === currentSlug
        ? currentSlug
        : await getUniquePromotionSlug(requestedSlug, promotionId);
    const { linkUrl: resolvedLinkUrl, productId: resolvedProductId } = await resolvePromotionProduct(productId);
    const imageUrl =
      imageFile instanceof File && imageFile.size > 0
        ? await saveUploadedPromotionImage(imageFile, finalSlug)
        : existingImageUrl || null;

    await db.query(
      `
        update public.promotions
        set
          title = $2,
          slug = $3,
          promotion_type = $4,
          description = nullif($5, ''),
          image_url = $6,
          link_url = nullif($7, ''),
          product_id = $8::uuid,
          discount_percent = $9,
          start_at = $10,
          end_at = $11,
          min_quantity = null,
          bundle_price = null,
          fixed_price = null,
          is_active = $12
        where id = $1::uuid
      `,
      [
        promotionId,
        title,
        finalSlug,
        promotionType,
        description,
        imageUrl,
        resolvedLinkUrl,
        resolvedProductId,
        discountPercent,
        startDate ? new Date(`${startDate}T00:00:00`) : null,
        endDate ? new Date(`${endDate}T23:59:59`) : null,
        isActive
      ]
    );

    revalidatePath("/admin/promotions");
    revalidatePath(`/admin/promotions/${promotionId}`);
    revalidatePath("/promotions");

    return {
      status: "success",
      message: "บันทึกการแก้ไขโปรโมชั่นเรียบร้อยแล้ว"
    };
  } catch (error) {
    return mapPromotionSaveError(error);
  }
}

export async function deletePromotionAction(_: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  await requireAdmin();

  const promotionId = getTextValue(formData, "promotionId");

  if (!promotionId) {
    return buildValidationError("ไม่พบโปรโมชั่นที่ต้องการลบ");
  }

  try {
    const result = await db.query(
      `
        delete from public.promotions
        where id = $1::uuid
        returning id
      `,
      [promotionId]
    );

    if (!result.rowCount) {
      return buildValidationError("ไม่พบโปรโมชั่นที่ต้องการลบ");
    }

    revalidatePath("/admin/promotions");
    revalidatePath(`/admin/promotions/${promotionId}`);
    revalidatePath("/promotions");

    return {
      status: "success",
      message: "ลบโปรโมชั่นเรียบร้อยแล้ว"
    };
  } catch (error) {
    return buildValidationError(error instanceof Error ? error.message : "ไม่สามารถลบโปรโมชั่นได้");
  }
}
