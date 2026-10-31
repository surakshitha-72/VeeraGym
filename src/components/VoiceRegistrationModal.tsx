import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, AlertCircle, ArrowRight, X, Play, RefreshCw, Volume2, Square } from 'lucide-react';
import { parseVoiceTranscript } from '../services/api.ts';

interface ExtractedData {
  name: string;
  phone: string;
  weightKg: number;
  category: 'cardio' | 'non-cardio';
  monthlyFee: number;
  joiningDate: string;
  firstPaymentDate?: string;
  amountPaid?: number;
  paymentMethod?: string;
  notes?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (data: ExtractedData) => void;
}

export const VoiceRegistrationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onExtracted,
}) => {
  if (!isOpen) return null;

  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [micStatusText, setMicStatusText] = useState<string>(
    'Ready. Click "Start Recording" — it will keep recording continuously until you click Stop.'
  );

  const recognitionRef = useRef<any>(null);
  const isExplicitlyRecordingRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>('');
  const timerIntervalRef = useRef<any>(null);

  // Timer effect while recording
  useEffect(() => {
    if (isListening) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isListening]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      isExplicitlyRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  const createRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Request continuous speech
      recognition.interimResults = true; // Real-time feedback
      recognition.lang = 'en-IN'; // Indian English recognition

      recognition.onstart = () => {
        setIsListening(true);
        setMicStatusText('🎙️ Recording actively. Speak freely — it will NOT stop until you click "Stop Recording".');
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finals = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finals += item[0].transcript + ' ';
          } else {
            interim += item[0].transcript;
          }
        }

        if (finals.trim()) {
          accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + finals.trim();
        }

        const currentFull = (accumulatedTranscriptRef.current + (interim ? ' ' + interim : '')).trim();
        if (currentFull) {
          setTranscript(currentFull);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          isExplicitlyRecordingRef.current = false;
          setIsListening(false);
          setError('Microphone permission denied. Please allow microphone access or use the sample prompts.');
        } else if (event.error === 'no-speech') {
          // Do NOT stop recording when user is quiet/pausing!
          setMicStatusText('Still recording... Speak customer details whenever you are ready.');
        }
      };

      // CRITICAL: Prevent premature termination by browser timeouts
      recognition.onend = () => {
        if (isExplicitlyRecordingRef.current) {
          // The browser prematurely ended the stream due to silence or a pause,
          // but the user HAS NOT clicked Stop! Automatically restart!
          try {
            recognition.start();
          } catch (_) {
            setTimeout(() => {
              if (isExplicitlyRecordingRef.current) {
                try {
                  recognition.start();
                } catch (e) {
                  console.warn('Auto-restart retry error:', e);
                }
              }
            }, 100);
          }
        } else {
          setIsListening(false);
          setMicStatusText('Recording stopped. Review the text and click "Extract & Populate Form".');
        }
      };

      return recognition;
    } catch (e) {
      console.error('Speech recognition creation error:', e);
      return null;
    }
  };

  const startListening = async () => {
    setError(null);
    accumulatedTranscriptRef.current = transcript.trim();

    // Trigger permission dialog if needed
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
      }
    } catch (_) {}

    const recognition = createRecognition();
    if (!recognition) {
      setError('Speech recognition is not available in this browser. Please type into the box or click a sample prompt below.');
      return;
    }

    recognitionRef.current = recognition;
    isExplicitlyRecordingRef.current = true;

    try {
      recognition.start();
    } catch (err: any) {
      console.warn('Recognition start error:', err);
      // If already started, mark explicit recording
      setIsListening(true);
    }
  };

  const stopListening = () => {
    isExplicitlyRecordingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
  };

  const handleProcess = async () => {
    if (!transcript.trim()) {
      setError('Please speak or enter customer information first.');
      return;
    }

    stopListening();
    setError(null);
    setIsProcessing(true);

    try {
      const data = await parseVoiceTranscript(transcript);
      setIsProcessing(false);
      onExtracted(data);
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Could not parse speech. Please verify the text or enter manually.');
    }
  };

  const setSamplePrompt = (text: string) => {
    stopListening();
    accumulatedTranscriptRef.current = text;
    setTranscript(text);
    setError(null);
    setMicStatusText('Sample prompt loaded. Click "Extract & Populate Form" to continue.');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#161a20] border border-neutral-700/80 rounded-2xl shadow-2xl p-6 text-neutral-200">
        <button
          onClick={() => {
            stopListening();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-neutral-800">
          <div className="p-2.5 bg-gradient-to-br from-neutral-700 to-neutral-800 border border-neutral-600 rounded-xl text-white shadow-md">
            <Mic className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Continuous Voice Registration</h3>
            <p className="text-xs text-neutral-400 font-medium">
              Records continuously without timing out until you explicitly click Stop
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Main Recording Control Card */}
          <div className={`flex flex-col items-center justify-center py-6 px-4 rounded-xl border transition-all ${
            isListening
              ? 'bg-red-950/20 border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
              : 'bg-[#1e232b] border-neutral-800'
          }`}>
            {isListening ? (
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={stopListening}
                  className="relative p-6 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-[0_0_35px_rgba(239,68,68,0.6)] animate-pulse transition-all cursor-pointer ring-8 ring-red-500/25"
                  title="Click to Stop Recording"
                >
                  <Square className="w-8 h-8 fill-white" />
                </button>
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="font-mono text-sm font-bold text-red-400 tabular-nums">
                    RECORDING: {formatTimer(recordingSeconds)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopListening}
                  className="mt-2 py-1.5 px-4 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-lg text-xs font-bold border border-red-700 transition-colors cursor-pointer"
                >
                  Stop Recording (Done Speaking)
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={startListening}
                  className="relative p-6 rounded-full bg-neutral-800 hover:bg-neutral-700 border-2 border-emerald-500/80 text-white shadow-xl hover:scale-105 transition-all cursor-pointer group ring-4 ring-emerald-500/20"
                  title="Start Continuous Recording"
                >
                  <Mic className="w-9 h-9 text-emerald-400 group-hover:scale-110 transition-transform" />
                </button>
                <span className="text-xs font-bold mt-3 text-white">
                  Click to Start Continuous Recording
                </span>
              </div>
            )}

            <span className="text-[11px] text-neutral-300 mt-2 text-center max-w-md font-medium">
              {micStatusText}
            </span>
          </div>

          {/* Transcript Display / Input */}
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Accumulated Spoken Transcript:</span>
              </span>
              {transcript && (
                <button
                  type="button"
                  onClick={() => {
                    accumulatedTranscriptRef.current = '';
                    setTranscript('');
                  }}
                  className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Clear Transcript
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                accumulatedTranscriptRef.current = e.target.value;
              }}
              placeholder='Spoken words will continuously accumulate here until you click Stop... (e.g. "Add Rahul Kumar, weight 72 kilograms, mobile number 9876543210, non-cardio membership, paid 600 rupees on 15th October 2026.")'
              className="w-full bg-[#1e232b] border border-neutral-700 text-white placeholder-neutral-500 rounded-xl p-3 text-sm focus:outline-none focus:border-neutral-500 leading-relaxed font-sans"
            />
          </div>

          {/* Quick Voice Test Prompts */}
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-2">
              Or Click a Preset Voice Sample:
            </span>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  setSamplePrompt(
                    'Add Rahul Kumar, weight 72 kilograms, mobile number 9876543210, non-cardio membership, paid 600 rupees on 15th October 2026.'
                  )
                }
                className="text-left text-xs bg-[#1e232b] hover:bg-neutral-800 border border-neutral-800/80 hover:border-neutral-600 rounded-lg p-2.5 transition-colors text-neutral-300 flex items-center justify-between group cursor-pointer"
              >
                <span className="truncate">
                  "Add Rahul Kumar, weight 72 kilograms, mobile number 9876543210, non-cardio membership, paid 600 rupees on 15th October 2026."
                </span>
                <Play className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-400 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setSamplePrompt(
                    'Register Vikram Rathore, weight 84 kg, phone 9845012345, cardio membership 1000 rupees paid via UPI on 28th October 2026.'
                  )
                }
                className="text-left text-xs bg-[#1e232b] hover:bg-neutral-800 border border-neutral-800/80 hover:border-neutral-600 rounded-lg p-2.5 transition-colors text-neutral-300 flex items-center justify-between group cursor-pointer"
              >
                <span className="truncate">
                  "Register Vikram Rathore, weight 84 kg, phone 9845012345, cardio membership 1000 rupees paid via UPI on 28th October 2026."
                </span>
                <Play className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-400 shrink-0 ml-2" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              stopListening();
              onClose();
            }}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing || !transcript.trim()}
            className="flex-1 py-3 px-4 bg-white hover:bg-neutral-100 text-neutral-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg hover:shadow-xl"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-neutral-950" />
                Extracting Details...
              </span>
            ) : (
              <>
                <span>Extract & Populate Form</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
