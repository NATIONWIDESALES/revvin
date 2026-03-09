import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, UserCircle } from "lucide-react";

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
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${publicData.publicUrl}?t=${Date.now()}`;

    setPreview(publicUrl);
    onUploaded(publicUrl);
    toast({ title: "Avatar uploaded!" });
    setUploading(false);
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
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
        {preview ? "Change" : "Upload"}
      </Button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
};

export default AvatarUpload;
