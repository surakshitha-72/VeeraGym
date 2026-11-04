
import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Sparkles,
  AlertCircle,
  ArrowRight,
  X,
  RefreshCw,
  Volume2,
  Square,
} from 'lucide-react';
import { parseVoiceTranscript } from '../services/api.ts';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';

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

type ListenerHandle = {
  remove: () => Promise<void>;
};

export const VoiceRegistrationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onExtracted,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [micStatusText, setMicStatusText] = useState(
    'Ready. Click Start Recording to begin.'
  );

  const recognitionRef = useRef<any>(null);
  const explicitlyRecordingRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nativeListenersRef = useRef<ListenerHandle[]>([]);
  const nativeRecordingRef = useRef(false);
  const mountedRef = useRef(true);

  const isNative = Capacitor.isNativePlatform();

  // Update transcript safely
  const setTranscriptSafely = (value: string) => {
    const clean = value.trim();

    if (clean) {
      accumulatedTranscriptRef.current = clean;
      setTranscript(clean);
    }
  };

  // Remove native speech listeners
  const removeNativeListeners = async () => {
    const handles = nativeListenersRef.current;
    nativeListenersRef.current = [];

    await Promise.all(
      handles.map(async (handle) => {
        try {
          await handle.remove();
        } catch (e) {
          console.warn('Listener cleanup:', e);
        }
      })
    );
  };

  // Stop native Android speech recognition
  const stopNative = async () => {
    nativeRecordingRef.current = false;

    try {
      await SpeechRecognition.stop();
    } catch (e) {
      console.warn('Speech stop notice:', e);

      try {
        await SpeechRecognition.forceStop();
      } catch (forceError) {
        console.warn('Speech force-stop notice:', forceError);
      }
    }

    await removeNativeListeners();
  };

  // Stop recording
  const stopListening = async () => {
    explicitlyRecordingRef.current = false;

    if (isNative) {
      await stopNative();
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn(e);
      }

      recognitionRef.current = null;
    }

    if (mountedRef.current) {
      setIsListening(false);

      setMicStatusText(
        'Recording stopped. Review the transcript and click Extract & Populate Form.'
      );
    }
  };

  // Recording timer
  useEffect(() => {
    if (isListening) {
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((n) => n + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isListening]);

  // Component cleanup
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      explicitlyRecordingRef.current = false;

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }

      if (
        nativeRecordingRef.current ||
        nativeListenersRef.current.length
      ) {
        SpeechRecognition.stop().catch(() => {});

        nativeListenersRef.current.forEach((handle) => {
          handle.remove().catch(() => {});
        });

        nativeListenersRef.current = [];
        nativeRecordingRef.current = false;
      }
    };
  }, []);

  // Stop microphone when modal is closed by parent
  useEffect(() => {
    if (!isOpen && (isListening || nativeRecordingRef.current)) {
      void stopListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Browser speech recognition fallback
  const createBrowserRecognition = () => {
    const BrowserRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!BrowserRecognition) {
      return null;
    }

    try {
      const recognition = new BrowserRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);

        setMicStatusText(
          'Recording actively. Speak freely and click Stop when finished.'
        );
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalText = '';

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i += 1
        ) {
          const item = event.results[i];

          if (item.isFinal) {
            finalText += `${item[0].transcript} `;
          } else {
            interim += item[0].transcript;
          }
        }

        if (finalText.trim()) {
          accumulatedTranscriptRef.current = [
            accumulatedTranscriptRef.current,
            finalText.trim(),
          ]
            .filter(Boolean)
            .join(' ');
        }

        const full = [
          accumulatedTranscriptRef.current,
          interim.trim(),
        ]
          .filter(Boolean)
          .join(' ')
          .trim();

        if (full) {
          setTranscript(full);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn(
          'Browser speech recognition:',
          event.error
        );

        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed'
        ) {
          explicitlyRecordingRef.current = false;
          setIsListening(false);

          setError(
            'Microphone permission denied. Allow microphone access in browser settings and try again.'
          );
        } else if (event.error === 'no-speech') {
          setMicStatusText(
            'Still recording. Speak whenever you are ready.'
          );
        } else {
          setError(
            `Speech recognition error: ${event.error || 'Unknown error'}`
          );
        }
      };

      recognition.onend = () => {
        if (explicitlyRecordingRef.current) {
          window.setTimeout(() => {
            if (explicitlyRecordingRef.current) {
              try {
                recognition.start();
              } catch (e) {
                console.warn('Browser speech restart:', e);
              }
            }
          }, 250);
        } else {
          setIsListening(false);
        }
      };

      return recognition;
    } catch (e) {
      console.error(
        'Could not create browser recognition:',
        e
      );

      return null;
    }
  };

  // Native Android speech recognition
  const startNativeListening = async () => {
    setMicStatusText(
      'Requesting Android microphone permission...'
    );

    const permission =
      await SpeechRecognition.requestPermissions();

    if (permission.speechRecognition !== 'granted') {
      throw new Error(
        'Microphone permission was not granted. Open Android Settings > Apps > VeeraGym > Permissions and allow Microphone.'
      );
    }

    const availability =
      await SpeechRecognition.available();

    if (!availability.available) {
      throw new Error(
        'Speech recognition is unavailable. Check that a speech recognition service is installed and enabled on this phone.'
      );
    }

    await removeNativeListeners();

    // Partial speech results
    const partialHandle =
      await SpeechRecognition.addListener(
        'partialResults',
        (event: any) => {
          if (!explicitlyRecordingRef.current) {
            return;
          }

          if (
            typeof event.accumulatedText === 'string' &&
            event.accumulatedText.trim()
          ) {
            setTranscriptSafely(event.accumulatedText);
          } else if (
            Array.isArray(event.matches) &&
            event.matches[0]
          ) {
            const match = String(event.matches[0]).trim();

            if (match) {
              const base =
                accumulatedTranscriptRef.current.trim();

              setTranscript(
                base &&
                !base.toLowerCase().endsWith(match.toLowerCase())
                  ? `${base} ${match}`
                  : match
              );
            }
          }
        }
      );

    nativeListenersRef.current.push(partialHandle);

    // Final speech segments
    const segmentHandle =
      await SpeechRecognition.addListener(
        'segmentResults',
        (event: any) => {
          if (
            !explicitlyRecordingRef.current ||
            !Array.isArray(event.matches)
          ) {
            return;
          }

          const segment = event.matches
            .map((v: string) => String(v).trim())
            .filter(Boolean)
            .join(' ');

          if (segment) {
            const next = [
              accumulatedTranscriptRef.current.trim(),
              segment,
            ]
              .filter(Boolean)
              .join(' ');

            accumulatedTranscriptRef.current = next;
            setTranscript(next);
          }
        }
      );

    nativeListenersRef.current.push(segmentHandle);

    // Native recognition errors
    const errorHandle =
      await SpeechRecognition.addListener(
        'error',
        (event: any) => {
          if (!explicitlyRecordingRef.current) {
            return;
          }

          console.warn(
            'Native speech recognition error:',
            event
          );

          setError(
            `Microphone recognition error: ${
              event?.message ||
              event?.code ||
              'Unknown error'
            }`
          );
        }
      );

    nativeListenersRef.current.push(errorHandle);

    nativeRecordingRef.current = true;

    await SpeechRecognition.start({
      language: 'en-IN',
      partialResults: true,
      maxResults: 5,
      popup: false,
    });

    setIsListening(true);
    setError(null);

    setMicStatusText(
      'Android microphone is active. Speak customer details, then tap Stop Recording.'
    );
  };

  // Start recording
  const startListening = async () => {
    if (isListening || isProcessing) {
      return;
    }

    setError(null);

    accumulatedTranscriptRef.current = transcript.trim();

    explicitlyRecordingRef.current = true;

    try {
      if (isNative) {
        await startNativeListening();
      } else {
        const recognition = createBrowserRecognition();

        if (!recognition) {
          explicitlyRecordingRef.current = false;

          setError(
            'Speech recognition is not supported in this browser. Please type the details or use the Android app.'
          );

          return;
        }

        recognitionRef.current = recognition;
        recognition.start();
      }
    } catch (e: any) {
      console.error(
        'Could not start speech recognition:',
        e
      );

      explicitlyRecordingRef.current = false;
      nativeRecordingRef.current = false;

      await removeNativeListeners();

      setIsListening(false);

      setError(
        e?.message ||
        'Could not start the microphone. Check app microphone permission and try again.'
      );

      setMicStatusText(
        'Microphone could not be started. Check permissions and retry.'
      );
    }
  };

  // Send transcript to existing Gemini parsing backend
  const handleProcess = async () => {
    if (!transcript.trim()) {
      setError(
        'Please speak or enter customer information first.'
      );

      return;
    }

    await stopListening();

    setError(null);
    setIsProcessing(true);

    try {
      const data = await parseVoiceTranscript(
        transcript.trim()
      );

      onExtracted(data as ExtractedData);
      onClose();
    } catch (e: any) {
      setError(
        e?.message ||
        'Could not parse speech. Verify the text or enter the details manually.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = async () => {
    await stopListening();
    onClose();
  };

  const clearTranscript = () => {
    accumulatedTranscriptRef.current = '';
    setTranscript('');
    setError(null);
  };

  const formatTimer = (seconds: number) => {
    return `${String(
      Math.floor(seconds / 60)
    ).padStart(2, '0')}:${String(
      seconds % 60
    ).padStart(2, '0')}`;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#161a20] border border-neutral-700/80 rounded-2xl shadow-2xl p-6 text-neutral-200">

        <button
          type="button"
          onClick={closeModal}
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
            <h3 className="text-xl font-bold text-white tracking-tight">
              Continuous Voice Registration
            </h3>

            <p className="text-xs text-neutral-400 font-medium">
              Speak customer details, then stop and review the transcript
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

          {/* Recording controls */}
          <div
            className={`flex flex-col items-center justify-center py-6 px-4 rounded-xl border transition-all ${
              isListening
                ? 'bg-red-950/20 border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                : 'bg-[#1e232b] border-neutral-800'
            }`}
          >

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
                  disabled={isProcessing}
                  className="relative p-6 rounded-full bg-neutral-800 hover:bg-neutral-700 border-2 border-emerald-500/80 text-white shadow-xl hover:scale-105 transition-all cursor-pointer group ring-4 ring-emerald-500/20 disabled:opacity-50"
                  title="Start Continuous Recording"
                >
                  <Mic className="w-9 h-9 text-emerald-400 group-hover:scale-110 transition-transform" />
                </button>

                <span className="text-xs font-bold mt-3 text-white">
                  Click to Start Recording
                </span>

              </div>
            )}

            <span className="text-[11px] text-neutral-300 mt-2 text-center max-w-md font-medium">
              {micStatusText}
            </span>

          </div>

          {/* Transcript */}
          <div>

            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">

              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Accumulated Spoken Transcript:</span>
              </span>

              {transcript && (
                <button
                  type="button"
                  onClick={clearTranscript}
                  disabled={isListening}
                  className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw className="w-3 h-3" />
                  Clear Transcript
                </button>
              )}

            </div>

            <textarea
              rows={3}
              value={transcript}
              onChange={(event) => {
                setTranscript(event.target.value);
                accumulatedTranscriptRef.current = event.target.value;
              }}
              placeholder="Spoken words will appear here... Speak customer name, mobile number, weight, cardio or non-cardio, and payment details."
              className="w-full bg-[#1e232b] border border-neutral-700 text-white placeholder-neutral-500 rounded-xl p-3 text-sm focus:outline-none focus:border-neutral-500 leading-relaxed font-sans"
            />

          </div>

          {/* Speaking format */}
          <div className="bg-[#1a1f27] border border-neutral-800 rounded-xl p-3.5 space-y-1.5 text-xs text-neutral-300">

            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block">
              Recommended Voice Speaking Format:
            </span>

            <p className="text-neutral-400 leading-relaxed">
              Speak clearly in one or multiple sentences:
              <br />

              <span className="text-emerald-400 font-medium">
                "Register [Name], weight [X] kg, mobile number [10 digits], [cardio / non-cardio] membership, paid [amount] rupees via [Cash / UPI / Card] on [Date]."
              </span>
            </p>

          </div>

        </div>

        {/* Footer buttons */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center gap-3">

          <button
            type="button"
            onClick={closeModal}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
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
