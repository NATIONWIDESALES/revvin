import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, UserCircle } from "lucide-react";
import { MAX_UPLOAD_BYTES, uploadUserImage } from "@/lib/imageUpload";

interface AvatarUploadProps {
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
}

const AvatarUpload = ({ currentUrl, onUploaded }: AvatarUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File too large", description: "Max 15 MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const result = await uploadUserImage("avatars", "avatar", file);
    setUploading(false);

    if ("error" in result) {
      toast({ title: "Couldn't upload that", description: result.error });
      return;
    }

    setPreview(result.publicUrl);
    onUploaded(result.publicUrl);
    toast({ title: "Avatar uploaded!" });
  };

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        <img src={preview} alt="Avatar" className="h-16 w-16 rounded-full object-cover border border-border shadow-sm" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted border border-border">
          <UserCircle className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <Button variant="outline" size="sm" className="h-11 sm:h-9" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
        {preview ? "Change" : "Upload"}
      </Button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
};

export default AvatarUpload;
