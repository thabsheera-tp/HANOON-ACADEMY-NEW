import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export interface StorageUploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
  bucket?: string;
  path?: string;
}

export const PRIMARY_STORAGE_BUCKET = "course-materials";
export const FALLBACK_STORAGE_BUCKETS = ["pdf-notes", "materials", "documents"];

/**
 * Uploads a PDF document to Supabase Storage with strict try/catch error handling,
 * detailed RLS / permission diagnostics, and automatic fallback across candidate buckets.
 */
export async function uploadPdfToSupabaseStorage(
  file: File,
  folder = "notes"
): Promise<StorageUploadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: "Supabase client is not configured. Please check your Supabase credentials in .env.local.",
    };
  }

  // 1. Sanitize file name: strip non-alphanumeric characters, retain extension, add timestamp
  const originalName = file.name || "document.pdf";
  const fileExt = originalName.split(".").pop()?.toLowerCase() || "pdf";
  const baseName = originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 60);
  const uniqueFileName = `${Date.now()}_${baseName}.${fileExt}`;
  const filePath = `${folder}/${uniqueFileName}`;

  const bucketsToTry = [PRIMARY_STORAGE_BUCKET, ...FALLBACK_STORAGE_BUCKETS];
  let lastErrorDetail = "";

  for (const bucket of bucketsToTry) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/pdf",
        });

      if (!error && data?.path) {
        // Retrieve public accessible URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        if (urlData?.publicUrl) {
          return {
            success: true,
            publicUrl: urlData.publicUrl,
            bucket,
            path: data.path,
          };
        }
      }

      if (error) {
        const errorMsg = error.message || "";
        const statusCode = (error as any).statusCode || (error as any).status;
        const errorCode = (error as any).code || "";

        const isNotFound =
          statusCode === "404" ||
          statusCode === 404 ||
          errorCode === "NoSuchBucket" ||
          errorMsg.toLowerCase().includes("bucket not found") ||
          errorMsg.toLowerCase().includes("not found");

        if (isNotFound) {
          lastErrorDetail = `Bucket '${bucket}' does not exist in Supabase Storage.`;
          continue; // Try next fallback bucket
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
            error: `Storage RLS Permission Denied on bucket '${bucket}'. Please ensure an INSERT/UPLOAD policy is enabled for this bucket in Supabase Storage. Details: ${errorMsg}`,
          };
        }

        // Other error (e.g., file size limit exceeded)
        return {
          success: false,
          error: `Storage upload error on bucket '${bucket}': ${errorMsg}`,
        };
      }
    } catch (err: any) {
      lastErrorDetail = `Upload exception on bucket '${bucket}': ${err?.message || String(err)}`;
    }
  }

  // If all bucket attempts failed (e.g. NoSuchBucket on all)
  return {
    success: false,
    error: `Supabase Storage Bucket Missing: ${lastErrorDetail} Please create a public bucket named '${PRIMARY_STORAGE_BUCKET}' in Supabase Dashboard -> Storage -> New Bucket (or run the provided migration SQL).`,
  };
}

