import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Voice {
  voice_id: string;
  name: string;
}

interface VoiceoverState {
  text: string;
  selectedVoiceId: string;
  audioUrl: string | null;
  audioBlob: Blob | null;
  isGenerating: boolean;
  isPlaying: boolean;
  isApplied: boolean;
  error: string | null;
  voices: Voice[];
}

export function useVoiceover(clipId?: string) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [state, setState] = useState<VoiceoverState>({
    text: "",
    selectedVoiceId: "21m00Tcm4TlvDq8ikWAM",
    audioUrl: null,
    audioBlob: null,
    isGenerating: false,
    isPlaying: false,
    isApplied: false,
    error: null,
    voices: [{ voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Default)" }],
  });
  
  const setText = useCallback((text: string) => {
    setState(prev => ({ ...prev, text, error: null }));
  }, []);
  
  const setSelectedVoiceId = useCallback((voiceId: string) => {
    setState(prev => ({ ...prev, selectedVoiceId: voiceId }));
  }, []);
  
  const generateVoiceover = useCallback(async () => {
    if (!state.text.trim()) {
      setState(prev => ({ ...prev, error: "Please enter some text for the voiceover" }));
      return;
    }
    
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error("Please sign in to generate voiceover");
      }
      
      const response = await fetch("/api/voiceover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: state.text,
          voiceId: state.selectedVoiceId,
          clipId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Generation failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      
      setState(prev => ({
        ...prev,
        audioUrl,
        audioBlob: blob,
        isGenerating: false,
        isApplied: false,
      }));
      
      toast({
        title: "Voiceover generated!",
        description: "Preview your voiceover before applying it.",
      });
    } catch (error: any) {
      console.error("[useVoiceover] Generation error:", error);
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error.message || "Failed to generate voiceover",
      }));
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate voiceover",
        variant: "destructive",
      });
    }
  }, [state.text, state.selectedVoiceId, clipId, toast]);
  
  const playPreview = useCallback(() => {
    if (!state.audioUrl) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    audioRef.current = new Audio(state.audioUrl);
    audioRef.current.onended = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };
    audioRef.current.play();
    setState(prev => ({ ...prev, isPlaying: true }));
  }, [state.audioUrl]);
  
  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);
  
  const applyVoiceover = useCallback(async () => {
    if (!state.audioBlob) {
      toast({
        title: "No voiceover",
        description: "Please generate a voiceover first.",
        variant: "destructive",
      });
      return;
    }
    
    setState(prev => ({ ...prev, isApplied: true }));
    
    toast({
      title: "Voiceover applied!",
      description: "The voiceover has been attached to your video.",
    });
  }, [state.audioBlob, toast]);
  
  const reset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState({
      text: "",
      selectedVoiceId: "21m00Tcm4TlvDq8ikWAM",
      audioUrl: null,
      audioBlob: null,
      isGenerating: false,
      isPlaying: false,
      isApplied: false,
      error: null,
      voices: [{ voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Default)" }],
    });
  }, [state.audioUrl]);
  
  return {
    ...state,
    setText,
    setSelectedVoiceId,
    generateVoiceover,
    playPreview,
    stopPreview,
    applyVoiceover,
    reset,
  };
}
