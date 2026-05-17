"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { IMAGE_UPLOAD_POLICY, assertUploadCount, assertUploadMatchesPolicy, getSafeUploadExtension } from "@/lib/upload-security";

export type ProductFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type ParsedProductForm = {
  productId: string;
  name: string;
  slugInput: string;
  brandName: string;
  categoryName: string;
  subcategoryName: string;
  productTypeName: string;
  promotionType: string;
  recommendedCategory: string;
  countryName: string;
  regionName: string;
  subtitle: string;
  sku: string;
  priceValue: string;
  stockQtyValue: string;
  bottleSizeValue: string;
  alcoholValue: string;
  shortDescription: string;
  fullDescription: string;
  uploadedImageFiles: File[];
  inStock: boolean;
  isFeatured: boolean;
};

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUppercase(value: string) {
  return value.trim().toUpperCase();
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

function parseProductForm(formData: FormData): ParsedProductForm {
  return {
    productId: getTextValue(formData, "productId"),
    name: normalizeUppercase(getTextValue(formData, "name")),
    slugInput: getTextValue(formData, "slug"),
    brandName: normalizeUppercase(getTextValue(formData, "brandName")),
    categoryName: normalizeUppercase(getTextValue(formData, "categoryName")),
    subcategoryName: normalizeUppercase(getTextValue(formData, "subcategoryName")),
    productTypeName: normalizeUppercase(getTextValue(formData, "productTypeName")),
    promotionType: normalizeUppercase(getTextValue(formData, "promotionType")),
    recommendedCategory: getTextValue(formData, "recommendedCategory"),
    countryName: normalizeUppercase(getTextValue(formData, "countryName")),
    regionName: normalizeUppercase(getTextValue(formData, "regionName")),
    subtitle: normalizeUppercase(getTextValue(formData, "subtitle")),
    sku: normalizeUppercase(getTextValue(formData, "sku")),
    priceValue: getTextValue(formData, "price"),
    stockQtyValue: getTextValue(formData, "stockQty"),
    bottleSizeValue: getTextValue(formData, "bottleSizeMl"),
    alcoholValue: getTextValue(formData, "alcoholPercent"),
    shortDescription: getTextValue(formData, "shortDescription"),
    fullDescription: getTextValue(formData, "fullDescription"),
    uploadedImageFiles: formData
      .getAll("mainImageFiles")
      .filter((value): value is File => value instanceof File && value.size > 0),
    inStock: getTextValue(formData, "inStock") === "true",
    isFeatured: getTextValue(formData, "isFeatured") === "true"
  };
}

async function getUniqueSlug(
  client: PoolClient,
  table: "brands" | "categories" | "product_types" | "regions" | "products",
  baseValue: string,
  excludeId?: string
) {
  const baseSlug = slugify(baseValue) || "item";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = excludeId
      ? await client.query(`select id from public.${table} where slug = $1 and id <> $2 limit 1`, [candidate, excludeId])
      : await client.query(`select id from public.${table} where slug = $1 limit 1`, [candidate]);

    if (!existing.rowCount) {
      return candidate;
    }
  }

  return `${baseSlug}-${randomUUID().slice(0, 8)}`;
}

async function saveUploadedImage(file: File, slug: string) {
  if (!file || file.size === 0) {
    return null;
  }

  assertUploadMatchesPolicy(file, IMAGE_UPLOAD_POLICY);

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = getSafeUploadExtension(file, ".png", IMAGE_UPLOAD_POLICY.allowedExtensions);
  const fileName = `${slug || "product"}-${randomUUID()}${extension.toLowerCase()}`;
  const uploadDir = path.join(process.cwd(), "public", "images", "uploads", "products");

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);

  return `/images/uploads/products/${fileName}`;
}

async function saveUploadedImages(files: File[], slug: string) {
  assertUploadCount(files, 6, "รูปสินค้า");

  const uploadedPaths: string[] = [];

  for (const file of files) {
    const imagePath = await saveUploadedImage(file, slug);

    if (imagePath) {
      uploadedPaths.push(imagePath);
    }
  }

  return uploadedPaths;
}

async function getExistingIdByName(client: PoolClient, table: "brands" | "categories" | "countries" | "product_types" | "regions", name: string) {
  const fallback = await client.query(`select id from public.${table} where lower(name) = lower($1) limit 1`, [name]);
  return fallback.rowCount ? String(fallback.rows[0].id) : null;
}

async function findOrCreateBrandId(client: PoolClient, brandName: string) {
  if (!brandName) {
    return null;
  }

  const existing = await client.query(`select id from public.brands where lower(name) = lower($1) limit 1`, [brandName]);
  if (existing.rowCount) {
    return String(existing.rows[0].id);
  }

  await client.query("savepoint brand_lookup");

  try {
    const created = await client.query(
      `
        insert into public.brands (name, slug)
        values ($1, $2)
        returning id
      `,
      [brandName, await getUniqueSlug(client, "brands", brandName)]
    );

    await client.query("release savepoint brand_lookup");
    return String(created.rows[0].id);
  } catch (error) {
    await client.query("rollback to savepoint brand_lookup");

    const existingId = isUniqueViolation(error) ? await getExistingIdByName(client, "brands", brandName) : null;
    if (existingId) {
      return existingId;
    }

    throw error;
  }
}

async function findOrCreateCountryId(client: PoolClient, countryName: string) {
  if (!countryName) {
    return null;
  }

  const existing = await client.query(`select id from public.countries where lower(name) = lower($1) limit 1`, [countryName]);
  if (existing.rowCount) {
    return String(existing.rows[0].id);
  }

  await client.query("savepoint country_lookup");

  try {
    const created = await client.query(
      `
        insert into public.countries (name, code)
        values ($1, null)
        returning id
      `,
      [countryName]
    );

    await client.query("release savepoint country_lookup");
    return String(created.rows[0].id);
  } catch (error) {
    await client.query("rollback to savepoint country_lookup");

    const existingId = isUniqueViolation(error) ? await getExistingIdByName(client, "countries", countryName) : null;
    if (existingId) {
      return existingId;
    }

    throw error;
  }
}

async function findOrCreateCategoryId(client: PoolClient, categoryName: string, parentId?: string | null) {
  if (!categoryName) {
    return null;
  }

  const existing = await client.query(
    `
      select id
      from public.categories
      where lower(name) = lower($1)
        and (
          ($2::uuid is null and parent_id is null)
          or parent_id = $2::uuid
        )
      limit 1
    `,
    [categoryName, parentId ?? null]
  );
  if (existing.rowCount) {
    return String(existing.rows[0].id);
  }

  await client.query("savepoint category_lookup");

  try {
    const created = await client.query(
      `
        insert into public.categories (name, slug, parent_id)
        values ($1, $2, $3::uuid)
        returning id
      `,
      [categoryName, await getUniqueSlug(client, "categories", parentId ? `${categoryName}-${parentId}` : categoryName), parentId ?? null]
    );

    await client.query("release savepoint category_lookup");
    return String(created.rows[0].id);
  } catch (error) {
    await client.query("rollback to savepoint category_lookup");

    const existingId = isUniqueViolation(error) ? await getExistingIdByName(client, "categories", categoryName) : null;
    if (existingId) {
      return existingId;
    }

    throw error;
  }
}

async function findOrCreateProductTypeId(client: PoolClient, typeName: string) {
  if (!typeName) {
    return null;
  }

  const existing = await client.query(`select id from public.product_types where lower(name) = lower($1) limit 1`, [typeName]);
  if (existing.rowCount) {
    return String(existing.rows[0].id);
  }

  await client.query("savepoint product_type_lookup");

  try {
    const created = await client.query(
      `
        insert into public.product_types (name, slug)
        values ($1, $2)
        returning id
      `,
      [typeName, await getUniqueSlug(client, "product_types", typeName)]
    );

    await client.query("release savepoint product_type_lookup");
    return String(created.rows[0].id);
  } catch (error) {
    await client.query("rollback to savepoint product_type_lookup");

    const existingId = isUniqueViolation(error) ? await getExistingIdByName(client, "product_types", typeName) : null;
    if (existingId) {
      return existingId;
    }

    throw error;
  }
}

async function findOrCreateRegionId(client: PoolClient, regionName: string, countryId?: string | null) {
  if (!regionName) {
    return null;
  }

  const existing = await client.query(
    `
      select id
      from public.regions
      where lower(name) = lower($1)
        and (
          ($2::uuid is null and country_id is null)
          or country_id = $2::uuid
        )
      limit 1
    `,
    [regionName, countryId ?? null]
  );

  if (existing.rowCount) {
    return String(existing.rows[0].id);
  }

  await client.query("savepoint region_lookup");

  try {
    const created = await client.query(
      `
        insert into public.regions (country_id, name, slug)
        values ($1::uuid, $2, $3)
        returning id
      `,
      [countryId ?? null, regionName, await getUniqueSlug(client, "regions", countryId ? `${regionName}-${countryId}` : regionName)]
    );

    await client.query("release savepoint region_lookup");
    return String(created.rows[0].id);
  } catch (error) {
    await client.query("rollback to savepoint region_lookup");

    const existingId = isUniqueViolation(error) ? await getExistingIdByName(client, "regions", regionName) : null;
    if (existingId) {
      return existingId;
    }

    throw error;
  }
}

function buildValidationError(message: string): ProductFormState {
  return {
    status: "error",
    message
  };
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505");
}

function validateParsedProduct(data: ParsedProductForm) {
  if (!data.name || !data.categoryName || !data.priceValue) {
    return buildValidationError("กรุณากรอกชื่อสินค้า หมวดสินค้า และราคา");
  }

  const price = Number(data.priceValue);
  const stockQty = Number(data.stockQtyValue || "0");

  if (!Number.isFinite(price)) {
    return buildValidationError("ราคาต้องเป็นตัวเลขที่ถูกต้อง");
  }

  if (!Number.isFinite(stockQty)) {
    return buildValidationError("จำนวนสต๊อกต้องเป็นตัวเลขที่ถูกต้อง");
  }

  return null;
}

function mapUniqueConstraintError(error: unknown): ProductFormState {
  const dbError = error as { constraint?: string; detail?: string; table?: string };
  const detail = `${dbError.constraint ?? ""} ${dbError.table ?? ""} ${dbError.detail ?? ""}`.toLowerCase();

  if (detail.includes("sku")) {
    return buildValidationError("SKU นี้ถูกใช้งานแล้ว");
  }

  if (detail.includes("slug")) {
    return buildValidationError("Slug นี้ถูกใช้งานแล้ว");
  }

  return buildValidationError("มีข้อมูลบางรายการซ้ำในฐานข้อมูล กรุณาตรวจสอบฟอร์มแล้วลองใหม่");
}

export async function createProductAction(_: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();

  const data = parseProductForm(formData);
  const validationError = validateParsedProduct(data);
  if (validationError) {
    return validationError;
  }

  const client = await db.connect();

  try {
    await client.query("begin");

    const slug = await getUniqueSlug(client, "products", data.slugInput || data.name);
    const brandId = await findOrCreateBrandId(client, data.brandName);
    const mainCategoryId = await findOrCreateCategoryId(client, data.categoryName);
    const categoryId = data.subcategoryName ? await findOrCreateCategoryId(client, data.subcategoryName, mainCategoryId) : mainCategoryId;
    const productTypeId = await findOrCreateProductTypeId(client, data.productTypeName);
    const countryId = await findOrCreateCountryId(client, data.countryName);
    const regionId = await findOrCreateRegionId(client, data.regionName, countryId);
    const uploadedImageUrls = await saveUploadedImages(data.uploadedImageFiles, slug);

    const productResult = await client.query(
      `
        insert into public.products (
          brand_id,
          category_id,
          product_type_id,
          country_id,
          region_id,
          name,
          slug,
          subtitle,
          sku,
          price,
          stock_qty,
          in_stock,
          is_featured,
          promotion_type,
          recommended_category,
          bottle_size_ml,
          alcohol_percent,
          short_description,
          full_description
        )
        values (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::uuid,
          $5::uuid,
          $6,
          $7,
          nullif($8, ''),
          nullif($9, ''),
          $10,
          $11,
          $12,
          $13,
          $14,
          nullif($15, ''),
          $16,
          $17,
          nullif($18, ''),
          nullif($19, '')
        )
        returning id, slug
      `,
      [
        brandId ?? null,
        categoryId,
        productTypeId ?? null,
        countryId ?? null,
        regionId ?? null,
        data.name,
        slug,
        data.subtitle,
        data.sku,
        Number(data.priceValue),
        Number(data.stockQtyValue || "0"),
        data.inStock,
        data.isFeatured,
        data.promotionType,
        data.recommendedCategory,
        getNullableNumber(data.bottleSizeValue),
        getNullableNumber(data.alcoholValue),
        data.shortDescription,
        data.fullDescription
      ]
    );

    const productId = String(productResult.rows[0].id);

    for (const [index, imageUrl] of uploadedImageUrls.entries()) {
      await client.query(
        `
          insert into public.product_images (product_id, image_url, alt_text, sort_order, is_main)
          values ($1, $2, $3, $4, $5)
        `,
        [productId, imageUrl, data.name, index + 1, index === 0]
      );
    }

    await client.query("commit");

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/whisky");
    revalidatePath("/recommended/best-sellers");
    revalidatePath("/recommended/new-arrivals");
    revalidatePath("/recommended/monthly-picks");
    revalidatePath("/recommended/premium-selection");
    revalidatePath("/recommended/gift-selection");
    revalidatePath(`/products/${slug}`);

    return {
      status: "success",
      message: "เพิ่มสินค้าเรียบร้อยแล้ว"
    };
  } catch (error) {
    await client.query("rollback");

    if (isUniqueViolation(error)) {
      return mapUniqueConstraintError(error);
    }

    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42703") {
      return buildValidationError("ฐานข้อมูลยังไม่มีฟิลด์หมวดสินค้าแนะนำ กรุณารัน supabase/add-product-recommended-category.sql ก่อน");
    }

    return buildValidationError(error instanceof Error ? error.message : "ไม่สามารถบันทึกสินค้าได้");
  } finally {
    client.release();
  }
}

export async function updateProductAction(_: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();

  const data = parseProductForm(formData);
  const validationError = validateParsedProduct(data);
  if (validationError) {
    return validationError;
  }

  if (!data.productId) {
    return buildValidationError("ไม่พบรหัสสินค้าที่ต้องการแก้ไข");
  }

  const client = await db.connect();

  try {
    await client.query("begin");

    const existingProduct = await client.query(
      `
        select id, slug
        from public.products
        where id = $1
        limit 1
      `,
      [data.productId]
    );

    if (!existingProduct.rowCount) {
      await client.query("rollback");
      return buildValidationError("ไม่พบสินค้าที่ต้องการแก้ไข");
    }

    const currentSlug = String(existingProduct.rows[0].slug);
    const requestedSlug = slugify(data.slugInput || data.name);
    const finalSlug =
      !requestedSlug || requestedSlug === currentSlug
        ? currentSlug
        : await getUniqueSlug(client, "products", requestedSlug, data.productId);

    const brandId = await findOrCreateBrandId(client, data.brandName);
    const mainCategoryId = await findOrCreateCategoryId(client, data.categoryName);
    const categoryId = data.subcategoryName ? await findOrCreateCategoryId(client, data.subcategoryName, mainCategoryId) : mainCategoryId;
    const productTypeId = await findOrCreateProductTypeId(client, data.productTypeName);
    const countryId = await findOrCreateCountryId(client, data.countryName);
    const regionId = await findOrCreateRegionId(client, data.regionName, countryId);

    await client.query(
      `
        update public.products
        set
          brand_id = $2::uuid,
          category_id = $3::uuid,
          product_type_id = $4::uuid,
          country_id = $5::uuid,
          region_id = $6::uuid,
          name = $7,
          slug = $8,
          subtitle = nullif($9, ''),
          sku = nullif($10, ''),
          price = $11,
          stock_qty = $12,
          in_stock = $13,
          is_featured = $14,
          promotion_type = nullif($15, ''),
          recommended_category = nullif($16, ''),
          bottle_size_ml = $17,
          alcohol_percent = $18,
          short_description = nullif($19, ''),
          full_description = nullif($20, '')
        where id = $1
      `,
      [
        data.productId,
        brandId ?? null,
        categoryId,
        productTypeId ?? null,
        countryId ?? null,
        regionId ?? null,
        data.name,
        finalSlug,
        data.subtitle,
        data.sku,
        Number(data.priceValue),
        Number(data.stockQtyValue || "0"),
        data.inStock,
        data.isFeatured,
        data.promotionType,
        data.recommendedCategory,
        getNullableNumber(data.bottleSizeValue),
        getNullableNumber(data.alcoholValue),
        data.shortDescription,
        data.fullDescription
      ]
    );

    if (data.uploadedImageFiles.length) {
      const imageCountResult = await client.query(
        `
          select count(*)::int as count
          from public.product_images
          where product_id = $1
        `,
        [data.productId]
      );

      const existingImageCount = Number(imageCountResult.rows[0]?.count ?? 0);
      const uploadedImageUrls = await saveUploadedImages(data.uploadedImageFiles, finalSlug);

      for (const [index, imageUrl] of uploadedImageUrls.entries()) {
        await client.query(
          `
            insert into public.product_images (product_id, image_url, alt_text, sort_order, is_main)
            values ($1, $2, $3, $4, $5)
          `,
          [data.productId, imageUrl, data.name, existingImageCount + index + 1, existingImageCount === 0 && index === 0]
        );
      }
    }

    await client.query("commit");

    revalidatePath("/admin");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath("/");
    revalidatePath("/whisky");
    revalidatePath("/recommended/best-sellers");
    revalidatePath("/recommended/new-arrivals");
    revalidatePath("/recommended/monthly-picks");
    revalidatePath("/recommended/premium-selection");
    revalidatePath("/recommended/gift-selection");
    revalidatePath(`/products/${currentSlug}`);
    revalidatePath(`/products/${finalSlug}`);

    return {
      status: "success",
      message: "อัปเดตสินค้าเรียบร้อยแล้ว"
    };
  } catch (error) {
    await client.query("rollback");

    if (isUniqueViolation(error)) {
      return mapUniqueConstraintError(error);
    }

    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42703") {
      return buildValidationError("ฐานข้อมูลยังไม่มีฟิลด์หมวดสินค้าแนะนำ กรุณารัน supabase/add-product-recommended-category.sql ก่อน");
    }

    return buildValidationError(error instanceof Error ? error.message : "ไม่สามารถอัปเดตสินค้าได้");
  } finally {
    client.release();
  }
}

export async function deleteProductAction(_: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();

  const productId = getTextValue(formData, "productId");
  const productSlug = getTextValue(formData, "productSlug");

  if (!productId) {
    return buildValidationError("ไม่พบสินค้าที่ต้องการลบ");
  }

  try {
    const result = await db.query(
      `
        delete from public.products
        where id = $1
        returning slug
      `,
      [productId]
    );

    if (!result.rowCount) {
      return buildValidationError("ไม่พบสินค้าที่ต้องการลบ");
    }

    const deletedSlug = String(result.rows[0]?.slug ?? productSlug);

    revalidatePath("/admin");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/");
    revalidatePath("/whisky");
    revalidatePath("/recommended/best-sellers");
    revalidatePath("/recommended/new-arrivals");
    revalidatePath("/recommended/monthly-picks");
    revalidatePath("/recommended/premium-selection");
    revalidatePath("/recommended/gift-selection");

    if (deletedSlug) {
      revalidatePath(`/products/${deletedSlug}`);
    }

    return {
      status: "success",
      message: "ลบสินค้าเรียบร้อยแล้ว"
    };
  } catch (error) {
    return buildValidationError(error instanceof Error ? error.message : "ไม่สามารถลบสินค้าได้");
  }
}

export async function updateProductStockAction(_: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();

  const productId = getTextValue(formData, "productId");
  const productSlug = getTextValue(formData, "productSlug");
  const quantityToAddValue = getTextValue(formData, "quantityToAdd");
  const quantityToAdd = Number(quantityToAddValue);

  if (!productId) {
    return buildValidationError("ไม่พบสินค้าที่ต้องการอัปเดตจำนวน");
  }

  if (!Number.isInteger(quantityToAdd) || quantityToAdd <= 0) {
    return buildValidationError("กรุณาใส่จำนวนเต็มที่มากกว่า 0");
  }

  try {
    const result = await db.query(
      `
        update public.products
        set
          stock_qty = greatest(0, coalesce(stock_qty, 0) + $2::int),
          in_stock = greatest(0, coalesce(stock_qty, 0) + $2::int) > 0
        where id = $1
        returning stock_qty
      `,
      [productId, quantityToAdd]
    );

    if (!result.rowCount) {
      return buildValidationError("ไม่พบสินค้าที่ต้องการอัปเดตจำนวน");
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin");
    revalidatePath(`/admin/products/${productId}`);

    if (productSlug) {
      revalidatePath(`/products/${productSlug}`);
    }

    return {
      status: "success",
      message: `เพิ่มจำนวนสินค้าเรียบร้อยแล้ว คงเหลือ ${Number(result.rows[0]?.stock_qty ?? 0)} ชิ้น`
    };
  } catch (error) {
    return buildValidationError(
      error instanceof Error ? error.message : "ไม่สามารถอัปเดตจำนวนสินค้าได้"
    );
  }
}
