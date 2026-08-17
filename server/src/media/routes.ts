import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { type Readable } from "node:stream";

import formidable, {
  type FormidableFields,
  type FormidableFile,
  type FormidableFiles,
} from "formidable";
import { Router, type NextFunction, type Request, type Response } from "express";

import { requireSession, sendUnauthenticated } from "../auth/middleware.js";
import type { TransactionalDatabase } from "../auth/sessions.js";
import { AppError } from "../errors.js";
import { requireScrapbookRole } from "../scrapbooks/permissions.js";
import type { MediaStorage } from "../storage/storage.js";
import {
  bulkMoveMedia,
  claimMediaForDeletion,
  completeMediaDeletion,
  completeMediaUploadCleanupJob,
  createMedia,
  createMediaUploadCleanupJob,
  findFileAccess,
  findFileAccessByMediaId,
  listMedia,
  reorderMedia,
  updateMedia,
} from "./repository.js";
import { albumExistsInScrapbook } from "../albums/repository.js";
import {
  DEFAULT_MAX_MEDIA_BYTES,
  validateUploadedFile,
  type UploadedFile,
} from "./validation.js";

export type MediaRouteConfig = {
  maxMediaBytes?: number;
};

function bodyRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "Request body must be an object", "INVALID_INPUT");
  }
  return body as Record<string, unknown>;
}

function routeParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== "string" || !value) {
    throw new AppError(400, `${name} is required`, "INVALID_INPUT");
  }
  return value;
}

function optionalText(value: unknown, fieldName: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new AppError(400, `${fieldName} must be a string`, "INVALID_INPUT");
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new AppError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer`,
      "INVALID_INPUT",
    );
  }
  return trimmed || null;
}

function optionalAlbumId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, "albumId must be a valid album ID or null", "INVALID_INPUT");
  }
  return value.trim();
}

function mediaIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(
      400,
      "mediaIds must contain one or more unique media IDs",
      "INVALID_INPUT",
    );
  }
  const ids = value.map((id) => (typeof id === "string" ? id.trim() : ""));
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new AppError(
      400,
      "mediaIds must contain one or more unique media IDs",
      "INVALID_INPUT",
    );
  }
  return ids;
}

function orderedMediaIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new AppError(
      400,
      "orderedIds must contain unique media IDs",
      "INVALID_ORDER",
    );
  }
  const ids = value.map((id) => (typeof id === "string" ? id.trim() : ""));
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new AppError(
      400,
      "orderedIds must contain unique media IDs",
      "INVALID_ORDER",
    );
  }
  return ids;
}

function oneField(fields: FormidableFields, name: string): string | undefined {
  const value = fields[name];
  if (value === undefined) {
    return undefined;
  }
  if (value.length !== 1) {
    throw new AppError(400, `${name} must be provided once`, "INVALID_INPUT");
  }
  return value[0];
}

function oneFile(files: FormidableFiles, name: string): FormidableFile {
  const value = files[name];
  const file = Array.isArray(value) ? value[0] : value;
  if (!file) {
    throw new AppError(400, "A file is required", "FILE_REQUIRED");
  }
  if (Array.isArray(value) && value.length !== 1) {
    throw new AppError(400, "Only one file may be uploaded", "INVALID_INPUT");
  }
  return file;
}

function allFilePaths(files: FormidableFiles): string[] {
  return Object.values(files).flatMap((value) => {
    const entries = Array.isArray(value) ? value : value ? [value] : [];
    return entries.map((file) => file.filepath);
  });
}

async function removeTemporaryFiles(files: FormidableFiles | undefined): Promise<void> {
  if (!files) {
    return;
  }
  await Promise.all(
    [...new Set(allFilePaths(files))].map((filePath) =>
      fs.rm(filePath, { force: true }).catch(() => undefined),
    ),
  );
}

async function parseUpload(
  request: Request,
  maxFileSize: number,
): Promise<{ fields: FormidableFields; files: FormidableFiles }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      allowEmptyFiles: false,
      keepExtensions: true,
      maxFileSize,
      maxFiles: 1,
      multiples: false,
    });

    form.parse(request, (error, fields, files) => {
      if (error) {
        void removeTemporaryFiles(files).finally(() => {
          if (error.code === 1016 || error.code === 1009) {
            reject(
              new AppError(
                413,
                `The uploaded file exceeds the ${maxFileSize}-byte limit`,
                "UPLOAD_TOO_LARGE",
              ),
            );
            return;
          }
          reject(new AppError(400, "The multipart upload is invalid", "INVALID_UPLOAD"));
        });
        return;
      }
      resolve({ fields, files });
    });
  });
}

function toUploadedFile(file: FormidableFile): UploadedFile {
  return {
    filepath: file.filepath,
    originalFilename: file.originalFilename,
    mimetype: file.mimetype,
    size: file.size,
  };
}

function storageKey(originalName: string): string {
  const extension = originalName.match(/\.[a-z0-9]{1,10}$/i)?.[0].toLowerCase() ?? "";
  return `media-${randomUUID()}${extension}`;
}

function notFound(resource: string): AppError {
  return new AppError(404, `${resource} was not found`, "NOT_FOUND");
}

function retryableStorageError(): AppError {
  return new AppError(
    503,
    "Stored media could not be removed; retry the operation",
    "STORAGE_CLEANUP_FAILED",
  );
}

function retryableUploadCleanupError(): AppError {
  return new AppError(
    503,
    "Uploaded media could not be cleaned up; retry the operation",
    "UPLOAD_CLEANUP_FAILED",
  );
}

async function cleanupFailedUpload(
  db: TransactionalDatabase,
  storage: MediaStorage,
  scrapbookId: string,
  storageKey: string,
): Promise<void> {
  let cleanupJobPersisted = false;
  try {
    await createMediaUploadCleanupJob(db, scrapbookId, storageKey);
    cleanupJobPersisted = true;
  } catch {
    // Attempt direct cleanup even if the first job write fails. If both fail,
    // the retryable response gives an operator or worker a recoverable signal.
  }

  try {
    await storage.delete(storageKey);
  } catch {
    if (!cleanupJobPersisted) {
      await createMediaUploadCleanupJob(db, scrapbookId, storageKey).catch(() => undefined);
    }
    throw retryableUploadCleanupError();
  }

  if (cleanupJobPersisted) {
    try {
      await completeMediaUploadCleanupJob(db, storageKey);
    } catch {
      throw retryableUploadCleanupError();
    }
  }
}

async function deleteStoredMedia(
  db: TransactionalDatabase,
  storage: MediaStorage,
  scrapbookId: string,
  ids: string[],
): Promise<void> {
  const targets = await claimMediaForDeletion(db, scrapbookId, ids);

  try {
    for (const target of targets) {
      await storage.delete(target.storageKey);
    }
  } catch {
    throw retryableStorageError();
  }

  try {
    await completeMediaDeletion(
      db,
      scrapbookId,
      targets.map((target) => target.id),
    );
  } catch {
    throw retryableStorageError();
  }
}

function fileNameForHeader(name: string): string {
  return name.replace(/[\r\n"\\]/g, "_") || "download";
}

export function createMediaRouter({
  db,
  storage,
  config = {},
}: {
  db: TransactionalDatabase;
  storage: MediaStorage;
  config?: MediaRouteConfig;
}): Router {
  const router = Router();
  router.use(requireSession(db));

  router.get(
    "/:scrapbookId",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const albumId = request.query.albumId;
        if (albumId !== undefined && typeof albumId !== "string") {
          throw new AppError(400, "albumId must be a string", "INVALID_INPUT");
        }
        response.json({
          media: await listMedia(db, routeParam(request, "scrapbookId"), albumId ?? null),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:scrapbookId",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      let files: FormidableFiles | undefined;
      try {
        const scrapbookId = routeParam(request, "scrapbookId");
        const maxFileSize = config.maxMediaBytes ?? DEFAULT_MAX_MEDIA_BYTES;
        const parsed = await parseUpload(request, maxFileSize);
        files = parsed.files;
        const upload = await validateUploadedFile(
          toUploadedFile(oneFile(parsed.files, "file")),
          "media",
          { maxBytes: maxFileSize },
        );
        const mediaType = upload.mediaType;
        if (!mediaType) {
          throw new AppError(415, "This file type is not supported", "UNSUPPORTED_MEDIA_TYPE");
        }
        const albumId = optionalAlbumId(oneField(parsed.fields, "albumId"));
        const caption = optionalText(oneField(parsed.fields, "caption"), "caption", 2_000);
        const location = optionalText(oneField(parsed.fields, "location"), "location", 500);
        if (albumId && !(await albumExistsInScrapbook(db, scrapbookId, albumId))) {
          throw new AppError(404, "Album was not found", "ALBUM_NOT_FOUND");
        }
        const stored = await storage.put({
          key: storageKey(upload.originalName),
          source: createReadStream(upload.filepath),
          byteSize: upload.byteSize,
        });

        try {
          const media = await createMedia(db, {
            scrapbookId,
            albumId,
            storageKey: stored.key,
            originalName: upload.originalName,
            mediaType,
            mimeType: upload.mimeType,
            byteSize: stored.byteSize,
            caption,
            location,
            createdBy: request.auth!.userId,
          });
          response.status(201).json({ media });
        } catch (error) {
          await cleanupFailedUpload(db, storage, scrapbookId, stored.key);
          throw error;
        }
      } catch (error) {
        next(error);
      } finally {
        if (files) {
          await removeTemporaryFiles(files);
        }
      }
    },
  );

  router.patch(
    "/:scrapbookId/:mediaId",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const input = bodyRecord(request.body);
        const updates: { caption?: string | null; location?: string | null } = {};
        if (Object.prototype.hasOwnProperty.call(input, "caption")) {
          updates.caption = optionalText(input.caption, "caption", 2_000);
        }
        if (Object.prototype.hasOwnProperty.call(input, "location")) {
          updates.location = optionalText(input.location, "location", 500);
        }
        if (Object.keys(updates).length === 0) {
          throw new AppError(400, "No media changes were provided", "INVALID_INPUT");
        }
        const media = await updateMedia(
          db,
          routeParam(request, "scrapbookId"),
          routeParam(request, "mediaId"),
          updates,
        );
        if (!media) {
          next(notFound("Media item"));
          return;
        }
        response.json({ media });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:scrapbookId/reorder",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const input = bodyRecord(request.body);
        await reorderMedia(
          db,
          routeParam(request, "scrapbookId"),
          optionalAlbumId(input.albumId),
          orderedMediaIds(input.orderedIds),
        );
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:scrapbookId/bulk-move",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const input = bodyRecord(request.body);
        await bulkMoveMedia(
          db,
          routeParam(request, "scrapbookId"),
          mediaIds(input.mediaIds),
          optionalAlbumId(input.albumId),
        );
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:scrapbookId/:mediaId",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        await deleteStoredMedia(
          db,
          storage,
          routeParam(request, "scrapbookId"),
          [routeParam(request, "mediaId")],
        );
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:scrapbookId/bulk-delete",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const input = bodyRecord(request.body);
        await deleteStoredMedia(
          db,
          storage,
          routeParam(request, "scrapbookId"),
          mediaIds(input.mediaIds),
        );
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

export function createFileRouter({
  db,
  storage,
}: {
  db: TransactionalDatabase;
  storage: MediaStorage;
}): Router {
  const router = Router();

  async function serveFile(
    request: Request,
    response: Response,
    next: NextFunction,
    lookup: () => ReturnType<typeof findFileAccess>,
  ): Promise<void> {
    try {
      const shareToken = request.query.shareToken;
      if (shareToken !== undefined && typeof shareToken !== "string") {
        throw new AppError(400, "shareToken must be a string", "INVALID_INPUT");
      }
      if (!request.auth && !shareToken) {
        sendUnauthenticated(response);
        return;
      }

      const access = await lookup();
      if (!access) {
        next(notFound("File"));
        return;
      }

      let stream: Readable;
      try {
        stream = await storage.get(access.storageKey);
      } catch {
        next(notFound("File"));
        return;
      }

      response.setHeader("Content-Type", access.mimeType);
      response.setHeader("Content-Length", String(access.byteSize));
      response.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(fileNameForHeader(access.originalName))}`,
      );
      stream.once("error", next);
      stream.pipe(response);
    } catch (error) {
      next(error);
    }
  }

  router.get("/by-media/:mediaId", (request, response, next) =>
    serveFile(request, response, next, () =>
      findFileAccessByMediaId(db, routeParam(request, "mediaId"), {
        userId: request.auth?.userId,
        shareToken: typeof request.query.shareToken === "string"
          ? request.query.shareToken
          : undefined,
      }),
    ),
  );

  router.get("/:storageKey", (request, response, next) =>
    serveFile(request, response, next, () =>
      findFileAccess(db, routeParam(request, "storageKey"), {
        userId: request.auth?.userId,
        shareToken: typeof request.query.shareToken === "string"
          ? request.query.shareToken
          : undefined,
      }),
    ),
  );

  return router;
}
