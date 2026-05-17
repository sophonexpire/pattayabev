"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { createPromotionAction } from "@/app/admin/promotions/actions";
import type { PromotionFormState } from "@/app/admin/promotions/actions";
import type { AdminProductListItem } from "@/lib/products";
import type { PromotionCard } from "@/lib/promotions";

type PromotionFormAction = (
  state: PromotionFormState,
  formData: FormData
) => Promise<PromotionFormState>;

type PreviewState = {
  title: string;
  linkedProductLabel: string;
  discountPercent: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
  originalPrice: number | null;
  currency: string;
};

const initialPromotionFormState: PromotionFormState = {
  status: "idle",
  message: ""
};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[#171212] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#2a2323] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "กำลังบันทึก..." : mode === "edit" ? "บันทึกการแก้ไข" : "เพิ่มโปรโมชั่น"}
    </button>
  );
}

function formatCurrency(value: number, currency = "THB") {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function getDiscountedPrice(originalPrice: number | null, discountPercent: string) {
  if (!originalPrice) {
    return null;
  }

  const parsedDiscount = Number(discountPercent);

  if (!Number.isFinite(parsedDiscount) || parsedDiscount <= 0) {
    return originalPrice;
  }

  return Math.max(0, originalPrice - originalPrice * (parsedDiscount / 100));
}

function formatPromotionPeriod(startDate: string, endDate: string) {
  if (!startDate && !endDate) {
    return "ยังไม่ได้เลือกช่วงเวลาโปรโมชั่น";
  }

  if (startDate && endDate) {
    return `${startDate} - ${endDate}`;
  }

  if (startDate) {
    return `เริ่ม ${startDate}`;
  }

  return `ถึง ${endDate}`;
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function PromotionForm({
  products,
  mode = "create",
  promotion,
  action
}: {
  products: AdminProductListItem[];
  mode?: "create" | "edit";
  promotion?: PromotionCard;
  action?: PromotionFormAction;
}) {
  const formActionToUse = action ?? createPromotionAction;
  const [state, formAction] = useFormState(formActionToUse, initialPromotionFormState);
  const productLookup = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const searchableProducts = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        label: `${product.name}${product.sku ? ` | SKU: ${product.sku}` : ""}`,
        searchText: `${product.name} ${product.subtitle ?? ""} ${product.slug} ${product.sku ?? ""} ${product.id}`.toLowerCase()
      })),
    [products]
  );

  const initialProduct = promotion?.linkedProductId ? productLookup.get(promotion.linkedProductId) : null;
  const [preview, setPreview] = useState<PreviewState>({
    title: promotion?.title ?? "โปรโมชั่นส่วนลด",
    linkedProductLabel: promotion?.linkedProductName ?? "ยังไม่ได้เลือกสินค้า",
    discountPercent: promotion?.discountPercent != null ? String(promotion.discountPercent) : "",
    startDate: toDateInputValue(promotion?.startAt ?? null),
    endDate: toDateInputValue(promotion?.endAt ?? null),
    imageUrl: promotion?.imageUrl || initialProduct?.imageUrl || "/images/hero/promo-buy-more.jpg",
    originalPrice: promotion?.linkedProductPrice ?? initialProduct?.price ?? null,
    currency: promotion?.linkedProductCurrency ?? initialProduct?.currency ?? "THB"
  });
  const [productSearch, setProductSearch] = useState(
    promotion?.linkedProductName ? `${promotion.linkedProductName}` : ""
  );
  const [selectedProductId, setSelectedProductId] = useState(promotion?.linkedProductId ?? "");

  const filteredProducts = useMemo(() => {
    const keyword = productSearch.trim().toLowerCase();

    if (!keyword) {
      return searchableProducts.slice(0, 8);
    }

    return searchableProducts.filter((product) => product.searchText.includes(keyword)).slice(0, 8);
  }, [productSearch, searchableProducts]);

  const discountedPrice = getDiscountedPrice(preview.originalPrice, preview.discountPercent);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const firstFile = files[0];
    if (!firstFile) return;
    setPreview((current) => ({
      ...current,
      imageUrl: URL.createObjectURL(firstFile)
    }));
  };

  const selectProduct = (productId: string) => {
    const searchableProduct = searchableProducts.find((product) => product.id === productId);
    const product = productLookup.get(productId);

    setSelectedProductId(productId);
    setProductSearch(searchableProduct?.label ?? "");
    setPreview((current) => ({
      ...current,
      title: product && mode === "create" ? `${product.name} โปรโมชั่นส่วนลด` : current.title,
      linkedProductLabel: product ? product.name : "ยังไม่ได้เลือกสินค้า",
      imageUrl: product?.imageUrl || current.imageUrl,
      originalPrice: product?.price ?? null,
      currency: product?.currency ?? "THB"
    }));
  };

  const handleProductSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    setProductSearch(rawValue);

    const exactMatch = searchableProducts.find((product) => product.label === rawValue);

    if (exactMatch) {
      selectProduct(exactMatch.id);
      return;
    }

    setSelectedProductId("");
    setPreview((current) => ({
      ...current,
      linkedProductLabel: "ยังไม่ได้เลือกสินค้า",
      originalPrice: null
    }));
  };

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]">
      <form action={formAction} className="grid gap-6">
        {promotion ? (
          <>
            <input type="hidden" name="promotionId" value={promotion.id} />
            <input type="hidden" name="existingImageUrl" value={promotion.imageUrl ?? ""} />
          </>
        ) : null}

        <section className="rounded-[24px] border border-[#ece4d6] bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
          <div className="border-b border-[#ece4d6] pb-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b6a2b]">ข้อมูลโปรโมชั่น</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#171212]">
              {mode === "edit" ? "แก้ไขโปรโมชั่นส่วนลด" : "สร้างโปรโมชั่นส่วนลด"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f5852]">
              เริ่มจากเลือกสินค้า จากนั้นกรอกเปอร์เซ็นต์ส่วนลดและช่วงเวลาโปรโมชั่น ระบบจะคำนวณราคาหลังลดในตัวอย่างให้ทันที
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212] md:col-span-2">
              <span>สินค้าที่เชื่อม</span>
              <input
                value={productSearch}
                onChange={handleProductSearchChange}
                placeholder="ค้นหาจากชื่อสินค้าหรือ SKU"
                className="min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
              />
              <input type="hidden" name="productId" value={selectedProductId} />
              <input type="hidden" name="promotionType" value="DISCOUNT" />
              <div className="max-h-[240px] overflow-y-auto rounded-2xl border border-[#ece4d6] bg-[#fffdf8]">
                {products.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[#7a736b]">ยังไม่มีสินค้าในระบบ กรุณาเพิ่มสินค้าก่อนแล้วรีเฟรชหน้านี้อีกครั้ง</div>
                ) : filteredProducts.length ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectProduct(product.id)}
                      className={`flex w-full items-start justify-between gap-3 border-b border-[#efe7dc] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#f7f1e8] ${
                        selectedProductId === product.id ? "bg-[#f3ecdf]" : "bg-transparent"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[#171212]">{product.label}</span>
                      </span>
                      {selectedProductId === product.id ? (
                        <span className="shrink-0 rounded-full bg-[#171212] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">เลือกแล้ว</span>
                      ) : null}
                    </button>
                  ))
                ) : (
                    <div className="px-4 py-3 text-sm text-[#7a736b]">ไม่พบสินค้าที่ค้นหา</div>
                )}
              </div>
              <span className="text-xs font-normal leading-5 text-[#7a736b]">ค้นหาจากชื่อสินค้าหรือ SKU แล้วกดเลือกรายการด้านล่าง</span>
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
              <span>เปอร์เซ็นต์ส่วนลด</span>
              <input
                name="discountPercent"
                type="number"
                min="1"
                max="100"
                step="0.01"
                placeholder="15"
                value={preview.discountPercent}
                onChange={(event) => setPreview((current) => ({ ...current, discountPercent: event.target.value }))}
                className="min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
              <span>ชื่อโปรโมชั่น</span>
              <input
                name="title"
                required
                value={preview.title}
                onChange={(event) => setPreview((current) => ({ ...current, title: event.target.value }))}
                placeholder="โปรโมชั่นส่วนลดประจำเดือน"
                className="min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
              <span>วันเริ่มต้น</span>
              <input
                name="startDate"
                type="date"
                value={preview.startDate}
                onChange={(event) => setPreview((current) => ({ ...current, startDate: event.target.value }))}
                className="min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
              <span>วันสิ้นสุด</span>
              <input
                name="endDate"
                type="date"
                value={preview.endDate}
                onChange={(event) => setPreview((current) => ({ ...current, endDate: event.target.value }))}
                className="min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212] md:col-span-2">
              <span>รูปภาพโปรโมชั่น</span>
              <input
                name="promotionImage"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 py-3 text-sm text-[#171212] file:mr-4 file:rounded-full file:border-0 file:bg-[#171212] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
              />
              <span className="text-xs font-normal leading-5 text-[#7a736b]">
                ถ้าไม่เลือกรูปใหม่ ระบบจะใช้รูปเดิมของโปรโมชั่นหรือรูปสินค้าที่เลือกไว้
              </span>
            </label>

            <input type="hidden" name="description" value="" readOnly />
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
              <span>สถานะโปรโมชั่น</span>
              <select
                name="isActive"
                defaultValue={promotion?.isActive === false ? "false" : "true"}
                className="min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
              >
                <option value="true">เปิดใช้งาน</option>
                <option value="false">ปิดใช้งาน</option>
              </select>
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#ece4d6] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
          <div className="min-h-[24px] text-sm font-medium">
            {state.message ? (
              <p className={state.status === "success" ? "text-[#207443]" : "text-[#a61b1f]"}>{state.message}</p>
            ) : (
              <p className="text-[#7a736b]">เมื่อบันทึกแล้ว สินค้าที่เลือกจะไปแสดงพร้อมราคาลดบนหน้าโปรโมชั่น</p>
            )}
          </div>
          <SubmitButton mode={mode} />
        </div>
      </form>

      <aside className="2xl:sticky 2xl:top-6 2xl:self-start">
        <section className="rounded-[24px] border border-[#ece4d6] bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b6a2b]">ตัวอย่าง</p>
              <h2 className="mt-2 text-2xl font-extrabold text-[#171212]">การ์ดสินค้าพร้อมส่วนลด</h2>
            </div>
            <span className="rounded-full border border-[#eadfce] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b6a2b]">
              พรีวิว
            </span>
          </div>

          <article className="mt-5 overflow-hidden rounded-[28px] border border-[#eadfce] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
            <div className="relative h-[260px] bg-[linear-gradient(135deg,#faf7f1_0%,#f2f5fb_100%)]">
              <img src={preview.imageUrl} alt={preview.title} className="h-full w-full object-contain p-6" />
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b6a2b]">ส่วนลด</p>
                <h3 className="mt-2 text-xl font-extrabold text-[#171212]">{preview.linkedProductLabel}</h3>
              </div>

              <div className="rounded-[20px] border border-[#ece4d6] bg-[#fffaf3] px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b6a2b]">ตัวอย่างราคาหลังลด</p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <p className="text-2xl font-extrabold text-[#d02022]">
                    {discountedPrice != null ? formatCurrency(discountedPrice, preview.currency) : "฿0"}
                  </p>
                  {preview.originalPrice != null ? (
                    <p className="text-sm font-semibold text-[#9b9187] line-through">
                      {formatCurrency(preview.originalPrice, preview.currency)}
                    </p>
                  ) : null}
                  {preview.discountPercent ? (
                    <span className="rounded-full bg-[#fdeceb] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#b3171f]">
                      -{preview.discountPercent}%
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#ece4d6] px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b6a2b]">ช่วงเวลาโปรโมชั่น</p>
                <p className="mt-2 text-sm font-semibold text-[#171212]">{formatPromotionPeriod(preview.startDate, preview.endDate)}</p>
              </div>
            </div>
          </article>
        </section>
      </aside>
    </div>
  );
}
