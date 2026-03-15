import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Save, Palette } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertBrandKitSchema, type InsertBrandKit, type BrandKit } from "@shared/schema";
import { useState } from "react";

export default function BrandKitPage() {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string>("");

  const { data: brandKit, isLoading } = useQuery<BrandKit>({
    queryKey: ["/api/brand-kit"],
  });

  const form = useForm<InsertBrandKit>({
    resolver: zodResolver(insertBrandKitSchema),
    values: brandKit || {
      userId: "user-1",
      brandName: "",
      primaryColor: "#3B82F6",
      secondaryColor: "#10B981",
      accentColor: "#F59E0B",
      logoUrl: "",
      fonts: {},
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertBrandKit) => apiRequest("POST", "/api/brand-kit", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-kit"] });
      toast({ title: "Brand kit saved!", description: "Your brand settings have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save brand kit.", variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertBrandKit) => updateMutation.mutate(data);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        form.setValue("logoUrl", result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 min-h-screen" style={{ background: "#050505" }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48 bg-white/5 rounded-xl" />
          <Skeleton className="h-64 bg-white/[0.03] rounded-2xl" />
          <Skeleton className="h-64 bg-white/[0.03] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 min-h-screen" style={{ background: "#050505" }}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Brand Kit</h1>
          <p className="text-sm text-white/30 mt-1">Manage your brand identity and visual assets</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Brand Identity */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6 md:p-8">
            <h2 className="text-lg font-semibold text-white mb-1">Brand Identity</h2>
            <p className="text-sm text-white/25 mb-6">Basic information about your brand</p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs text-white/40 font-medium">Brand Name</label>
                <Input
                  {...form.register("brandName")}
                  placeholder="Your brand name"
                  className="h-12 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 rounded-xl focus:ring-indigo-500/30 focus:border-indigo-500/50"
                  data-testid="input-brand-name"
                />
                {form.formState.errors.brandName && (
                  <p className="text-sm text-red-400">{form.formState.errors.brandName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs text-white/40 font-medium">Logo</label>
                <div className="flex items-start gap-6">
                  <div className="flex-1">
                    <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" data-testid="input-logo" />
                    <Button type="button" variant="outline" className="w-full border-white/10 text-white/50 bg-transparent hover:bg-white/5 rounded-xl" onClick={() => document.getElementById("logo")?.click()} data-testid="button-upload-logo">
                      <Upload className="h-4 w-4 mr-2" /> Upload Logo
                    </Button>
                    <p className="text-xs text-white/20 mt-2">PNG, JPG or SVG (max 5MB)</p>
                  </div>
                  {(logoPreview || form.watch("logoUrl")) && (
                    <div className="w-24 h-24 rounded-xl border border-white/[0.06] bg-white/[0.03] flex items-center justify-center overflow-hidden">
                      <img src={logoPreview || form.watch("logoUrl")} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Brand Colors */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6 md:p-8">
            <h2 className="text-lg font-semibold text-white mb-1">Brand Colors</h2>
            <p className="text-sm text-white/25 mb-6">Colors used in your video graphics</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {[
                { id: "primaryColor", label: "Primary" },
                { id: "secondaryColor", label: "Secondary" },
                { id: "accentColor", label: "Accent" },
              ].map((color) => (
                <div key={color.id} className="space-y-2">
                  <label className="text-xs text-white/40 font-medium">{color.label}</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      {...form.register(color.id as keyof InsertBrandKit)}
                      className="h-12 w-16 rounded-xl cursor-pointer border border-white/[0.06] bg-transparent"
                      data-testid={`input-${color.id.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                    />
                    <Input
                      value={form.watch(color.id as keyof InsertBrandKit) as string}
                      onChange={(e) => form.setValue(color.id as keyof InsertBrandKit, e.target.value)}
                      className="flex-1 h-12 font-mono bg-white/[0.03] border-white/[0.06] text-white rounded-xl"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <h4 className="text-xs text-white/40 font-medium mb-3">Color Preview</h4>
              <div className="flex gap-3">
                {["primaryColor", "secondaryColor", "accentColor"].map((key) => (
                  <div key={key} className="flex-1 h-20 rounded-xl" style={{ backgroundColor: form.watch(key as keyof InsertBrandKit) as string }} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending} className="bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] rounded-full px-8" data-testid="button-save">
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Brand Kit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
