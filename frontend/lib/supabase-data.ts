import { supabase, isSupabaseConfigured } from "./supabase";

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
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
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
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
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
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
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
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
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
  const safeUser = userId.replace(/[/\\]/g, "_");
  const { data } = supabase.storage
    .from("User Data")
    .getPublicUrl(`${safeUser}/${filename}`);
  return data?.publicUrl || "";
}

/**
 * List files in the user's storage folder.
 */
export async function listUserFiles(userId: string): Promise<Array<{ name: string; url: string; created_at: string }>> {
  if (!isSupabaseConfigured) return [];
  const safeUser = userId.replace(/[/\\]/g, "_");
  const { data, error } = await supabase.storage
    .from("User Data")
    .list(safeUser, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  if (error || !data) return [];
  return data.map((file) => ({
    name: file.name,
    url: getReportFileUrl(userId, file.name),
    created_at: file.created_at || "",
  }));
}

/**
 * Delete a report from Supabase (both table entry and storage file).
 */
export async function deleteReport(reportId: number, userId: string, sourcePath: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  // Delete from reports table
  await supabase.from("reports").delete().eq("id", reportId).eq("user_id", userId);
  // Delete associated biomarker history
  await supabase.from("biomarker_history").delete().eq("local_report_id", reportId).eq("user_id", userId);
  // Try to delete from storage if we have the path
  if (sourcePath) {
    const filename = sourcePath.split("/").pop() || sourcePath.split("\\").pop() || "";
    if (filename) {
      const safeUser = userId.replace(/[/\\]/g, "_");
      await supabase.storage.from("User Data").remove([`${safeUser}/${filename}`]);
    }
  }
}
