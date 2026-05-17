"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { createProductAction } from "@/app/admin/actions";
import type { ProductFormState } from "@/app/admin/actions";
import {
  getProductMenuSubcategoryOptions,
  getProductMenuNestedSubcategoryOptions,
  productMenuCategoryOptions,
  resolveProductMenuCategoryName,
  resolveProductMenuNestedSubcategoryName,
  resolveProductMenuSubcategoryName
} from "@/lib/catalog-menu";
import type { EditableProduct, ProductFormOptions } from "@/lib/products";

type ProductFormAction = (
  state: ProductFormState,
  formData: FormData
) => Promise<ProductFormState>;

type PreviewState = {
  name: string;
  slug: string;
  subtitle: string;
  brandName: string;
  mainCategoryName: string;
  categoryName: string;
  subcategoryName: string;
  productTypeName: string;
  promotionType: string;
  recommendedCategory: string;
  countryName: string;
  regionName: string;
  sku: string;
  price: string;
  stockQty: string;
  bottleSizeMl: string;
  alcoholPercent: string;
  shortDescription: string;
  fullDescription: string;
  imageUrls: string[];
  selectedFileNames: string[];
  inStock: boolean;
  isFeatured: boolean;
};

const initialProductFormState: ProductFormState = {
  status: "idle",
  message: ""
};

function toUppercaseInput(value: string) {
  return value.toUpperCase();
}

function buildInitialPreview(product?: EditableProduct): PreviewState {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    subtitle: product?.subtitle ?? "",
    brandName: product?.brandName ?? "",
    mainCategoryName: product?.mainCategoryName ?? product?.categoryName ?? "",
    categoryName: product?.mainCategoryName ?? product?.categoryName ?? "",
    subcategoryName: product?.subcategoryName ?? "",
    productTypeName: product?.productTypeName ?? "",
    promotionType: product?.promotionType ?? "",
    recommendedCategory: product?.recommendedCategory ?? "",
    countryName: product?.countryName ?? "",
    regionName: product?.regionName ?? "",
    sku: product?.sku ?? "",
    price: product?.price ?? "",
    stockQty: product?.stockQty ?? "",
    bottleSizeMl: product?.bottleSizeMl ?? "",
    alcoholPercent: product?.alcoholPercent ?? "",
    shortDescription: product?.shortDescription ?? "",
    fullDescription: product?.fullDescription ?? "",
    imageUrls: product?.imageUrls ?? [],
    selectedFileNames: [],
    inStock: product?.inStock ?? true,
    isFeatured: product?.isFeatured ?? false
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
      {pending ? "กำลังบันทึก..." : mode === "edit" ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
    </button>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  uppercase = false,
  helperText,
  defaultValue,
  onPreviewChange
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  uppercase?: boolean;
  helperText?: string;
  defaultValue?: string;
  onPreviewChange?: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={(event) => onPreviewChange?.(uppercase ? toUppercaseInput(event.target.value) : event.target.value)}
        className={`min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212] ${
          uppercase ? "uppercase tracking-[0.08em]" : ""
        }`}
      />
      {helperText ? <span className="text-xs font-normal leading-5 text-[#7a736b]">{helperText}</span> : null}
    </label>
  );
}

function TextareaField({
  label,
  name,
  placeholder,
  rows,
  defaultValue,
  onPreviewChange
}: {
  label: string;
  name: string;
  placeholder: string;
  rows: number;
  defaultValue?: string;
  onPreviewChange?: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
      <span>{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={(event) => onPreviewChange?.(event.target.value)}
        className="w-full min-w-0 rounded-[24px] border border-[#ddd3c5] bg-white px-4 py-4 text-sm leading-7 text-[#171212] outline-none transition focus:border-[#171212]"
      />
    </label>
  );
}

function TextFieldWithSuggestions({
  label,
  name,
  options,
  placeholder,
  required = false,
  helperText,
  uppercase = false,
  defaultValue,
  onPreviewChange
}: {
  label: string;
  name: string;
  options: { id: string; name: string }[];
  placeholder: string;
  required?: boolean;
  helperText?: string;
  uppercase?: boolean;
  defaultValue?: string;
  onPreviewChange?: (value: string) => void;
}) {
  const listId = `${name}-options`;

  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
      <span>{label}</span>
      <input
        name={name}
        list={listId}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={(event) => onPreviewChange?.(uppercase ? toUppercaseInput(event.target.value) : event.target.value)}
        className={`min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212] ${
          uppercase ? "uppercase tracking-[0.08em]" : ""
        }`}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.id} value={option.name} />
        ))}
      </datalist>
      {helperText ? <span className="text-xs font-normal leading-5 text-[#7a736b]">{helperText}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  value,
  placeholder,
  required = false,
  helperText,
  onValueChange
}: {
  label: string;
  name: string;
  options: { id: string; name: string }[];
  value: string;
  placeholder: string;
  required?: boolean;
  helperText?: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
      <span>{label}</span>
      <select
        name={name}
        required={required}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.name}>
            {option.name}
          </option>
        ))}
      </select>
      {helperText ? <span className="text-xs font-normal leading-5 text-[#7a736b]">{helperText}</span> : null}
    </label>
  );
}

function buildOptionId(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9฀-๿-]/g, "") || "custom-option"
  );
}

function appendCurrentOption(options: { id: string; name: string }[], currentValue: string) {
  if (!currentValue.trim() || options.some((option) => option.name === currentValue.trim())) {
    return options;
  }

  return [{ id: `current-${buildOptionId(currentValue)}`, name: currentValue.trim() }, ...options];
}

export function ProductForm({
  options,
  mode = "create",
  product,
  action
}: {
  options: ProductFormOptions;
  mode?: "create" | "edit";
  product?: EditableProduct;
  action?: ProductFormAction;
}) {
  const formActionToUse = action ?? createProductAction;
  const initialPreview = useMemo(() => buildInitialPreview(product), [product]);
  const [state, formAction] = useFormState(formActionToUse, initialProductFormState);
  const [preview, setPreview] = useState<PreviewState>(initialPreview);
  const [uploadGroups, setUploadGroups] = useState([0]);
  const selectedMainCategory = resolveProductMenuCategoryName(preview.mainCategoryName || preview.categoryName);
  const selectedSubcategory = resolveProductMenuSubcategoryName(selectedMainCategory, preview.subcategoryName);
  const selectedNestedSubcategory = resolveProductMenuNestedSubcategoryName(
    selectedMainCategory,
    selectedSubcategory,
    preview.productTypeName
  );
  const mainCategoryOptions = useMemo(
    () => appendCurrentOption([...productMenuCategoryOptions], selectedMainCategory),
    [selectedMainCategory]
  );
  const rawSubcategoryOptions = useMemo(() => getProductMenuSubcategoryOptions(selectedMainCategory), [selectedMainCategory]);
  const subcategoryOptions = useMemo(
    () => appendCurrentOption(rawSubcategoryOptions, selectedSubcategory),
    [rawSubcategoryOptions, selectedSubcategory]
  );
  const rawNestedSubcategoryOptions = useMemo(
    () => getProductMenuNestedSubcategoryOptions(selectedMainCategory, selectedSubcategory),
    [selectedMainCategory, selectedSubcategory]
  );
  const nestedSubcategoryOptions = useMemo(
    () =>
      rawNestedSubcategoryOptions.length
        ? appendCurrentOption(rawNestedSubcategoryOptions, selectedNestedSubcategory || preview.productTypeName)
        : [],
    [preview.productTypeName, rawNestedSubcategoryOptions, selectedNestedSubcategory]
  );
  const hasSubcategoryMenu = rawSubcategoryOptions.length > 0;
  const hasNestedSubcategoryMenu = rawNestedSubcategoryOptions.length > 0;

  const updatePreview =
    (key: keyof PreviewState) =>
    (value: string | boolean) => {
      setPreview((current) => ({
        ...current,
        [key]: value
      }));
    };

  const updateFilesPreview = (input: HTMLInputElement) => {
    const form = input.form;

    if (!form) {
      return;
    }

    const fileInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="mainImageFiles"]'));
    const allFiles = fileInputs.flatMap((fileInput) => Array.from(fileInput.files ?? []));
    const objectUrls = allFiles.map((file) => URL.createObjectURL(file));

    setPreview((current) => ({
      ...current,
      selectedFileNames: allFiles.map((file) => file.name),
      imageUrls: objectUrls.length ? objectUrls : current.imageUrls
    }));
  };

  const imagePreview = preview.imageUrls[0] || "/images/hero/hero-main.jpg";

  const metaLine = [
    preview.bottleSizeMl ? `${preview.bottleSizeMl} ML` : null,
    preview.alcoholPercent ? `${preview.alcoholPercent}% ALC.` : null,
    preview.countryName || null
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)] 2xl:items-start">
      <form action={formAction} className="grid gap-6">
        {product ? <input type="hidden" name="productId" value={product.id} /> : null}

        <section className="grid gap-5 rounded-[28px] border border-[#ece4d6] bg-[linear-gradient(135deg,#fffdf8_0%,#ffffff_58%,#f9fbff_100%)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">การจัดวางสินค้า</p>
            <h3 className="mt-2 text-xl font-extrabold text-[#171212]">
              {mode === "edit" ? "อัปเดตแบรนด์และหมวดสินค้า" : "ตั้งค่าแบรนด์และหมวดสินค้า"}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[#5f5852]">
              เลือกหมวดจากเมนูจริงของเว็บไซต์ เพื่อให้สินค้าไปแสดงในหน้าหมวดและหมวดย่อยได้ถูกต้อง
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <TextFieldWithSuggestions
              label="แบรนด์"
              name="brandName"
              options={options.brands}
              placeholder="WOODFORD RESERVE"
              uppercase
              defaultValue={initialPreview.brandName}
              onPreviewChange={updatePreview("brandName")}
              helperText="พิมพ์ชื่อแบรนด์ใหม่ได้ ระบบจะสร้างให้โดยอัตโนมัติ"
            />
            <SelectField
              label="หมวดหลัก"
              name="categoryName"
              options={mainCategoryOptions}
              placeholder="เลือกหมวดหลัก"
              required
              value={selectedMainCategory}
              onValueChange={(value) => {
                const nextCategory = resolveProductMenuCategoryName(value);
                updatePreview("mainCategoryName")(nextCategory);
                updatePreview("categoryName")(nextCategory);
                updatePreview("subcategoryName")("");
                updatePreview("productTypeName")("");
              }}
              helperText="ใช้หมวดเดียวกับเมนูสินค้าในเว็บไซต์"
            />
            {hasSubcategoryMenu ? (
              <SelectField
                label="หมวดย่อยตามเมนู"
                name="subcategoryName"
                options={subcategoryOptions}
                placeholder="ไม่เลือกหมวดย่อย"
                value={selectedSubcategory}
                onValueChange={(value) => {
                  const nextSubcategory = resolveProductMenuSubcategoryName(selectedMainCategory, value);
                  updatePreview("subcategoryName")(nextSubcategory);
                  updatePreview("categoryName")(nextSubcategory || selectedMainCategory);
                  updatePreview("productTypeName")("");
                }}
                helperText="ถ้าเลือกหมวดย่อย สินค้าจะไปแสดงในหน้าหมวดย่อยนั้นอัตโนมัติ"
              />
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#ddd3c5] bg-[#fffaf2] p-4 text-sm leading-7 text-[#5f5852]">
                <p className="font-semibold text-[#171212]">หมวดนี้ไม่มีเมนูย่อย</p>
                <p className="mt-1">ระบบจะใช้หมวดหลักนี้โดยตรงในการจัดแสดงสินค้า</p>
                <input type="hidden" name="subcategoryName" value="" />
              </div>
            )}
            {hasNestedSubcategoryMenu ? (
              <SelectField
                label="หมวดย่อยชั้นถัดไป"
                name="productTypeName"
                options={nestedSubcategoryOptions}
                placeholder="เลือกหมวดย่อยชั้นถัดไป"
                value={selectedNestedSubcategory}
                onValueChange={(value) => {
                  const nextNestedSubcategory = resolveProductMenuNestedSubcategoryName(selectedMainCategory, selectedSubcategory, value);
                  updatePreview("productTypeName")(nextNestedSubcategory);
                }}
                helperText="จะแสดงเฉพาะเมื่อหมวดย่อยที่เลือกมีชั้นถัดไปในเมนูเว็บไซต์"
              />
            ) : (
              <input type="hidden" name="productTypeName" value={preview.productTypeName} readOnly />
            )}
            <label className="grid min-w-0 gap-3 text-base font-bold text-[#171212]">
              <span className="text-[15px] sm:text-base">หมวดสินค้าแนะนำ (ไม่บังคับ)</span>
              <select
                name="recommendedCategory"
                defaultValue={initialPreview.recommendedCategory}
                onChange={(event) => updatePreview("recommendedCategory")(event.target.value)}
                className="min-h-[56px] w-full min-w-0 rounded-2xl border-2 border-[#171212] bg-white px-5 text-base font-semibold text-[#171212] outline-none transition focus:border-[#8b6a2b]"
              >
                <option value="">ไม่เลือกหมวดสินค้าแนะนำ</option>
                {options.recommendedCategories.map((option) => (
                  <option key={option.id} value={option.slug ?? option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <span className="text-sm font-normal leading-6 text-[#7a736b]">
                ถ้าเลือก สินค้าจะถูกนำไปแสดงในเมนูสินค้าแนะนำของเว็บไซต์
              </span>
            </label>
            <TextFieldWithSuggestions
              label="ประเทศ"
              name="countryName"
              options={options.countries}
              placeholder="SCOTLAND"
              uppercase
              defaultValue={initialPreview.countryName}
              onPreviewChange={updatePreview("countryName")}
              helperText="พิมพ์ชื่อประเทศ เช่น SCOTLAND หรือ JAPAN"
            />
            <TextFieldWithSuggestions
              label="ภูมิภาค"
              name="regionName"
              options={options.regions}
              placeholder="SPEYSIDE"
              uppercase
              defaultValue={initialPreview.regionName}
              onPreviewChange={updatePreview("regionName")}
              helperText="ใส่เมื่อสินค้ามีการระบุภูมิภาค เช่น SPEYSIDE หรือ HIGHLAND"
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
                <span>สถานะสต็อก</span>
                <select
                  name="inStock"
                  defaultValue={initialPreview.inStock ? "true" : "false"}
                  onChange={(event) => updatePreview("inStock")(event.target.value === "true")}
                  className="min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
                >
                  <option value="true">พร้อมขาย</option>
                  <option value="false">สินค้าหมด</option>
                </select>
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
                <span>สินค้าเด่น</span>
                <select
                  name="isFeatured"
                  defaultValue={initialPreview.isFeatured ? "true" : "false"}
                  onChange={(event) => updatePreview("isFeatured")(event.target.value === "true")}
                  className="min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
                >
                  <option value="false">ไม่แสดง</option>
                  <option value="true">แสดง</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="grid gap-5 rounded-[28px] border border-[#ece4d6] bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">ข้อมูลสินค้า</p>
            <h3 className="mt-2 text-xl font-extrabold text-[#171212]">ชื่อสินค้า ราคา และสต็อก</h3>
            <p className="mt-2 text-sm leading-7 text-[#5f5852]">
              กรอกข้อมูลหลักที่ใช้แสดงบนหน้าสินค้า ราคาเป็นช่องบังคับและจะอัปเดตพรีวิวด้านขวาทันที
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Field
              label="ชื่อสินค้า"
              name="name"
              placeholder="WOODFORD RESERVE DOUBLE OAKED"
              required
              uppercase
              defaultValue={initialPreview.name}
              onPreviewChange={updatePreview("name")}
              helperText="ชื่อสินค้าจะถูกแสดงบนการ์ดสินค้าและหน้ารายละเอียดสินค้า"
            />
            <Field
              label="Slug (ไม่บังคับ)"
              name="slug"
              placeholder="woodford-reserve-double-oaked"
              defaultValue={initialPreview.slug}
              onPreviewChange={updatePreview("slug")}
              helperText="ปล่อยว่างได้ ระบบจะสร้าง slug จากชื่อสินค้าให้อัตโนมัติ"
            />
            <Field
              label="ราคา"
              name="price"
              type="number"
              placeholder="1990"
              required
              defaultValue={initialPreview.price}
              onPreviewChange={updatePreview("price")}
              helperText="ใส่เฉพาะตัวเลข เช่น 1990"
            />
            <Field
              label="จำนวนสต็อก"
              name="stockQty"
              type="number"
              placeholder="12"
              defaultValue={initialPreview.stockQty}
              onPreviewChange={updatePreview("stockQty")}
              helperText="ถ้าไม่กรอก ระบบจะบันทึกเป็น 0"
            />
            <Field
              label="SKU (ไม่บังคับ)"
              name="sku"
              placeholder="WR-DO-750"
              uppercase
              defaultValue={initialPreview.sku}
              onPreviewChange={updatePreview("sku")}
              helperText="ใช้รหัสสินค้าภายในร้าน หรือปล่อยว่างได้"
            />
            <Field
              label="คำอธิบายสั้นบนการ์ด"
              name="subtitle"
              placeholder="BOURBON WHISKEY 750 ML"
              uppercase
              defaultValue={initialPreview.subtitle}
              onPreviewChange={updatePreview("subtitle")}
              helperText="ข้อความสั้นใต้ชื่อสินค้าในพรีวิวและการ์ดสินค้า"
            />
            <Field
              label="ขนาดขวด (ML)"
              name="bottleSizeMl"
              type="number"
              placeholder="750"
              defaultValue={initialPreview.bottleSizeMl}
              onPreviewChange={updatePreview("bottleSizeMl")}
              helperText="ใช้แสดงในบรรทัดข้อมูลสินค้า เช่น 750 ML"
            />
            <Field
              label="แอลกอฮอล์ (%)"
              name="alcoholPercent"
              type="number"
              placeholder="43.2"
              defaultValue={initialPreview.alcoholPercent}
              onPreviewChange={updatePreview("alcoholPercent")}
              helperText="ใส่ตัวเลขเปอร์เซ็นต์ เช่น 43.2"
            />
          </div>
        </section>

        <section className="grid gap-5 rounded-[28px] border border-[#ece4d6] bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">ข้อมูลเพิ่มเติม</p>
            <h3 className="mt-2 text-xl font-extrabold text-[#171212]">รูปภาพและรายละเอียดสินค้า</h3>
          </div>

          <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#171212]">
            <span>อัปโหลดรูปสินค้า</span>
            <div className="grid gap-3">
              {uploadGroups.map((groupKey, index) => (
                <div key={groupKey} className="rounded-[22px] border border-[#e5dacb] bg-[#fffdf9] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8b6a2b]">ชุดอัปโหลด {index + 1}</p>
                    {uploadGroups.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadGroups((current) => current.filter((item) => item !== groupKey));
                          window.setTimeout(() => {
                            const form = document.querySelector("form");

                            if (!form) {
                              return;
                            }

                            const fileInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="mainImageFiles"]'));
                            const allFiles = fileInputs.flatMap((fileInput) => Array.from(fileInput.files ?? []));
                            const objectUrls = allFiles.map((file) => URL.createObjectURL(file));

                            setPreview((current) => ({
                              ...current,
                              selectedFileNames: allFiles.map((file) => file.name),
                              imageUrls: objectUrls.length ? objectUrls : current.imageUrls
                            }));
                          }, 0);
                        }}
                        className="text-xs font-bold uppercase tracking-[0.12em] text-[#a61b1f]"
                      >
                        ลบชุดนี้
                      </button>
                    ) : null}
                  </div>

                  <input
                    name="mainImageFiles"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => updateFilesPreview(event.currentTarget)}
                    className="mt-3 min-h-[46px] w-full min-w-0 rounded-2xl border border-[#ddd3c5] bg-white px-4 py-3 text-sm text-[#171212] outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-[#171212] file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-[0.12em] file:text-white focus:border-[#171212]"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={() => setUploadGroups((current) => [...current, Date.now() + current.length])}
                className="inline-flex w-fit rounded-full border border-[#171212] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#171212] transition hover:bg-[#171212] hover:text-white"
              >
                เพิ่มช่องอัปโหลด
              </button>
            </div>
            <span className="text-xs font-normal leading-5 text-[#7a736b]">
              ระบบจะใช้รูปแรกเป็นรูปหลัก และแสดงรูปทั้งหมดในแกลเลอรีสินค้าของหน้าเว็บไซต์
            </span>
          </label>

          <TextareaField
            label="คำอธิบายสั้น"
            name="shortDescription"
            rows={4}
            defaultValue={initialPreview.shortDescription}
            placeholder="ข้อความสั้นสำหรับการ์ดสินค้าและบล็อกสรุป"
            onPreviewChange={updatePreview("shortDescription")}
          />

          <TextareaField
            label="คำอธิบายเต็ม"
            name="fullDescription"
            rows={8}
            defaultValue={initialPreview.fullDescription}
            placeholder="รายละเอียดแบบเต็มสำหรับหน้าสินค้า"
            onPreviewChange={updatePreview("fullDescription")}
          />
        </section>
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#e8decf] bg-white/95 px-5 py-4 shadow-[0_14px_34px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="max-w-2xl text-sm text-[#5f5852]">
            {state.message ? (
              <p className={state.status === "success" ? "font-semibold text-[#207443]" : "font-semibold text-[#b3171f]"}>{state.message}</p>
            ) : (
              <p>
                {mode === "edit"
                  ? "ตรวจสอบข้อมูลให้ครบก่อนบันทึก ระบบจะอัปเดตรายละเอียดสินค้าและรูปภาพตามที่คุณแก้ไข"
                  : "ตรวจสอบข้อมูลให้ครบก่อนบันทึก ระบบจะสร้างสินค้าใหม่และใช้รูปที่อัปโหลดเป็นรูปแสดงผล"}
              </p>
            )}
          </div>
          <SubmitButton mode={mode} />
        </div>
      </form>

      <aside className="2xl:sticky 2xl:top-6">
        <div className="rounded-[28px] border border-[#ece4d6] bg-[linear-gradient(135deg,#fbf7f0_0%,#ffffff_58%,#f5f8ff_100%)] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.05)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">ตัวอย่างการแสดงผล</p>
              <h3 className="mt-2 text-xl font-extrabold text-[#171212]">พรีวิวสินค้าก่อนบันทึก</h3>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8b6a2b] shadow-sm">
                อัปเดตตามฟอร์ม
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[28px] border border-[#e6dccd] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
            <div className="relative h-[280px] bg-[linear-gradient(135deg,#faf7f1_0%,#f2f5fb_100%)]">
              <img src={imagePreview} alt={preview.name || "ตัวอย่างสินค้า"} className="h-full w-full object-contain p-6" />
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8b6a2b] backdrop-blur">
                {preview.brandName || "PATTAYABEV"}
              </div>
              {preview.selectedFileNames.length ? (
                <div className="absolute bottom-4 left-4 rounded-full bg-black/75 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                  อัปโหลดแล้ว {preview.selectedFileNames.length} ไฟล์
                </div>
              ) : null}
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <div>
                <h4 className="text-[26px] font-extrabold leading-tight text-[#171212]">{preview.name || "ชื่อสินค้า"}</h4>
                <p className="mt-2 text-sm uppercase tracking-[0.12em] text-[#8a8278]">{preview.subtitle || "คำอธิบายสั้นของสินค้า"}</p>
              </div>

              <div className="grid gap-3 rounded-[24px] border border-[#ece4d6] bg-[#faf7f1] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-3xl font-extrabold text-[#b3171f]">
                      {preview.price ? `฿${Number(preview.price).toLocaleString("th-TH")}` : "฿0"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#8a8278]">
                      {metaLine || "750 ML / 43.2% ALC. / SCOTLAND"}
                    </p>
                  </div>
                  <div
                    className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
                      preview.inStock ? "bg-[#edf7ef] text-[#207443]" : "bg-[#fbe9e9] text-[#a61b1f]"
                    }`}
                  >
                    {preview.inStock ? "พร้อมขาย" : "สินค้าหมด"}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#ece4d6] bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">หมวดแสดงผล</p>
                    <p className="mt-2 text-sm font-semibold text-[#171212]">{selectedSubcategory || selectedMainCategory || "ยังไม่เลือก"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#ece4d6] bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">หมวดย่อย</p>
                    <p className="mt-2 text-sm font-semibold text-[#171212]">{preview.productTypeName || selectedSubcategory || "ใช้หมวดหลัก"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#ece4d6] bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">ภูมิภาค</p>
                    <p className="mt-2 text-sm font-semibold text-[#171212]">{preview.regionName || "SPEYSIDE"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#ece4d6] bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">SKU</p>
                    <p className="mt-2 text-sm font-semibold text-[#171212]">{preview.sku || "เพิ่ม SKU หรือปล่อยว่างให้ระบบสร้าง"}</p>
                  </div>
                </div>
              </div>

              {preview.imageUrls.length > 1 ? (
                <div className="grid grid-cols-4 gap-3">
                  {preview.imageUrls.slice(0, 4).map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-2xl border border-[#ece4d6] bg-[#faf7f1]">
                      <img src={imageUrl} alt={`รูปตัวอย่าง ${index + 1}`} className="h-20 w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="rounded-[22px] border border-[#ece4d6] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">คำอธิบายสั้น</p>
                  <p className="mt-2 text-sm leading-7 text-[#5f5852]">
                    {preview.shortDescription || "ข้อความสรุปสั้นจะถูกแสดงบนการ์ดสินค้าและบล็อกแนะนำต่าง ๆ"}
                  </p>
                </div>

                <div className="rounded-[22px] border border-[#ece4d6] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8b6a2b]">คำอธิบายเต็ม</p>
                  <p className="mt-2 line-clamp-6 whitespace-pre-line text-sm leading-7 text-[#5f5852]">
                    {preview.fullDescription || "รายละเอียดเต็มจะใช้ในหน้าสินค้า เพื่ออธิบายจุดเด่น รสชาติ และข้อมูลสำคัญเพิ่มเติม"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
</aside>
    </div>
  );
}
