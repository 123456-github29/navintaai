import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      userId: "user-1", // Will be set by backend
      brandName: "",
      primaryColor: "#3B82F6",
      secondaryColor: "#10B981",
      accentColor: "#F59E0B",
      logoUrl: "",
      fonts: {},
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertBrandKit) =>
      apiRequest("POST", "/api/brand-kit", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-kit"] });
      toast({
        title: "Brand kit saved!",
        description: "Your brand settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save brand kit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertBrandKit) => {
    updateMutation.mutate(data);
  };

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
      <div className="p-6 space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Palette className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Brand Kit</h1>
            <p className="text-muted-foreground">
              Manage your brand identity and visual assets
            </p>
          </div>
        </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Brand Identity</CardTitle>
            <CardDescription>
              Basic information about your brand
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                {...form.register("brandName")}
                placeholder="Your brand name"
                className="h-12"
                data-testid="input-brand-name"
              />
              {form.formState.errors.brandName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.brandName.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="logo">Logo</Label>
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <div className="relative">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      data-testid="input-logo"
                    />
                    <label htmlFor="logo">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById("logo")?.click()}
                        data-testid="button-upload-logo"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG or SVG (max 5MB)
                  </p>
                </div>
                {(logoPreview || form.watch("logoUrl")) && (
                  <div className="w-32 h-32 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                    <img
                      src={logoPreview || form.watch("logoUrl")}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand Colors</CardTitle>
            <CardDescription>
              Colors used in your video graphics and branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    {...form.register("primaryColor")}
                    className="h-12 w-20 rounded-lg cursor-pointer border"
                    data-testid="input-primary-color"
                  />
                  <Input
                    value={form.watch("primaryColor")}
                    onChange={(e) => form.setValue("primaryColor", e.target.value)}
                    className="flex-1 h-12 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    id="secondaryColor"
                    {...form.register("secondaryColor")}
                    className="h-12 w-20 rounded-lg cursor-pointer border"
                    data-testid="input-secondary-color"
                  />
                  <Input
                    value={form.watch("secondaryColor")}
                    onChange={(e) => form.setValue("secondaryColor", e.target.value)}
                    className="flex-1 h-12 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    id="accentColor"
                    {...form.register("accentColor")}
                    className="h-12 w-20 rounded-lg cursor-pointer border"
                    data-testid="input-accent-color"
                  />
                  <Input
                    value={form.watch("accentColor")}
                    onChange={(e) => form.setValue("accentColor", e.target.value)}
                    className="flex-1 h-12 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg border bg-card space-y-3">
              <h4 className="text-sm font-medium">Color Preview</h4>
              <div className="flex gap-3">
                <div
                  className="flex-1 h-24 rounded-lg"
                  style={{ backgroundColor: form.watch("primaryColor") }}
                />
                <div
                  className="flex-1 h-24 rounded-lg"
                  style={{ backgroundColor: form.watch("secondaryColor") }}
                />
                <div
                  className="flex-1 h-24 rounded-lg"
                  style={{ backgroundColor: form.watch("accentColor") }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={updateMutation.isPending}
            data-testid="button-save"
          >
            <Save className="h-5 w-5 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Brand Kit"}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
