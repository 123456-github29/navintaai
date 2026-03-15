import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

  const { data: videos, isLoading: videosLoading, refetch: refetchVideos } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  const { data: clips, isLoading: clipsLoading, refetch: refetchClips } = useQuery<Clip[]>({
    queryKey: ["/api/clips"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (isAuthenticated) {
      refetchVideos();
      refetchClips();
    }
  }, [isAuthenticated, refetchVideos, refetchClips]);

  const filteredVideos = videos?.filter((v) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 lg:p-10 min-h-screen" style={{ background: "#050505" }}>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Library</h1>
            <p className="text-sm text-white/30 mt-1">Your recorded clips and finished videos</p>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/25" />
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 w-72 h-11 rounded-full bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 focus:ring-indigo-500/30 focus:border-indigo-500/50"
              data-testid="input-search"
            />
          </div>
        </div>

        <Tabs defaultValue="videos" className="space-y-8">
          <TabsList className="inline-flex h-auto p-1 gap-1 bg-white/[0.03] border border-white/[0.06] rounded-full">
            <TabsTrigger
              value="videos"
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white/40 transition-all data-[state=active]:bg-white data-[state=active]:text-black hover:text-white/60"
              data-testid="tab-videos"
            >
              Finished Videos
            </TabsTrigger>
            <TabsTrigger
              value="clips"
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white/40 transition-all data-[state=active]:bg-white data-[state=active]:text-black hover:text-white/60"
              data-testid="tab-clips"
            >
              Recorded Clips
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-4">
            {videosLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="rounded-2xl bg-white/[0.03] aspect-[9/16]" />)}
              </div>
            ) : filteredVideos && filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((video) => <VideoCard key={video.id} video={video} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <PlayIcon className="h-12 w-12 text-white/10 mb-6" />
                <h3 className="text-xl font-semibold text-white mb-2">No videos yet</h3>
                <p className="text-white/30 text-sm max-w-sm text-center mb-6">
                  {searchQuery ? "No videos match your search" : "Create your first video to see it here"}
                </p>
                <Button className="bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] rounded-full" onClick={() => window.location.href = "/dashboard"}>
                  Start Creating
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="clips" className="space-y-4">
            {clipsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="rounded-2xl bg-white/[0.03] aspect-[9/16]" />)}
              </div>
            ) : clips && clips.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {clips.map((clip) => <ClipCard key={clip.id} clip={clip} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <PlayIcon className="h-12 w-12 text-white/10 mb-6" />
                <h3 className="text-xl font-semibold text-white mb-2">No clips recorded yet</h3>
                <p className="text-white/30 text-sm max-w-sm text-center mb-6">Record your first shot to see clips here</p>
                <Button className="bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] rounded-full" onClick={() => window.location.href = "/dashboard"}>
                  Start Recording
                </Button>
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
      toast({ title: "Video deleted", description: "Removed from your library." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete video.", variant: "destructive" });
    },
  });

  const handleDownload = async () => {
    try {
      toast({ title: "Preparing download...", description: "Fetching video file." });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
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
    } catch {
      toast({ title: "Download failed", description: "Could not download.", variant: "destructive" });
    }
  };

  const videoSrc = (video as any).signedUrl || `/api/videos/${video.id}/download`;

  return (
    <>
      <div
        className="rounded-2xl border border-white/[0.06] bg-white/[0.025] overflow-hidden group cursor-pointer transition-all hover:border-white/12"
        data-testid={`card-video-${video.id}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-[9/16] overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0a0a, #111)" }}>
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={video.title} className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-105' : ''}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <PlayIcon className="h-8 w-8 text-white/30" />
              </div>
            </div>
          )}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`absolute bottom-0 left-0 right-0 p-4 space-y-2 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Button size="sm" className="w-full bg-white/90 text-black hover:bg-white border-0 rounded-xl" onClick={() => setLocation(`/ai-editor/${video.id}`)}>
              <PencilSquareIcon className="h-4 w-4 mr-2" /> Edit with AI
            </Button>
            <Button size="sm" className="w-full bg-white/90 text-black hover:bg-white border-0 rounded-xl" onClick={() => setIsPlayerOpen(true)}>
              <PlayIcon className="h-4 w-4 mr-2" /> Preview
            </Button>
            <Button size="sm" className="w-full bg-indigo-500 text-white hover:bg-indigo-400 border-0 rounded-xl" onClick={handleDownload}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" /> Download
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="w-full bg-white/10 backdrop-blur-sm border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl">
                  <TrashIcon className="h-4 w-4 mr-2" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#111] border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Delete video?</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/40">
                    This will permanently delete "{video.title}". This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-500 text-white hover:bg-red-600">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-white/80 line-clamp-2 leading-tight text-sm">{video.title}</h3>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-white/40 font-medium border border-white/[0.06]">{video.aspectRatio}</span>
            {video.hasCaption && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] text-emerald-400 font-medium border border-emerald-500/20">Captioned</span>}
          </div>
          {video.exportedAt && <span className="text-white/20 text-xs block">{formatDistanceToNow(new Date(video.exportedAt), { addSuffix: true })}</span>}
        </div>
      </div>

      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="max-w-md p-6 bg-[#111] border-white/10">
          <DialogHeader><DialogTitle className="text-white">{video.title}</DialogTitle></DialogHeader>
          <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden">
            <video src={videoSrc} controls autoPlay playsInline className="w-full h-full object-contain" />
          </div>
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
      toast({ title: "Clip deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete clip.", variant: "destructive" });
    },
  });

  const hasVideoData = (clip.videoData && clip.videoData.length > 0) || (clip.videoPath && clip.videoPath.length > 0) || !!(clip as any).signedUrl;

  const handleOpenPlayer = async () => {
    if (!clip.id) return;
    const signedUrl = (clip as any).signedUrl;
    setBlobUrl(signedUrl || `/api/clips/${clip.id}/video`);
    setIsPlayerOpen(true);
  };

  return (
    <>
      <div className="space-y-2 group" data-testid={`card-clip-${clip.id}`}>
        <div
          className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer border border-white/[0.06] bg-white/[0.02] hover:border-white/12 transition-all"
          onClick={handleOpenPlayer}
        >
          {clip.thumbnail ? (
            <img src={clip.thumbnail} alt={`Clip ${clip.shotId}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0a0a, #111)" }}>
              <PlayIcon className="h-8 w-8 text-white/20" />
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm">{clip.duration}s</div>
          {!hasVideoData && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="text-white/30 text-xs">No video data</span>
            </div>
          )}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="outline" className="h-8 w-8 bg-black/60 backdrop-blur-sm border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={(e) => e.stopPropagation()}>
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#111] border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Delete clip?</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/40">This will permanently delete this {clip.duration}s clip.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-500 text-white hover:bg-red-600">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {clip.recordedAt && <p className="text-xs text-white/20">{formatDistanceToNow(new Date(clip.recordedAt), { addSuffix: true })}</p>}
      </div>

      <Dialog open={isPlayerOpen} onOpenChange={(open) => { if (!open) setBlobUrl(null); setIsPlayerOpen(open); }}>
        <DialogContent className="max-w-md p-4 bg-[#111] border-white/10">
          <DialogHeader><DialogTitle className="text-white">Clip Preview ({clip.duration}s)</DialogTitle></DialogHeader>
          <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden">
            {blobUrl ? <video src={blobUrl} controls autoPlay playsInline className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-white/30">Unavailable</div>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
