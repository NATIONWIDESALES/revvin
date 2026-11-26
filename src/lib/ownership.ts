import { supabase } from "@/integrations/supabase/client";

export type OwnershipStatus = "pending" | "verified" | "rejected" | "disputed";
export interface OwnershipState {
  business_id: string;
  business_name: string;
  status: OwnershipStatus;
  method: "domain_email" | "document" | "admin" | "grandfathered" | null;
  verified_at: string | null;
  website: string | null;
  domain: string | null;
  has_listing: boolean;
  request_status: "open" | "approved" | "rejected" | null;
  reject_reason: string | null;
  request_created_at: string | null;
}

export async function loadOwnershipState(): Promise<OwnershipState> {
  const { data, error } = await supabase.rpc("fn_ownership_status");
  if (error) throw error;
  return data as unknown as OwnershipState;
}

export async function sendOwnershipCode(email: string) {
  const { error } = await supabase.rpc("fn_ownership_send_code", { p_email: email.trim() });
  if (error) throw error;
}

export async function verifyOwnershipCode(code: string) {
  const { data, error } = await supabase.rpc("fn_ownership_verify_code", { p_code: code.trim() });
  if (error) throw error;
  if (data !== true) throw new Error("invalid_code");
}

export async function submitOwnershipDocument(businessId: string, file: File, note: string) {
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error("invalid_document");
  }
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : "png";
  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("ownership-verification").upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;
  const { error } = await supabase.rpc("fn_ownership_submit_document", { p_file_path: path, p_note: note.trim() || null });
  if (error) {
    await supabase.storage.from("ownership-verification").remove([path]);
    throw error;
  }
}

export async function fileOwnershipDispute(input: { slug: string; name: string; role: string; email: string; phone: string; details: string; proof: File | null }) {
  const form = new FormData();
  for (const key of ["slug", "name", "role", "email", "phone", "details"] as const) form.set(key, input[key]);
  form.set("visitor", "");
  if (input.proof) form.set("proof", input.proof);
  const { data, error } = await supabase.functions.invoke("ownership-dispute", { body: form });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
