import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";

import { AppError } from "../errors.js";

export type UploadKind = "media" | "sticker";

export type UploadedFile = {
  filepath: string;
  originalFilename?: string | null;
  mimetype?: string | null;
  size: number;
};

export type ValidatedUpload = {
  filepath: string;
  originalName: string;
  mimeType: string;
  mediaType: "photo" | "video" | null;
  byteSize: number;
  contentHash: string;
};

export type UploadValidationOptions = {
  maxBytes?: number;
};

const MEDIA_MIME_TYPES = new Set([
  "image/gif",
  "image/jpg",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/ogg",
  "video/quicktime",
  "video/webm",
]);

const STICKER_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const DEFAULT_MAX_MEDIA_BYTES = 250 * 1024 * 1024;
export const DEFAULT_MAX_STICKER_BYTES = 10 * 1024 * 1024;

async function readHeader(filePath: string): Promise<Buffer> {
  const handle = await fs.open(filePath, "r");
  try {
    const header = Buffer.alloc(16);
    const result = await handle.read(header, 0, header.length, 0);
    return header.subarray(0, result.bytesRead);
  } finally {
    await handle.close();
  }
}

function startsWithBytes(buffer: Buffer, bytes: number[]): boolean {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function hasValidSignature(mimeType: string, header: Buffer): boolean {
  switch (mimeType) {
    case "image/gif":
      return header.subarray(0, 6).toString("ascii") === "GIF87a" ||
        header.subarray(0, 6).toString("ascii") === "GIF89a";
    case "image/jpg":
    case "image/jpeg":
      return startsWithBytes(header, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWithBytes(header, [
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ]);
    case "image/webp":
      return header.subarray(0, 4).toString("ascii") === "RIFF" &&
        header.subarray(8, 12).toString("ascii") === "WEBP";
    case "video/mp4":
    case "video/quicktime":
      return header.subarray(4, 8).toString("ascii") === "ftyp";
    case "video/ogg":
      return header.subarray(0, 4).toString("ascii") === "OggS";
    case "video/webm":
      return startsWithBytes(header, [0x1a, 0x45, 0xdf, 0xa3]);
    default:
      return false;
  }
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

function supportedMimeTypes(kind: UploadKind): Set<string> {
  return kind === "media" ? MEDIA_MIME_TYPES : STICKER_MIME_TYPES;
}

function mimeTypeFromFilename(filename: string): string | undefined {
  const extension = filename.match(/\.([a-z0-9]{1,10})$/i)?.[1].toLowerCase();
  return extension
    ? {
        gif: "image/gif",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        mov: "video/quicktime",
        mp4: "video/mp4",
        ogg: "video/ogg",
        ogv: "video/ogg",
        webm: "video/webm",
      }[extension]
    : undefined;
}

function invalidMimeError(): AppError {
  return new AppError(
    415,
    "This file type is not supported",
    "UNSUPPORTED_MEDIA_TYPE",
  );
}

export async function validateUploadedFile(
  file: UploadedFile,
  kind: UploadKind,
  options: UploadValidationOptions = {},
): Promise<ValidatedUpload> {
  const suppliedMimeType = file.mimetype?.toLowerCase().trim();
  const originalName = file.originalFilename?.trim() || "uploaded-file";
  const mimeTypeCandidate = suppliedMimeType && suppliedMimeType !== "application/octet-stream"
    ? suppliedMimeType
    : mimeTypeFromFilename(originalName);
  if (!mimeTypeCandidate || !supportedMimeTypes(kind).has(mimeTypeCandidate)) {
    throw invalidMimeError();
  }

  const mimeType = mimeTypeCandidate === "image/jpg" ? "image/jpeg" : mimeTypeCandidate;

  const stats = await fs.stat(file.filepath);
  const byteSize = stats.size;
  const maxBytes = options.maxBytes ??
    (kind === "media" ? DEFAULT_MAX_MEDIA_BYTES : DEFAULT_MAX_STICKER_BYTES);
  if (byteSize > maxBytes) {
    throw new AppError(
      413,
      `The uploaded file exceeds the ${maxBytes}-byte limit`,
      "UPLOAD_TOO_LARGE",
    );
  }

  const header = await readHeader(file.filepath);
  if (!hasValidSignature(mimeType, header)) {
    throw new AppError(
      415,
      "The uploaded file signature does not match its MIME type",
      "INVALID_FILE_SIGNATURE",
    );
  }

  const mediaType = mimeType.startsWith("image/")
    ? "photo"
    : mimeType.startsWith("video/")
      ? "video"
      : null;

  return {
    filepath: file.filepath,
    originalName,
    mimeType,
    mediaType,
    byteSize,
    contentHash: await hashFile(file.filepath),
  };
}
