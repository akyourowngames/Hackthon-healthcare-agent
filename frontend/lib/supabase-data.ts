import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "User Data";

/**
 * Get an authenticated Supabase client that definitely has the user's token set.
 * This ensures RLS policies work correctly.
 */
async function getAuthClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  // Create a client with the access token explicitly set in global headers
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SupabaseReport = {
  id: number;
  local_report_id: number;
  user_id: string;
  patient_name: string;
  report_date: string;
  lab_name: string;
  report_status: string;
  biomarker_count: number;
  source_path: string;
  report_json: Record<string, unknown>;
  created_at: string;
};

export type SupabaseBiomarker = {
  id: number;
  local_id: number;
  user_id: string;
  local_report_id: number;
  biomarker_name: string;
  value: number | null;
  unit: string;
  flag: string;
  ref_range: string;
  report_date: string;
  lab_name: string;
  created_at: string;
};

export type SupabaseAnomaly = {
  id: number;
  local_id: number;
  user_id: string;
  biomarker: string;
  finding_type: string;
  severity: string;
  description: string;
  data_points: unknown[];
  metrics: Record<string, unknown>;
  detected_at: string;
};

export type SupabaseShareLink = {
  id: string;
  user_id: string;
  report_ids: number[];
  created_at: string;
  expires_at: string;
  view_count: number;
};

/**
 * Fetch all reports for the authenticated user directly from Supabase.
 */
export async function fetchUserReports(userId: string): Promise<SupabaseReport[]> {
  const client = await getAuthClient();
  if (!client) return [];
  const { data, error } = await client
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as SupabaseReport[];
}

/**
 * Fetch biomarker history for the authenticated user.
 */
export async function fetchUserBiomarkers(userId: string): Promise<SupabaseBiomarker[]> {
  const client = await getAuthClient();
  if (!client) return [];
  const { data, error } = await client
    .from("biomarker_history")
    .select("*")
    .eq("user_id", userId)
    .order("report_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as SupabaseBiomarker[];
}

/**
 * Fetch anomaly findings for the authenticated user.
 */
export async function fetchUserAnomalies(userId: string): Promise<SupabaseAnomaly[]> {
  const client = await getAuthClient();
  if (!client) return [];
  const { data, error } = await client
    .from("anomaly_findings")
    .select("*")
    .eq("user_id", userId)
    .order("detected_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as SupabaseAnomaly[];
}

/**
 * Fetch share links for the authenticated user.
 */
export async function fetchUserShareLinks(userId: string): Promise<SupabaseShareLink[]> {
  const client = await getAuthClient();
  if (!client) return [];
  const { data, error } = await client
    .from("share_links")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as SupabaseShareLink[];
}

/**
 * Get a public URL for a file in the User Data bucket.
 */
export function getReportFileUrl(userId: string, filename: string): string {
  if (!isSupabaseConfigured) return "";
  const safeUser = storageSafeSegment(userId);
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(`${safeUser}/${filename}`);
  return data?.publicUrl || "";
}

/**
 * List files in the user's storage folder.
 */
export async function listUserFiles(userId: string): Promise<Array<{ name: string; url: string; created_at: string }>> {
  if (!isSupabaseConfigured) return [];
  const safeUser = storageSafeSegment(userId);
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(safeUser, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  if (error || !data) return [];
  const files = [];
  for (const file of data) {
    const path = `${safeUser}/${file.name}`;
    const signed = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 10);
    files.push({
      name: file.name,
      url: signed.data?.signedUrl || getReportFileUrl(userId, file.name),
      created_at: file.created_at || "",
    });
  }
  return files;
}

/**
 * Delete a report from Supabase (both table entry and storage file).
 */
export async function deleteReport(reportId: number, userId: string, sourcePath: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data } = await supabase
    .from("reports")
    .select("id,local_report_id")
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle();
  const localReportId = Number(data?.local_report_id || reportId);
  await supabase.from("notification_outbox").delete().eq("local_report_id", localReportId).eq("user_id", userId);
  await supabase.from("biomarker_history").delete().eq("local_report_id", localReportId).eq("user_id", userId);
  await supabase.from("reports").delete().eq("id", reportId).eq("user_id", userId);
  if (sourcePath) {
    const filename = basenameFromPath(sourcePath);
    if (filename) {
      const safeUser = storageSafeSegment(userId);
      await supabase.storage.from(STORAGE_BUCKET).remove([`${safeUser}/${filename}`]);
    }
  }
}

function storageSafeSegment(value: string): string {
  const cleaned: string[] = [];
  for (const char of String(value || "").trim()) {
    if (char === "/" || char === "\\" || char === ":" || char === "*" || char === "?" || char === "\"" || char === "<" || char === ">" || char === "|") {
      cleaned.push("_");
    } else {
      cleaned.push(char);
    }
  }
  const segment = cleaned.join("").trim();
  return segment || "file";
}

function basenameFromPath(value: string): string {
  const parts: string[] = [];
  let current = "";
  for (const char of String(value || "")) {
    if (char === "/" || char === "\\") {
      if (current) parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);
  return parts[parts.length - 1] || "";
}
