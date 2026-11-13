import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export interface StorageUploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
  bucket?: string;
  path?: string;
}

/**
 * Exact canonical Supabase Storage bucket name used for PDF uploads in Hanoon Academy.
 */
export const PRIMARY_STORAGE_BUCKET = "course-materials";
export const FALLBACK_STORAGE_BUCKETS = ["pdf-notes"];

/**
 * Maximum allowed PDF size: 50MB (50 * 1024 * 1024 bytes)
 */
export const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Uploads a PDF document to Supabase Storage with strict try/catch error handling,
 * immediate failure reporting, and detailed RLS / permission diagnostics.
 *
 * If supabase.storage.from(...).upload() fails, this immediately stops and returns
 * the exact actionable error message.
 */
export async function uploadPdfToSupabaseStorage(
  file: File,
  folder = "notes"
): Promise<StorageUploadResult> {
  // 1. Check Supabase client initialization
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error:
        "Supabase client is not configured. Please verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.",
    };
  }

  // 2. Validate file presence
  if (!file) {
    return {
      success: false,
      error: "No PDF file was provided for upload.",
    };
  }

  // 3. Validate file size (max 50MB)
  if (file.size > MAX_PDF_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      success: false,
      error: `File size limit exceeded: Selected PDF is ${sizeInMb}MB, which exceeds the maximum limit of 50MB.`,
    };
  }

  // 4. Sanitize file name for S3 / Supabase storage object safety
  const originalName = file.name || "document.pdf";
  const fileExt = originalName.split(".").pop()?.toLowerCase() || "pdf";
  const baseName = originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 60);
  const uniqueFileName = `${Date.now()}_${baseName}.${fileExt}`;
  const filePath = `${folder}/${uniqueFileName}`;

  const bucketsToTry = [PRIMARY_STORAGE_BUCKET, ...FALLBACK_STORAGE_BUCKETS];

  for (let i = 0; i < bucketsToTry.length; i++) {
    const currentBucket = bucketsToTry[i];
    const isLastBucket = i === bucketsToTry.length - 1;

    try {
      // 5. Execute Supabase Storage Upload
      const { data, error } = await supabase.storage
        .from(currentBucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "application/pdf",
        });

      // Successful upload: retrieve public URL
      if (!error && data?.path) {
        const { data: urlData } = supabase.storage
          .from(currentBucket)
          .getPublicUrl(data.path);

        if (urlData?.publicUrl) {
          return {
            success: true,
            publicUrl: urlData.publicUrl,
            bucket: currentBucket,
            path: data.path,
          };
        }
      }

      // Handle upload error returned by Supabase Storage
      if (error) {
        const errorMsg = error.message || String(error);
        const statusCode = (error as any).statusCode || (error as any).status;
        const errorCode = (error as any).code || (error as any).error || "";

        const isNotFound =
          statusCode === "404" ||
          statusCode === 404 ||
          errorCode === "NoSuchBucket" ||
          errorMsg.toLowerCase().includes("bucket not found") ||
          errorMsg.toLowerCase().includes("not found");

        // If bucket is not found and we have a fallback bucket to check, try fallback
        if (isNotFound && !isLastBucket) {
          continue;
        }

        if (isNotFound) {
          return {
            success: false,
            bucket: currentBucket,
            error: `Storage Bucket Not Found: Bucket '${currentBucket}' does not exist in your Supabase project. Please run the provided bucket creation SQL script in your Supabase SQL Editor.`,
          };
        }

        const isRlsOrForbidden =
          statusCode === "403" ||
          statusCode === 403 ||
          errorCode === "AccessDenied" ||
          errorMsg.toLowerCase().includes("row-level security") ||
          errorMsg.toLowerCase().includes("policy") ||
          errorMsg.toLowerCase().includes("permission denied") ||
          errorMsg.toLowerCase().includes("unauthorized");

        if (isRlsOrForbidden) {
          return {
            success: false,
            bucket: currentBucket,
            error: `Storage RLS Permission Denied: Upload rejected by Row-Level Security on bucket '${currentBucket}'. Details: ${errorMsg}. Please run the RLS policies SQL in your Supabase SQL Editor to allow authenticated staff to upload.`,
          };
        }

        const isPayloadTooLarge =
          statusCode === "413" ||
          statusCode === 413 ||
          errorMsg.toLowerCase().includes("payload too large") ||
          errorMsg.toLowerCase().includes("entity too large");

        if (isPayloadTooLarge) {
          return {
            success: false,
            bucket: currentBucket,
            error: `Storage Upload Error: File exceeds the maximum payload size configured on bucket '${currentBucket}'.`,
          };
        }

        // Return exact Supabase error message immediately
        return {
          success: false,
          bucket: currentBucket,
          error: `Supabase Storage Upload Error on bucket '${currentBucket}': ${errorMsg}`,
        };
      }
    } catch (err: any) {
      console.error(`Exception during storage upload to bucket '${currentBucket}':`, err);
      // If network or unexpected exception, return immediately
      return {
        success: false,
        bucket: currentBucket,
        error: `Storage Upload Failed: ${err?.message || "Network error while connecting to Supabase Storage. Please check your internet connection."}`,
      };
    }
  }

  return {
    success: false,
    error: `Storage Upload Failed: Unable to upload PDF to bucket '${PRIMARY_STORAGE_BUCKET}'. Please verify the bucket exists and RLS policies are applied.`,
  };
}
