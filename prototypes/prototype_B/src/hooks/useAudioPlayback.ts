import { useState, useRef, useCallback } from 'react';

export type BotColor = 'red' | 'yellow' | 'green' | 'gray' | 'blue';

export type AudioSection = 'arguments_intro' | 'debate_script';

// Wiedergabe-Geschwindigkeit pro Speaker (relativ zu normaler Geschwindigkeit)
// B (yellow/onyx) und D (gray/sage) langsamer, E (blue/ash) schneller
const SPEAKER_PLAYBACK_RATES: Record<string, number> = {
  A: 0.95,       // coral (rot) - langsamer
  B: 1.0,       // onyx (gelb) - langsamer
  C: 1.0,       // alloy (grün) - normal
  D: 0.97,      // sage (grau) - langsamer
  E: 1.05,      // ash (blau) - schneller (+0.1)
};

// Lautstärke pro Speaker (0.0 bis 1.0)
// A (coral) und D (sage) sind weibliche Stimmen und werden lauter gemacht
const SPEAKER_VOLUMES: Record<string, number> = {
  A: 1.0,       // coral (rot) ♀ - lauter
  B: 0.6,       // onyx (gelb) ♂ - normal
  C: 0.6,       // alloy (grün) - normal
  D: 1.0,       // sage (grau) ♀ - lauter
  E: 0.6,       // ash (blau) ♂ - normal
};

export interface PlayOptions {
  section: AudioSection;
  speaker: string; // "A", "B", "C", "D", "E"
  id: number;
  lang: string; // "de" or "en"
  onEnded?: () => void;
}

interface UseAudioPlaybackReturn {
  isMuted: boolean;
  toggleMute: () => void;
  play: (options: PlayOptions) => void;
  stopPlaying: () => void;
  pausePlaying: () => void;
  resumePlaying: () => void;
  isPlaying: boolean;
  getWordDuration: (text: string, botColor?: BotColor) => number;
}

export const useAudioPlayback = (): UseAudioPlaybackReturn => {
  // Mute-Status aus sessionStorage laden (persistiert während der Debatte)
  const [isMuted, setIsMuted] = useState(() => {
    const stored = sessionStorage.getItem('debate-muted');
    return stored === 'true';
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentOptionsRef = useRef<PlayOptions | null>(null);

  // Generiere den Pfad zur Audio-Datei
  const getAudioPath = useCallback((options: PlayOptions): string => {
    const { section, speaker, id, lang } = options;
    const paddedId = id.toString().padStart(3, '0');
    // Verwende import.meta.env.BASE_URL für korrekten Pfad mit Vite base path
    const basePath = import.meta.env.BASE_URL || '/';
    return `${basePath}audio/${lang}/${section}_speaker${speaker}_id${paddedId}.mp3`;
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      sessionStorage.setItem('debate-muted', String(newValue));
      if (newValue && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else if (!newValue && audioRef.current && currentOptionsRef.current) {
        // Wenn unmute und Audio war pausiert, fortsetzen
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
      return newValue;
    });
  }, []);

  const stopPlaying = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    currentOptionsRef.current = null;
    setIsPlaying(false);
  }, []);

  const pausePlaying = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  const resumePlaying = useCallback(() => {
    if (audioRef.current && audioRef.current.paused && !isMuted) {
      audioRef.current.play().catch(console.error);
    }
  }, [isMuted]);

  const play = useCallback((options: PlayOptions) => {
    // Stoppe vorheriges Audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audioPath = getAudioPath(options);
    console.log(`Playing audio: ${audioPath}`);
    
    const audio = new Audio(audioPath);
    audioRef.current = audio;
    currentOptionsRef.current = options;

    // Setze die Wiedergabegeschwindigkeit basierend auf dem Speaker
    audio.playbackRate = SPEAKER_PLAYBACK_RATES[options.speaker] ?? 1.0;
    
    // Setze die Lautstärke basierend auf dem Speaker
    audio.volume = SPEAKER_VOLUMES[options.speaker] ?? 0.7;

    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => {
      setIsPlaying(false);
      currentOptionsRef.current = null;
      options.onEnded?.();
    };
    audio.onerror = (e) => {
      console.error(`Error loading audio: ${audioPath}`, e);
      setIsPlaying(false);
      currentOptionsRef.current = null;
      options.onEnded?.();
    };

    if (!isMuted) {
      audio.play().catch(console.error);
    }
  }, [isMuted, getAudioPath]);

  // Gibt die Wort-Dauer zurück (für Typewriter-Effekt Kompatibilität)
  const getWordDuration = useCallback((_text: string, _botColor: BotColor = 'yellow'): number => {
    // Basis: ~380ms pro Wort (gleich wie vorher im Typewriter-Effekt)
    return 380;
  }, []);

  return {
    isMuted,
    toggleMute,
    play,
    stopPlaying,
    pausePlaying,
    resumePlaying,
    isPlaying,
    getWordDuration
  };
};

export default useAudioPlayback;
