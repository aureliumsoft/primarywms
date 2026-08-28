import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "primarywms";

function supabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function supabaseKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseKey());
}

function supabase(): SupabaseClient {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_STORAGE_BUCKET in apps/web/.env.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let bucketReady: boolean | null = null;

function isMissingBucket(message: string) {
  return /bucket not found|not found|does not exist/i.test(message);
}

function isStoragePolicyError(message: string) {
  return /row-level security|violates|not allowed|unauthorized|permission/i.test(message);
}

async function ensureBucket(): Promise<boolean> {
  if (bucketReady != null) return bucketReady;
  try {
    const client = supabase();
    const { data } = await client.storage.getBucket(BUCKET);
    if (data) {
      bucketReady = true;
      return true;
    }
    const { data: buckets } = await client.storage.listBuckets();
    if (buckets?.some((b) => b.id === BUCKET || b.name === BUCKET)) {
      bucketReady = true;
      return true;
    }
    const { error } = await client.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 30 * 1024 * 1024,
    });
    if (!error || /already exists|duplicate/i.test(error.message)) {
      bucketReady = true;
      return true;
    }
    console.warn(
      `Supabase bucket "${BUCKET}" is missing and the anon key cannot create it (${error.message}). Photos will be stored on disk until you create a public bucket named "${BUCKET}" in Supabase Storage (or run docs/supabase-storage.sql).`,
    );
  } catch (error) {
    console.warn("Supabase bucket check skipped:", error);
  }
  bucketReady = false;
  return false;
}

async function uploadLocal(storageKey: string, body: Buffer): Promise<StoredFile> {
  const dir = path.join(process.cwd(), "storage", path.dirname(storageKey));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "storage", storageKey), body);
  return { storageKey, publicUrl: null };
}

export type StoredFile = {
  storageKey: string;
  publicUrl: string | null;
};

export async function uploadMedia(input: {
  folder: "photos" | "files";
  filename: string;
  body: Buffer;
  contentType: string;
}): Promise<StoredFile> {
  const storageKey = `${input.folder}/${input.filename}`;

  if (isSupabaseConfigured() && (await ensureBucket())) {
    const client = supabase();
    const { error } = await client.storage.from(BUCKET).upload(storageKey, input.body, {
      contentType: input.contentType,
      upsert: false,
    });
    if (!error) {
      const { data } = client.storage.from(BUCKET).getPublicUrl(storageKey);
      return { storageKey, publicUrl: data.publicUrl };
    }
    if (!isMissingBucket(error.message) && !isStoragePolicyError(error.message)) {
      throw new Error(error.message);
    }
    console.warn(`Supabase upload failed (${error.message}); storing ${storageKey} on disk.`);
    bucketReady = false;
  }

  return uploadLocal(storageKey, input.body);
}

export async function downloadMedia(storageKey: string): Promise<Buffer | null> {
  if (isSupabaseConfigured() && bucketReady !== false) {
    const { data, error } = await supabase().storage.from(BUCKET).download(storageKey);
    if (!error && data) return Buffer.from(await data.arrayBuffer());
  }
  try {
    return await readFile(path.join(process.cwd(), "storage", storageKey));
  } catch {
    return null;
  }
}

export function fileKind(mimeType: string, filename: string) {
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic)$/i.test(filename)) return "image";
  if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) return "pdf";
  if (
    /word|excel|spreadsheet|officedocument/i.test(mimeType) ||
    /\.(doc|docx|xls|xlsx)$/i.test(filename)
  ) {
    return "document";
  }
  return "other";
}

export function mediaSrc(file: { id: string; publicUrl?: string | null }) {
  return file.publicUrl || `/api/v1/photos/${file.id}`;
}
