import path from "node:path";

import { ValidationError } from "@/lib/security";

export type UploadPolicy = {
  label: string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
};

export const IMAGE_UPLOAD_POLICY: UploadPolicy = {
  label: "image",
  maxSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedExtensions: [".jpg", ".jpeg", ".jfif", ".png", ".webp"]
};

export const BUSINESS_DOCUMENT_UPLOAD_POLICY: UploadPolicy = {
  label: "business document",
  maxSizeBytes: 10 * 1024 * 1024,
  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"]
};

function formatMegabytes(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1);
}

function getPolicyLabel(policy: UploadPolicy) {
  if (policy.label === "image") {
    return "รูปภาพ";
  }

  if (policy.label === "business document") {
    return "เอกสารธุรกิจ";
  }

  return policy.label;
}

function getExtensionFromMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  if (mimeType === "application/pdf") {
    return ".pdf";
  }

  return "";
}

export function getSafeUploadExtension(file: File, fallbackExtension: string, allowedExtensions: string[]) {
  const extension = path.extname(file.name || "").toLowerCase();

  if (allowedExtensions.includes(extension)) {
    return extension;
  }

  const mimeExtension = getExtensionFromMimeType(file.type || "");

  if (allowedExtensions.includes(mimeExtension)) {
    return mimeExtension;
  }

  return fallbackExtension;
}

export function assertUploadMatchesPolicy(file: File, policy: UploadPolicy) {
  const label = getPolicyLabel(policy);

  if (!(file instanceof File) || file.size <= 0) {
    throw new ValidationError(`กรุณาอัปโหลดไฟล์${label}ที่ถูกต้อง`);
  }

  if (file.size > policy.maxSizeBytes) {
    throw new ValidationError(
      `ไฟล์${label}ต้องมีขนาดไม่เกิน ${formatMegabytes(policy.maxSizeBytes)} MB`
    );
  }

  const extension = path.extname(file.name || "").toLowerCase();
  const hasAllowedMimeType = Boolean(file.type && policy.allowedMimeTypes.includes(file.type));

  if (extension && !policy.allowedExtensions.includes(extension)) {
    throw new ValidationError(
      `ไฟล์${label}ต้องเป็นหนึ่งในรูปแบบเหล่านี้: ${policy.allowedExtensions.join(", ")}`
    );
  }

  if (!extension && !hasAllowedMimeType) {
    throw new ValidationError(`ไฟล์${label}ต้องมีนามสกุลไฟล์ที่ถูกต้อง`);
  }

  if (file.type && !hasAllowedMimeType) {
    throw new ValidationError(`ชนิดไฟล์${label}ไม่ตรงกับรูปแบบที่อนุญาต`);
  }
}

export function assertUploadCount(files: File[], maxFiles: number, label: string) {
  if (files.length > maxFiles) {
    throw new ValidationError(`อัปโหลด${label}ได้สูงสุด ${maxFiles} ไฟล์ต่อครั้ง`);
  }
}
