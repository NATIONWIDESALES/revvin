import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { MAX_UPLOAD_BYTES, uploadUserImage, deleteUserImage } from "@/lib/imageUpload";

interface BusinessLogoUploadProps {
  currentLogoUrl?: string | null;
  businessId: string;
  onUploaded: (url: string) => void;
}

const BusinessLogoUpload = ({ currentLogoUrl, businessId, onUploaded }: BusinessLogoUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl ?? null);
  const [dragOver, setDragOver] = useState(false);
  const [storagePath, setStoragePath] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File too large", description: "Max 15 MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const result = await uploadUserImage("business-logos", "logo", file);

    if ("error" in result) {
      toast({ title: "Couldn't upload that", description: result.error });
      setUploading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("businesses")
      .update({ logo_url: result.publicUrl })
      .eq("id", businessId);

    if (updateError) {
      console.error("[BusinessLogoUpload] saving logo_url failed", updateError);
      toast({ title: "Couldn't save that", description: "Your logo uploaded but didn't save. You can try again later from your dashboard." });
    } else {
      setPreview(result.publicUrl);
      setStoragePath(result.path);
      onUploaded(result.publicUrl);
      toast({ title: "Logo uploaded!", description: "Your logo will appear on marketplace listings." });
    }
    setUploading(false);
  };

  const removeLogo = async () => {
    setUploading(true);
    if (storagePath) await deleteUserImage("business-logos", storagePath);
    const { error } = await supabase.from("businesses").update({ logo_url: null }).eq("id", businessId);
    setUploading(false);
    if (error) {
      console.error("[BusinessLogoUpload] clearing logo_url failed", error);
      toast({ title: "Couldn't remove that", description: "Please try again in a moment." });
      return;
    }
    setPreview(null);
    setStoragePath(null);
    onUploaded("");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="flex items-center gap-4">
          <img src={preview} alt="Business logo" className="h-16 w-16 rounded-xl object-cover border border-border shadow-sm" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Replace
            </Button>
            <Button variant="ghost" size="sm" onClick={removeLogo} disabled={uploading}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <div>
            {uploading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            ) : (
              <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            )}
            <p className="text-sm font-medium text-muted-foreground">
              {uploading ? "Uploading..." : "Drop your logo here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP, HEIC, GIF or SVG, up to 15 MB</p>
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
};

export default BusinessLogoUpload;
