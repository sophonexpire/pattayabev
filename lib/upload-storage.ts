import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ValidationError } from "@/lib/security";
import {
  IMAGE_UPLOAD_POLICY,
  assertUploadMatchesPolicy,
  getSafeUploadExtension
} from "@/lib/upload-security";

type PublicUploadFolder = "products" | "articles" | "promotions";

type SavePublicImageUploadOptions = {
  file: File;
  folder: PublicUploadFolder;
  baseName: string;
  fallbackBaseName: string;
  prefix?: string;
};

function slugifyFileBase(value: string, fallback: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

function isReadOnlyRuntime() {
  return Boolean(process.env.VERCEL || process.cwd().startsWith("/var/task"));
}

function getSupabaseStorageConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_PUBLIC_BUCKET || "uploads";

  if (!url || !serviceKey) {
    return null;
  }

  return {
    url: url.replace(/\/+$/, ""),
    serviceKey,
    bucket
  };
}

async function uploadToSupabaseStorage(file: File, objectPath: string) {
  const config = getSupabaseStorageConfig();

  if (!config) {
    return null;
  }

  const response = await fetch(
    `${config.url}/storage/v1/object/${config.bucket}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false"
      },
      body: Buffer.from(await file.arrayBuffer())
    }
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new ValidationError(
      details || "ไม่สามารถอัปโหลดรูปไปยัง Supabase Storage ได้"
    );
  }

  return `${config.url}/storage/v1/object/public/${config.bucket}/${objectPath}`;
}

export async function savePublicImageUpload({
  file,
  folder,
  baseName,
  fallbackBaseName,
  prefix
}: SavePublicImageUploadOptions) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  assertUploadMatchesPolicy(file, IMAGE_UPLOAD_POLICY);

  const extension = getSafeUploadExtension(file, ".png", IMAGE_UPLOAD_POLICY.allowedExtensions);
  const safeBase = slugifyFileBase(baseName, fallbackBaseName);
  const fileName = `${safeBase}${prefix ? `-${prefix}` : ""}-${randomUUID()}${extension.toLowerCase()}`;
  const objectPath = `${folder}/${fileName}`;
  const supabaseUrl = await uploadToSupabaseStorage(file, objectPath);

  if (supabaseUrl) {
    return supabaseUrl;
  }

  if (isReadOnlyRuntime()) {
    throw new ValidationError(
      "ระบบออนไลน์ไม่สามารถบันทึกรูปลงโฟลเดอร์ public ได้ กรุณาตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY สำหรับ Supabase Storage"
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "images", "uploads", folder);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));

  return `/images/uploads/${folder}/${fileName}`;
}
