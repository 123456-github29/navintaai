import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  XMarkIcon,
  PlayIcon,
  StopIcon,
  SparklesIcon,
  CheckIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import { useVoiceover } from "@/hooks/useVoiceover";

interface VoiceoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplied?: () => void;
  clipId?: string;
  defaultScript?: string;
}

export function VoiceoverModal({ isOpen, onClose, onApplied, clipId, defaultScript }: VoiceoverModalProps) {
  const voiceover = useVoiceover(clipId);
  
  useEffect(() => {
    if (isOpen && defaultScript && !voiceover.text) {
      voiceover.setText(defaultScript);
    }
  }, [isOpen, defaultScript]);
  
  useEffect(() => {
    if (!isOpen) {
      voiceover.stopPreview();
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-black border-l border-white/10 z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#135bec]/20 flex items-center justify-center">
            <SpeakerWaveIcon className="h-5 w-5 text-[#135bec]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Voiceover</h2>
            <p className="text-xs text-white/50">Generate professional narration</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
        >
          <XMarkIcon className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Voice</label>
          <Select
            value={voiceover.selectedVoiceId}
            onValueChange={voiceover.setSelectedVoiceId}
          >
            <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent className="bg-black border-white/10">
              {voiceover.voices.map((voice) => (
                <SelectItem
                  key={voice.voice_id}
                  value={voice.voice_id}
                  className="text-white hover:bg-white/10 focus:bg-white/10"
                >
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">
            Narration Text
          </label>
          <Textarea
            placeholder="Enter or paste your narration script here..."
            value={voiceover.text}
            onChange={(e) => voiceover.setText(e.target.value)}
            className="min-h-[200px] bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
          />
          <p className="text-xs text-white/40">
            {voiceover.text.split(/\s+/).filter(w => w).length} words
          </p>
        </div>
        
        {voiceover.error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400">{voiceover.error}</p>
          </div>
        )}
        
        <Button
          onClick={voiceover.generateVoiceover}
          disabled={voiceover.isGenerating || !voiceover.text.trim()}
          className="w-full bg-[#135bec] hover:bg-[#135bec]/90 text-white"
        >
          {voiceover.isGenerating ? (
            <>
              <SparklesIcon className="h-4 w-4 mr-2 animate-pulse" />
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4 mr-2" />
              Generate Voice
            </>
          )}
        </Button>
        
        {voiceover.audioUrl && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">Preview</span>
              <div className="flex items-center gap-2">
                {voiceover.isPlaying ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={voiceover.stopPreview}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <StopIcon className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={voiceover.playPreview}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Play
                  </Button>
                )}
              </div>
            </div>
            
            <div className="h-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
              {voiceover.isPlaying ? (
                <div className="flex items-end gap-1 h-8">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#135bec] rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animationDelay: `${i * 50}ms`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-end gap-1 h-8">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-white/20 rounded-full"
                      style={{ height: `${20 + Math.random() * 40}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-white/10">
        <Button
          onClick={() => {
            voiceover.applyVoiceover();
            onApplied?.();
          }}
          disabled={!voiceover.audioUrl || voiceover.isApplied}
          className={`w-full ${
            voiceover.isApplied
              ? "bg-green-600 hover:bg-green-600"
              : "bg-white text-black hover:bg-white/90"
          }`}
        >
          {voiceover.isApplied ? (
            <>
              <CheckIcon className="h-4 w-4 mr-2" />
              Voiceover Applied
            </>
          ) : (
            "Apply to Video"
          )}
        </Button>
      </div>
    </div>
  );
}
