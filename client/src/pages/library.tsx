import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ArrowDownTrayIcon, 
  MagnifyingGlassIcon, 
  PlayIcon, 
  CalendarIcon, 
  TrashIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import type { Video, Clip } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Library() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isAuthenticated } = useAuth();

  const { data: videos, isLoading: videosLoading, error: videosError, refetch: refetchVideos } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  const { data: clips, isLoading: clipsLoading, error: clipsError, refetch: refetchClips } = useQuery<Clip[]>({
    queryKey: ["/api/clips"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (isAuthenticated) {
      console.log("[library] User authenticated, refetching data...");
      refetchVideos();
      refetchClips();
    }
  }, [isAuthenticated, refetchVideos, refetchClips]);

  useEffect(() => {
    console.log("[library] Clips state:", { 
      isLoading: clipsLoading, 
      error: clipsError?.message,
      count: clips?.length || 0,
      isAuthenticated,
      clips: clips?.map(c => ({ id: c.id, duration: c.duration, hasVideoData: !!c.videoData }))
    });
  }, [clips, clipsLoading, clipsError, isAuthenticated]);

  useEffect(() => {
    console.log("[library] Videos state:", { 
      isLoading: videosLoading, 
      error: videosError?.message,
      count: videos?.length || 0,
      isAuthenticated
    });
  }, [videos, videosLoading, videosError, isAuthenticated]);

  const filteredVideos = videos?.filter((v) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 lg:p-12 min-h-screen relative">
      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-[#111111]">Library</h1>
            <p className="text-base text-[#666666]">
              Your film vault of recorded clips and finished videos
            </p>
            <div className="w-32 h-1 bg-gray-200 rounded-full mt-4" />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#666666]" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 w-72 h-11 rounded-full bg-white border-gray-200 text-[#111111] placeholder:text-[#666666] focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 transition-all shadow-sm"
                data-testid="input-search"
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="videos" className="space-y-8">
        <TabsList className="inline-flex h-auto p-1 gap-1 bg-white border border-gray-100 rounded-full shadow-sm">
          <TabsTrigger 
            value="videos" 
            className="px-5 py-2.5 rounded-full text-sm font-medium text-[#666666] transition-all data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white data-[state=active]:shadow-md hover:text-[#111111]" 
            data-testid="tab-videos"
          >
            Finished Videos
          </TabsTrigger>
          <TabsTrigger 
            value="clips" 
            className="px-5 py-2.5 rounded-full text-sm font-medium text-[#666666] transition-all data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white data-[state=active]:shadow-md hover:text-[#111111]" 
            data-testid="tab-clips"
          >
            Recorded Clips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          {videosLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3xl border border-gray-100 bg-white shadow-sm aspect-[9/16] animate-pulse bg-gray-50" />
              ))}
            </div>
          ) : filteredVideos && filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="grid grid-cols-3 gap-4 mb-8 opacity-40">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-3xl border border-gray-100 bg-white shadow-sm aspect-[9/16] w-24" />
                ))}
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-xl font-semibold text-[#111111]">Your next video is waiting to be directed</h3>
                <p className="text-[#666666] max-w-sm">
                  {searchQuery ? "No videos match your search" : "Create your first video to see it in your vault"}
                </p>
                <Button className="bg-[#111111] text-white hover:bg-[#333333] rounded-full mt-4" onClick={() => window.location.href = "/dashboard"}>
                  Start Creating
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="clips" className="space-y-4">
          {clipsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-3xl border border-gray-100 bg-white shadow-sm aspect-[9/16] animate-pulse bg-gray-50" />
              ))}
            </div>
          ) : clips && clips.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {clips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="grid grid-cols-4 gap-3 mb-8 opacity-40">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-3xl border border-gray-100 bg-white shadow-sm aspect-[9/16] w-16" />
                ))}
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-xl font-semibold text-[#111111]">No clips recorded yet</h3>
                <p className="text-[#666666] max-w-sm">
                  Record your first shot to see clips here
                </p>
                <Button className="bg-[#111111] text-white hover:bg-[#333333] rounded-full mt-4" onClick={() => window.location.href = "/dashboard"}>
                  Start Recording
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: Video }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/videos/${video.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video deleted",
        description: "Your video has been removed from the library.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete video. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDownload = async () => {
    try {
      toast({
        title: "Preparing download...",
        description: "Fetching video file, please wait.",
      });
      
      // Get auth token for authenticated download
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Use signed URL if available, otherwise use authenticated API endpoint
      const signedUrl = (video as any).signedUrl;
      let response: Response;
      
      if (signedUrl) {
        response = await fetch(signedUrl);
      } else {
        response = await fetch(`/api/videos/${video.id}/download`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
      }
      
      if (!response.ok) throw new Error("Failed to fetch video");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${video.title}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Could not download the video. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Get video source for playback
  const videoSrc = (video as any).signedUrl || `/api/videos/${video.id}/download`;

  return (
    <>
      <div 
        className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden group cursor-pointer" 
        data-testid={`card-video-${video.id}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-[9/16] bg-gray-50 rounded-t-2xl overflow-hidden">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-105' : ''}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-[#E0E7FF]">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <PlayIcon className="h-8 w-8 text-[#111111]" />
              </div>
            </div>
          )}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-250 space-y-2 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Button 
              size="sm" 
              className="w-full bg-white/90 text-[#111111] hover:bg-white backdrop-blur-sm border-0" 
              onClick={() => setLocation(`/ai-editor/${video.id}`)}
              data-testid={`button-edit-captions-${video.id}`}
            >
              <PencilSquareIcon className="h-4 w-4 mr-2" />
              Edit with AI
            </Button>
            <Button 
              size="sm" 
              className="w-full bg-white/90 text-[#111111] hover:bg-white backdrop-blur-sm border-0" 
              onClick={() => setIsPlayerOpen(true)}
              data-testid={`button-preview-${video.id}`}
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              size="sm" 
              className="w-full bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90 backdrop-blur-sm border-0" 
              onClick={handleDownload}
              data-testid={`button-download-${video.id}`}
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Download
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full bg-white/90 backdrop-blur-sm border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  data-testid={`button-delete-video-${video.id}`}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete video?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{video.title}" from your library. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="p-4 space-y-3 bg-white">
          <h3 className="font-semibold text-[#111111] line-clamp-2 leading-tight">{video.title}</h3>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-[#111111] font-medium">
              {video.aspectRatio}
            </span>
            {video.hasCaption ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] text-emerald-600 font-medium">
                Captioned
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-[#666666] font-medium">
                No captions
              </span>
            )}
          </div>
          {video.exportedAt && (
            <span className="text-[#666666] text-xs block">
              {formatDistanceToNow(new Date(video.exportedAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{video.title}</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
            <video
              src={videoSrc}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
            {/* Watermark overlay for preview */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="absolute top-4 right-4 bg-black/60 text-white/80 text-xs px-3 py-1.5 rounded-full font-medium tracking-wide">
                PREVIEW
              </div>
              <div className="text-white/20 text-4xl font-bold tracking-widest rotate-[-30deg] select-none">
                NAVINTA
              </div>
            </div>
          </div>
          <p className="text-xs text-center text-[#888] mt-2">
            Download to get the full video without watermark
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ClipCard({ clip }: { clip: Clip }) {
  const { toast } = useToast();
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/clips/${clip.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
      toast({
        title: "Clip deleted",
        description: "Your clip has been removed from the library.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete clip. Please try again.",
        variant: "destructive",
      });
    },
  });

  const hasVideoData = (clip.videoData && clip.videoData.length > 0) || (clip.videoPath && clip.videoPath.length > 0) || !!(clip as any).signedUrl;

  const handleOpenPlayer = async () => {
    if (!clip.id) return;
    
    console.log("[ClipCard] Opening player for clip:", clip.id);
    
    // Use signed URL from Supabase Storage for direct playback (no auth required)
    // Falls back to API endpoint for legacy clips without signedUrl
    const signedUrl = (clip as any).signedUrl;
    if (signedUrl) {
      console.log("[ClipCard] Using Supabase signed URL for playback");
      setBlobUrl(signedUrl);
    } else {
      // Legacy fallback for old clips without signedUrl
      const videoUrl = `/api/clips/${clip.id}/video`;
      console.log("[ClipCard] Using legacy video endpoint:", videoUrl);
      setBlobUrl(videoUrl);
    }
    setIsPlayerOpen(true);
  };

  const handleClosePlayer = (open: boolean) => {
    if (!open) {
      setBlobUrl(null);
    }
    setIsPlayerOpen(open);
  };

  return (
    <>
      <div className="space-y-2 group" data-testid={`card-clip-${clip.id}`}>
        <div 
          className="relative aspect-[9/16] bg-gray-50 rounded-xl overflow-hidden transition-all cursor-pointer border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1"
          onClick={handleOpenPlayer}
        >
          {clip.thumbnail ? (
            <img
              src={clip.thumbnail}
              alt={`Clip ${clip.shotId}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-[#E0E7FF]">
              <PlayIcon className="h-8 w-8 text-[#111111]/50" />
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-[#111111]/80 text-white text-xs px-2 py-1 rounded-full font-medium">
            {clip.duration}s
          </div>
          {!hasVideoData && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <span className="text-[#666666] text-xs">No video data</span>
            </div>
          )}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-8 w-8 bg-white/90 backdrop-blur-sm border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  data-testid={`button-delete-clip-${clip.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete clip?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this {clip.duration}s clip from your library. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {clip.recordedAt && (
          <p className="text-xs text-[#666666]">
            {formatDistanceToNow(new Date(clip.recordedAt), { addSuffix: true })}
          </p>
        )}
      </div>

      <Dialog open={isPlayerOpen} onOpenChange={handleClosePlayer}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader>
            <DialogTitle>Clip Preview ({clip.duration}s)</DialogTitle>
          </DialogHeader>
          <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
            {blobUrl ? (
              <video
                src={blobUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
                onLoadedData={() => console.log("[ClipCard] Video loaded successfully")}
                onError={(e) => {
                  const video = e.currentTarget;
                  console.error("[ClipCard] Video error:", video.error?.message, video.error?.code);
                  console.error("[ClipCard] Video src length:", blobUrl.length);
                }}
                onCanPlay={() => console.log("[ClipCard] Video can play")}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                Video data unavailable
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
