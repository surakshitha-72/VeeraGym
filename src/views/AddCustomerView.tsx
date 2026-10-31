import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Mic, CheckCircle, AlertCircle, IndianRupee, Sparkles, Scale, Phone, User, Calendar, CreditCard, FileText, Play, RefreshCw, Square } from 'lucide-react';
import { CustomerCategory, PaymentMethod } from '../types.ts';
import { createCustomer, parseVoiceTranscript } from '../services/api.ts';

interface Props {
  onSuccess: (newCustomerId: string, category: CustomerCategory) => void;
  onOpenVoiceModal: () => void;
  prefilledData?: any;
}

export const AddCustomerView: React.FC<Props> = ({
  onSuccess,
  onOpenVoiceModal,
  prefilledData,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('70');
  const [category, setCategory] = useState<CustomerCategory>('non-cardio');
  const [joiningDate, setJoiningDate] = useState<string>(today);
  const [hasFirstPayment, setHasFirstPayment] = useState<boolean>(true);
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>(today);
  const [amountPaid, setAmountPaid] = useState<number>(600);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI / GPay / PhonePe');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Inline continuous voice assistant state
  const [inlineListening, setInlineListening] = useState<boolean>(false);
  const [inlineTranscript, setInlineTranscript] = useState<string>('');
  const [inlineParsing, setInlineParsing] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [inlineTimerSeconds, setInlineTimerSeconds] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const inlineExplicitlyRecordingRef = useRef<boolean>(false);
  const accumulatedInlineTranscriptRef = useRef<string>('');
  const inlineTimerIntervalRef = useRef<any>(null);

  // Timer for inline recording
  useEffect(() => {
    if (inlineListening) {
      setInlineTimerSeconds(0);
      inlineTimerIntervalRef.current = setInterval(() => {
        setInlineTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (inlineTimerIntervalRef.current) {
        clearInterval(inlineTimerIntervalRef.current);
        inlineTimerIntervalRef.current = null;
      }
    }

    return () => {
      if (inlineTimerIntervalRef.current) {
        clearInterval(inlineTimerIntervalRef.current);
      }
    };
  }, [inlineListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      inlineExplicitlyRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  // Sync fields whenever prefilledData arrives
  useEffect(() => {
    if (prefilledData) {
      if (prefilledData.name) setName(prefilledData.name);
      if (prefilledData.phone) setPhone(prefilledData.phone);
      if (prefilledData.weightKg) setWeightKg(String(prefilledData.weightKg));
      if (prefilledData.category) {
        setCategory(prefilledData.category);
        setAmountPaid(prefilledData.amountPaid || (prefilledData.category === 'cardio' ? 1000 : 600));
      }
      if (prefilledData.joiningDate) setJoiningDate(prefilledData.joiningDate);
      if (prefilledData.firstPaymentDate) {
        setFirstPaymentDate(prefilledData.firstPaymentDate);
        setHasFirstPayment(true);
      }
      if (prefilledData.amountPaid !== undefined) {
        setAmountPaid(prefilledData.amountPaid);
        setHasFirstPayment(true);
      }
      if (prefilledData.paymentMethod) setPaymentMethod(prefilledData.paymentMethod);
      if (prefilledData.notes) setNotes(prefilledData.notes);
      setVoiceNotice('Voice details extracted and populated below! Please review and confirm.');
    }
  }, [prefilledData]);

  // Sync fee when category changes manually
  const handleCategoryChange = (newCat: CustomerCategory) => {
    setCategory(newCat);
    setAmountPaid(newCat === 'cardio' ? 1000 : 600);
  };

  // Continuous speech recognition engine that only stops when user clicks Stop
  const createInlineRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setInlineListening(true);
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
          accumulatedInlineTranscriptRef.current +=
            (accumulatedInlineTranscriptRef.current ? ' ' : '') + finals.trim();
        }

        const full = (
          accumulatedInlineTranscriptRef.current + (interim ? ' ' + interim : '')
        ).trim();

        if (full) {
          setInlineTranscript(full);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Inline mic notice:', event.error);
        if (event.error === 'not-allowed') {
          inlineExplicitlyRecordingRef.current = false;
          setInlineListening(false);
          setError('Microphone permission blocked. Please allow microphone in browser or type details.');
        }
      };

      // Restart automatically if browser prematurely ends session while user is still recording!
      recognition.onend = () => {
        if (inlineExplicitlyRecordingRef.current) {
          try {
            recognition.start();
          } catch (_) {
            setTimeout(() => {
              if (inlineExplicitlyRecordingRef.current) {
                try {
                  recognition.start();
                } catch (e) {
                  console.warn('Inline auto-restart retry error:', e);
                }
              }
            }, 100);
          }
        } else {
          setInlineListening(false);
        }
      };

      return recognition;
    } catch (e) {
      console.error('Speech recognition creation error:', e);
      return null;
    }
  };

  const startInlineSpeech = async () => {
    setError(null);
    setVoiceNotice(null);
    accumulatedInlineTranscriptRef.current = inlineTranscript.trim();

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
      }
    } catch (_) {}

    const recognition = createInlineRecognition();
    if (!recognition) {
      setError('Speech recognition is not supported in this browser. Please type into the voice box or click a sample.');
      return;
    }

    recognitionRef.current = recognition;
    inlineExplicitlyRecordingRef.current = true;

    try {
      recognition.start();
    } catch (err: any) {
      console.warn('Inline recognition error:', err);
      setInlineListening(true);
    }
  };

  const stopInlineSpeech = () => {
    inlineExplicitlyRecordingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setInlineListening(false);
  };

  const handleParseAndPopulate = async (textToParse?: string) => {
    const text = (textToParse || inlineTranscript).trim();
    if (!text) {
      setError('Please speak or type customer details into the voice box first.');
      return;
    }

    stopInlineSpeech();
    setError(null);
    setInlineParsing(true);

    try {
      const data = await parseVoiceTranscript(text);
      if (data.name) setName(data.name);
      if (data.phone) setPhone(data.phone);
      if (data.weightKg) setWeightKg(String(data.weightKg));
      if (data.category) {
        setCategory(data.category);
        setAmountPaid(data.amountPaid || (data.category === 'cardio' ? 1000 : 600));
      }
      if (data.joiningDate) setJoiningDate(data.joiningDate);
      if (data.firstPaymentDate) {
        setFirstPaymentDate(data.firstPaymentDate);
        setHasFirstPayment(true);
      }
      if (data.amountPaid !== undefined) {
        setAmountPaid(data.amountPaid);
        setHasFirstPayment(true);
      }
      if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
      if (data.notes) setNotes(data.notes);

      setInlineParsing(false);
      setVoiceNotice(`Extracted: ${data.name} · ${data.category === 'cardio' ? 'Cardio (₹1,000)' : 'Non-Cardio (₹600)'} · Phone: ${data.phone}`);
    } catch (err: any) {
      setInlineParsing(false);
      setError(err.message || 'Could not parse voice information. Please enter details manually.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        weightKg: Number(weightKg) || 0,
        category,
        joiningDate,
        firstPaymentDate: hasFirstPayment ? firstPaymentDate : undefined,
        amountPaid: hasFirstPayment ? amountPaid : undefined,
        paymentMethod: hasFirstPayment ? paymentMethod : undefined,
        notes: notes.trim() || undefined,
      });

      setIsSubmitting(false);
      onSuccess(result.customer.id, result.customer.category);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to register customer');
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title & Voice Button Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Add Customer Registration</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Enroll a new gym member via continuous voice recording or manual form entry.
          </p>
        </div>

        {/* Dedicated Voice Button */}
        <button
          type="button"
          onClick={onOpenVoiceModal}
          className="py-2.5 px-4 bg-gradient-to-r from-neutral-800 to-neutral-700 hover:from-neutral-700 hover:to-neutral-600 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 border border-neutral-600 shadow-md cursor-pointer self-start sm:self-auto group"
        >
          <Mic className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Open Full Voice Dialog</span>
        </button>
      </div>

      {/* Continuous Inline Voice Dictation Assistant Card */}
      <div className={`p-5 rounded-2xl border-2 shadow-xl space-y-4 transition-all ${
        inlineListening
          ? 'bg-red-950/20 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
          : 'bg-gradient-to-br from-[#181d24] to-[#14171d] border-emerald-500/30'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border transition-colors ${
              inlineListening
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Continuous Voice Dictation
                </h3>
                {inlineListening && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    LIVE: {formatTimer(inlineTimerSeconds)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                {inlineListening
                  ? 'Recording continuously until you click Stop below. Speak at your own pace.'
                  : 'Click "Start Recording" to speak — it will NOT stop on pauses until you click Stop.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {inlineListening ? (
              <button
                type="button"
                onClick={stopInlineSpeech}
                className="py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg bg-red-600 hover:bg-red-500 text-white animate-pulse ring-4 ring-red-500/30"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop Recording</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startInlineSpeech}
                className="py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md bg-emerald-500 hover:bg-emerald-400 text-neutral-950 hover:scale-105"
              >
                <Mic className="w-4 h-4 text-neutral-950" />
                <span>Start Recording</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Transcript Box */}
        <div className="space-y-2">
          <div className="relative">
            <textarea
              rows={2}
              value={inlineTranscript}
              onChange={(e) => {
                setInlineTranscript(e.target.value);
                accumulatedInlineTranscriptRef.current = e.target.value;
              }}
              placeholder='Spoken words will continuously accumulate here until you click Stop... (e.g. "Add Rahul Kumar, weight 72 kilograms, mobile number 9876543210, non-cardio membership, paid 600 rupees on 15th October 2026.")'
              className="w-full bg-[#12151b] border border-neutral-700/80 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Quick Test Samples */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-neutral-400 font-semibold mr-1">Quick Test Prompts:</span>
              <button
                type="button"
                onClick={() => {
                  stopInlineSpeech();
                  const s = 'Add Rahul Kumar, weight 72 kilograms, mobile number 9876543210, non-cardio membership, paid 600 rupees on 15th October 2026.';
                  accumulatedInlineTranscriptRef.current = s;
                  setInlineTranscript(s);
                  handleParseAndPopulate(s);
                }}
                className="py-1 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                + Rahul Kumar (Non-Cardio ₹600)
              </button>
              <button
                type="button"
                onClick={() => {
                  stopInlineSpeech();
                  const s = 'Register Priya Sharma, weight 58 kg, phone 9711234567, cardio membership 1000 rupees paid via UPI on 25th October 2026.';
                  accumulatedInlineTranscriptRef.current = s;
                  setInlineTranscript(s);
                  handleParseAndPopulate(s);
                }}
                className="py-1 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                + Priya Sharma (Cardio ₹1,000)
              </button>
            </div>

            {/* Populate & Clear Buttons */}
            <div className="flex items-center gap-2">
              {inlineTranscript && (
                <button
                  type="button"
                  onClick={() => {
                    accumulatedInlineTranscriptRef.current = '';
                    setInlineTranscript('');
                  }}
                  className="py-1.5 px-2.5 text-neutral-400 hover:text-white text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
              <button
                type="button"
                disabled={inlineParsing || !inlineTranscript.trim()}
                onClick={() => handleParseAndPopulate()}
                className="py-1.5 px-3.5 bg-white hover:bg-neutral-100 text-neutral-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-neutral-950" />
                <span>{inlineParsing ? 'Processing...' : 'Auto-Fill Form'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {voiceNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{voiceNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceNotice(null)}
            className="text-emerald-400 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-900/30 border border-red-700/60 text-red-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="rounded-xl bg-[#161a21]/95 border border-neutral-800 p-6 shadow-xl space-y-5">
        {/* Section 1: Member Info */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4 pb-2 border-b border-neutral-800">
            1. Customer Personal Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Customer Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1e232b] border border-neutral-700 text-white placeholder-neutral-500 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Mobile Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#1e232b] border border-neutral-700 text-white placeholder-neutral-500 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-neutral-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Body Weight (kg)
              </label>
              <div className="relative">
                <Scale className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="number"
                  step="0.5"
                  min={20}
                  max={300}
                  required
                  placeholder="72"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full bg-[#1e232b] border border-neutral-700 text-white placeholder-neutral-500 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-neutral-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Joining Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full bg-[#1e232b] border border-neutral-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-neutral-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Membership Type */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4 pb-2 border-b border-neutral-800">
            2. Membership Type & Fee Calculation
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleCategoryChange('non-cardio')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                category === 'non-cardio'
                  ? 'bg-neutral-800/90 text-white border-neutral-400 shadow-md ring-1 ring-neutral-400'
                  : 'bg-[#1e232b] text-neutral-400 border-neutral-700/60 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-base text-white">Non-Cardio</span>
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 font-mono">
                  Standard
                </span>
              </div>
              <p className="text-xs text-neutral-400">Gym weights, strength machines, floor exercises</p>
              <div className="mt-3 text-xl font-extrabold text-white font-mono tabular-nums">
                ₹600 <span className="text-xs font-normal text-neutral-400">/ month</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryChange('cardio')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                category === 'cardio'
                  ? 'bg-neutral-800/90 text-white border-neutral-400 shadow-md ring-1 ring-neutral-400'
                  : 'bg-[#1e232b] text-neutral-400 border-neutral-700/60 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-base text-white">Cardio</span>
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 font-mono">
                  Full Access
                </span>
              </div>
              <p className="text-xs text-neutral-400">Treadmill, spin bikes, elliptical + complete gym</p>
              <div className="mt-3 text-xl font-extrabold text-white font-mono tabular-nums">
                ₹1,000 <span className="text-xs font-normal text-neutral-400">/ month</span>
              </div>
            </button>
          </div>
        </div>

        {/* Section 3: First Payment Record */}
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              3. First Monthly Payment & Register Initialization
            </h3>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={hasFirstPayment}
                onChange={(e) => setHasFirstPayment(e.target.checked)}
                className="rounded bg-neutral-800 border-neutral-700 text-white focus:ring-0"
              />
              <span>Record initial payment now</span>
            </label>
          </div>

          {hasFirstPayment ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#1e232b]/80 border border-neutral-800">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Amount Received (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-neutral-400 text-sm">₹</span>
                  <input
                    type="number"
                    min={1}
                    required={hasFirstPayment}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full bg-[#161a21] border border-neutral-700 text-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-neutral-500 font-mono tabular-nums font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Payment Date
                </label>
                <input
                  type="date"
                  required={hasFirstPayment}
                  value={firstPaymentDate}
                  onChange={(e) => setFirstPaymentDate(e.target.value)}
                  className="w-full bg-[#161a21] border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-[#161a21] border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                >
                  <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#1e232b]/40 border border-dashed border-neutral-800 text-xs text-neutral-400">
              Customer will be registered with pending payment status for this month.
            </div>
          )}
        </div>

        {/* Section 4: Notes */}
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">
            Additional Notes / Health Background (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Needs posture correction focus, workout time: morning 6am..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[#1e232b] border border-neutral-700 text-white placeholder-neutral-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-white hover:bg-neutral-100 text-neutral-950 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Saving Customer & Initializing Register...</span>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-neutral-950" />
                <span>Confirm & Register Customer</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
