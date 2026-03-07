import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ScrollText, Loader2, Clock } from "lucide-react";

interface CaptionWord {
  word: string;
  start: number;
  end: number;
}

interface Caption {
  start: number;
  end: number;
  originalText: string;
  viralText?: string;
  words?: CaptionWord[];
}

interface TranscriptData {
  id: string;
  captions: Caption[];
  language?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TranscriptPanelProps {
  videoId: string;
}

export function TranscriptPanel({ videoId }: TranscriptPanelProps) {
  const { data, isLoading, isError } = useQuery<TranscriptData | null>({
    queryKey: [`/api/videos/${videoId}/captions`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/videos/${videoId}/captions`);
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#666]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-sm">Loading transcript...</span>
      </div>
    );
  }

  if (isError || !data || !data.captions || data.captions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <ScrollText className="w-10 h-10 text-[#333]" />
        <div>
          <p className="text-sm text-[#888] mb-1">No transcript found</p>
          <p className="text-xs text-[#555] leading-relaxed">
            Transcribe your video from the video editor first, then return here to see the full transcript.
          </p>
        </div>
      </div>
    );
  }

  const captions = data.captions;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {data.language && (
        <div className="flex items-center gap-1.5 mb-4">
          <span className="text-[10px] text-[#555] uppercase tracking-wider">Language</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-white/[0.06] text-[#888] rounded font-mono">
            {data.language}
          </span>
          <span className="text-[10px] text-[#555] ml-auto">{captions.length} segments</span>
        </div>
      )}

      <div className="space-y-1">
        {captions.map((caption, idx) => (
          <div
            key={idx}
            className="group flex gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-start pt-0.5 shrink-0">
              <span className="flex items-center gap-1 text-[11px] text-[#555] font-mono group-hover:text-blue-500/70 transition-colors">
                <Clock className="w-3 h-3" />
                {formatTime(caption.start)}
              </span>
            </div>
            <p className="text-sm text-[#ccc] leading-relaxed group-hover:text-white transition-colors">
              {caption.originalText}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
