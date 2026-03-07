import fetch from "node-fetch";

interface VoiceoverOptions {
  text: string;
  voiceId?: string;
}

interface Voice {
  voice_id: string;
  name: string;
}

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - professional narrator

export async function generateVoiceover(options: VoiceoverOptions): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is required for voiceover generation");
  }
  
  const voiceId = options.voiceId || DEFAULT_VOICE_ID;
  
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: options.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("[elevenlabs] API error:", response.status, errorText);
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }
  
  const audioBuffer = await response.buffer();
  console.log(`[elevenlabs] Generated voiceover: ${audioBuffer.length} bytes`);
  
  return audioBuffer;
}

export async function getAvailableVoices(): Promise<Voice[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    return [{
      voice_id: DEFAULT_VOICE_ID,
      name: "Rachel (Default)",
    }];
  }
  
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
      },
    });
    
    if (!response.ok) {
      console.warn("[elevenlabs] Failed to fetch voices, using default");
      return [{
        voice_id: DEFAULT_VOICE_ID,
        name: "Rachel (Default)",
      }];
    }
    
    const data = await response.json() as { voices: Voice[] };
    return data.voices.slice(0, 10).map((v: Voice) => ({
      voice_id: v.voice_id,
      name: v.name,
    }));
  } catch (error) {
    console.error("[elevenlabs] Error fetching voices:", error);
    return [{
      voice_id: DEFAULT_VOICE_ID,
      name: "Rachel (Default)",
    }];
  }
}
