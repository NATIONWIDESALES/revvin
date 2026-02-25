import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";

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

  const handleFile = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("business-logos").getPublicUrl(path);
    const publicUrl = publicData.publicUrl;

    const { error: updateError } = await supabase
      .from("businesses")
      .update({ logo_url: publicUrl })
      .eq("id", businessId);

    if (updateError) {
      toast({ title: "Error saving", description: updateError.message, variant: "destructive" });
    } else {
      setPreview(publicUrl);
      onUploaded(publicUrl);
      toast({ title: "Logo uploaded!", description: "Your logo will appear on marketplace listings." });
    }
    setUploading(false);
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
            <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, or SVG — max 5 MB</p>
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
};

export default BusinessLogoUpload;
