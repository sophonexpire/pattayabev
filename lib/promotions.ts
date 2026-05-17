import { db } from "@/lib/db";

type QueryRow = Record<string, unknown>;

export type PromotionCard = {
  id: string;
  title: string;
  slug: string;
  promotionType: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkedProductId: string | null;
  linkedProductName: string | null;
  linkedProductSlug: string | null;
  linkedProductPrice: number | null;
  linkedProductCurrency: string;
  linkedProductBrandName: string | null;
  linkedProductBottleSizeMl: number | null;
  discountPercent: number | null;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | null;
};

function isMissingPromotionsTable(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      ["42P01", "42703"].includes((error as { code?: string }).code ?? "")
  );
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }

  return 0;
}

function mapPromotion(row: QueryRow): PromotionCard {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    promotionType: String(row.promotion_type),
    description: row.description ? String(row.description) : null,
    imageUrl: row.image_url ? String(row.image_url) : null,
    linkUrl: row.link_url ? String(row.link_url) : null,
    linkedProductId: row.product_id ? String(row.product_id) : null,
    linkedProductName: row.product_name ? String(row.product_name) : null,
    linkedProductSlug: row.product_slug ? String(row.product_slug) : null,
    linkedProductPrice: row.product_price != null ? toNumber(row.product_price) : null,
    linkedProductCurrency: row.product_currency ? String(row.product_currency) : "THB",
    linkedProductBrandName: row.product_brand_name ? String(row.product_brand_name) : null,
    linkedProductBottleSizeMl: row.product_bottle_size_ml ? Number(row.product_bottle_size_ml) : null,
    discountPercent: row.discount_percent ? Number(row.discount_percent) : null,
    startAt: row.start_at ? String(row.start_at) : null,
    endAt: row.end_at ? String(row.end_at) : null,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 1),
    createdAt: row.created_at ? String(row.created_at) : null
  };
}

const promotionSelect = `
  select
    pr.id,
    pr.title,
    pr.slug,
    pr.promotion_type,
    pr.description,
    coalesce(pr.image_url, (
      select pi.image_url
      from public.product_images pi
      where pi.product_id = pr.product_id
      order by pi.is_main desc, pi.sort_order asc
      limit 1
    )) as image_url,
    pr.link_url,
    pr.product_id,
    pr.discount_percent,
    pr.start_at,
    pr.end_at,
    pr.is_active,
    pr.sort_order,
    pr.created_at,
    p.name as product_name,
    p.slug as product_slug,
    p.price as product_price,
    p.currency as product_currency,
    p.bottle_size_ml as product_bottle_size_ml,
    b.name as product_brand_name
  from public.promotions pr
  left join public.products p on p.id = pr.product_id
  left join public.brands b on b.id = p.brand_id
`;

export function getDiscountedPrice(price: number | null, discountPercent: number | null) {
  if (price == null) {
    return null;
  }

  if (discountPercent == null || discountPercent <= 0) {
    return price;
  }

  return Math.max(0, price - price * (discountPercent / 100));
}

export function formatPromotionBenefit(promotion: Pick<PromotionCard, "discountPercent" | "startAt" | "endAt">) {
  const parts: string[] = [];

  if (promotion.discountPercent != null) {
    parts.push(`ลด ${promotion.discountPercent}%`);
  }

  if (promotion.startAt || promotion.endAt) {
    const formatDate = (value: string | null) =>
      value
        ? new Intl.DateTimeFormat("th-TH", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          }).format(new Date(value))
        : null;

    const start = formatDate(promotion.startAt);
    const end = formatDate(promotion.endAt);

    if (start && end) {
      parts.push(`${start} - ${end}`);
    } else if (start) {
      parts.push(`เริ่ม ${start}`);
    } else if (end) {
      parts.push(`ถึง ${end}`);
    }
  }

  return parts.join(" | ") || "โปรโมชั่นส่วนลด";
}

export async function getActivePromotions(): Promise<PromotionCard[]> {
  try {
    const result = await db.query(
      `
        ${promotionSelect}
        where pr.is_active = true
          and (pr.start_at is null or pr.start_at <= now())
          and (pr.end_at is null or pr.end_at >= now())
        order by pr.sort_order asc, pr.created_at desc
      `
    );

    return result.rows.map((row) => mapPromotion(row as QueryRow));
  } catch (error) {
    if (isMissingPromotionsTable(error)) {
      return [];
    }

    throw error;
  }
}

export async function getAdminPromotions(limit = 50): Promise<PromotionCard[]> {
  try {
    const result = await db.query(
      `
        ${promotionSelect}
        order by pr.sort_order asc, pr.created_at desc
        limit $1
      `,
      [limit]
    );

    return result.rows.map((row) => mapPromotion(row as QueryRow));
  } catch (error) {
    if (isMissingPromotionsTable(error)) {
      return [];
    }

    throw error;
  }
}

export async function getAdminPromotionById(id: string): Promise<PromotionCard | null> {
  try {
    const result = await db.query(
      `
        ${promotionSelect}
        where pr.id = $1
        limit 1
      `,
      [id]
    );

    return result.rowCount ? mapPromotion(result.rows[0] as QueryRow) : null;
  } catch (error) {
    if (isMissingPromotionsTable(error)) {
      return null;
    }

    throw error;
  }
}
