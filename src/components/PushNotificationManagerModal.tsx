import { sendFCMTestNotification } from '../services/api.ts';
import React, { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, X, CheckCircle, AlertTriangle, Send, RefreshCw, Smartphone, ShieldCheck, Laptop } from 'lucide-react';
import {
  getPushStatus,
  subscribeDeviceToPush,
  subscribeAndroidToPush,
  unsubscribeDeviceFromPush,
  sendTestNotification,
  triggerRenewalCheckAndNotify,
  PushStatus,
} from '../services/pushNotifications.ts';

import { Capacitor } from '@capacitor/core';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: PushStatus) => void;
}

export const PushNotificationManagerModal: React.FC<Props> = ({ isOpen, onClose, onStatusChange }) => {
  const [status, setStatus] = useState<PushStatus>({
    supported: true,
    permission: 'default',
    subscribed: false,
    registration: null,
    subscription: null,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const refreshStatus = async () => {
    const s = await getPushStatus();
    setStatus(s);
    if (onStatusChange) onStatusChange(s);
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSubscription = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (status.subscribed) {
        const res = await unsubscribeDeviceFromPush();
        if (res.success) {
          setMessage({ text: 'Device notifications disabled.', type: 'info' });
        } else {
          setMessage({ text: res.message, type: 'error' });
        }
      } else {
const res = Capacitor.isNativePlatform()
  ? await subscribeAndroidToPush()
  : await subscribeDeviceToPush();
        if (res.success) {
          setMessage({ text: res.message, type: 'success' });
        } else {
          setMessage({ text: res.message, type: 'error' });
        }
      }
      await refreshStatus();
    } catch (err: any) {
      setMessage({ text: err.message || 'Operation failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
  setLoading(true);
  setMessage(null);

  try {
    if (Capacitor.isNativePlatform()) {
      // Android: Send test notification through Firebase FCM
      const res = await sendFCMTestNotification();

      if (res.success) {
        setMessage({
          text: `Firebase test notification sent to ${res.sent ?? 0} Android device(s). Check your notification tray.`,
          type: 'success',
        });
      } else {
        setMessage({
          text: 'Firebase test notification could not be delivered.',
          type: 'error',
        });
      }
    } else {
      // Browser: Use existing Web Push notification
      const res = await sendTestNotification();

      if (res.success) {
        setMessage({
          text: 'Outside-app test notification sent! Look for the popup on your desktop/mobile screen.',
          type: 'success',
        });
      } else {
        setMessage({
          text: res.message,
          type: 'error',
        });
      }
    }
  } catch (err: any) {
    setMessage({
      text: err.message || 'Failed to dispatch test notification.',
      type: 'error',
    });
  } finally {
    setLoading(false);
  }
};
  const handleTriggerEvaluation = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await triggerRenewalCheckAndNotify();
      setMessage({
        text: res.message,
        type: res.triggered ? 'success' : 'info',
      });
    } catch (err: any) {
      setMessage({ text: err.message || 'Evaluation failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#161a20] border border-neutral-700/80 rounded-2xl shadow-2xl p-6 text-neutral-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-neutral-800">
          <div className="p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white">
            <BellRing className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Outside-App Push Notifications
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Receive device popups even when VeeraGym is closed
            </p>
          </div>
        </div>

        {/* Status Card */}
        <div className="p-4 rounded-xl bg-[#1d222b] border border-neutral-800 space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-neutral-400" />
              <span>Current Device Status</span>
            </span>
            {status.subscribed ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Subscribed & Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                <span className="w-2 h-2 rounded-full bg-neutral-500" />
                Inactive / Disabled
              </span>
            )}
          </div>

          <div className="text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/80 pt-2.5">
            {status.subscribed ? (
              <p>
                This device is registered to receive background push notifications. When any member's renewal date is approaching (within 2 days), you will get an outside-app popup displaying customer name, renewal date, amount due, and days remaining.
              </p>
            ) : (
              <p>
                Enable device notifications to receive alerts 2 days before member renewals even when the browser or VeeraGym window is closed.
              </p>
            )}
          </div>
        </div>

        {/* Feedback message banner */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-600/40'
                : message.type === 'error'
                ? 'bg-red-950/40 text-red-300 border border-red-600/40'
                : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            )}
            <span className="flex-1 leading-normal">{message.text}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleToggleSubscription}
            className={`w-full py-3 px-4 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              status.subscribed
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-lg shadow-emerald-500/20'
            }`}
          >
            {status.subscribed ? (
              <>
                <BellOff className="w-4 h-4 text-neutral-400" />
                <span>Disable Outside-App Notifications on this Device</span>
              </>
            ) : (
              <>
                <BellRing className="w-4 h-4" />
                <span>Enable Outside-App Notifications on this Device</span>
              </>
            )}
          </button>

          {status.subscribed && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleSendTest}
                className="py-2.5 px-3 bg-[#202631] hover:bg-[#28303e] text-white border border-neutral-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Send Test Popup</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleTriggerEvaluation}
                className="py-2.5 px-3 bg-[#202631] hover:bg-[#28303e] text-white border border-neutral-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
                <span>Check 2-Day Renewals</span>
              </button>
            </div>
          )}
        </div>

        {/* Safety & Compliance Notice */}
        <div className="mt-5 pt-4 border-t border-neutral-800 text-[11px] text-neutral-400 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strict Privacy & Approval Policy</span>
          </div>
          <p>
            VeeraGym will <strong>never</strong> send any WhatsApp messages automatically. Clicking the notification opens VeeraGym directly to the draft approval entry so you can inspect and approve it first.
          </p>
        </div>
      </div>
    </div>
  );
};
