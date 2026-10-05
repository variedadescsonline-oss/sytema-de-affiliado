import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  X,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Volume2,
  VolumeX,
  Send,
  Zap,
} from 'lucide-react';
import { subscribeRemoteScanner, sendRemoteBarcode } from '../../services/firebase';

interface RemoteScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  sessionId: string;
}

export const RemoteScannerModal: React.FC<RemoteScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  sessionId,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [recentScans, setRecentScans] = useState<{ code: string; time: string }[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [testInput, setTestInput] = useState('');
  const [lastReceivedCode, setLastReceivedCode] = useState<string | null>(null);

  const cleanSession = sessionId.trim().toLowerCase();
  const mobileUrl = `${window.location.origin}${window.location.pathname}?scannerSession=${cleanSession}`;

  // Reproducir sonido en la computadora al recibir código del celular
  const playDesktopChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1); // E6
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {
      // Audio no disponible
    }
  }, [soundEnabled]);

  const handleIncomingBarcode = useCallback(
    (code: string) => {
      const clean = code.trim();
      if (!clean) return;

      playDesktopChime();
      setLastReceivedCode(clean);

      const timeStr = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setRecentScans((prev) => [{ code: clean, time: timeStr }, ...prev.slice(0, 7)]);
      onScan(clean);
    },
    [onScan, playDesktopChime]
  );

  // Generar QR Code al abrir
  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(mobileUrl, {
        width: 260,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generando QR:', err));
    }
  }, [isOpen, mobileUrl]);

  // Suscribirse a Firestore + BroadcastChannel + LocalStorage
  useEffect(() => {
    if (!isOpen) return;

    // 1. Escuchar Firestore
    const unsubscribeFirestore = subscribeRemoteScanner(cleanSession, (barcode) => {
      handleIncomingBarcode(barcode);
    });

    // 2. Escuchar BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`remote_scanner_${cleanSession}`);
      bc.onmessage = (event) => {
        if (event.data?.barcode) {
          handleIncomingBarcode(event.data.barcode);
        }
      };
    } catch {
      // BroadcastChannel no soportado
    }

    // 3. Escuchar storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `remote_scan_event_${cleanSession}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.barcode) {
            handleIncomingBarcode(parsed.barcode);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubscribeFirestore();
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [isOpen, cleanSession, handleIncomingBarcode]);

  const copyLink = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (testInput.trim()) {
      sendRemoteBarcode(cleanSession, testInput.trim());
      handleIncomingBarcode(testInput.trim());
      setTestInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs text-white border border-white/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>Escáner Remoto desde Teléfono Móvil</span>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500 text-white font-bold rounded-full animate-pulse">
                  EN VIVO
                </span>
              </h3>
              <p className="text-[11px] text-blue-100">
                Convierta la cámara de su teléfono en una lectora de códigos de barras inalámbrica
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          {/* Instrucciones y QR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Código QR */}
            <div className="flex flex-col items-center justify-center bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR para Escáner Móvil"
                  className="w-44 h-44 object-contain rounded"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                  Generando QR...
                </div>
              )}
              <span className="text-[11px] font-mono text-slate-600 font-bold mt-1">
                Sesión: {sessionId.toUpperCase()}
              </span>
            </div>

            {/* Pasos */}
            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>¿Cómo funciona?</span>
              </div>
              <ol className="space-y-2 list-decimal list-inside text-[11.5px] text-slate-600">
                <li>
                  Abra la <strong>cámara de su celular</strong> y apunte al código QR.
                </li>
                <li>
                  Toque la notificación amarilla para abrir la pantalla de escaneo.
                </li>
                <li>
                  Apunte la cámara a cualquier <strong>código de barras</strong>.
                </li>
                <li>
                  ¡Listo! El producto se <strong>agrega automáticamente</strong> aquí en tiempo real.
                </li>
              </ol>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={copyLink}
                  className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">¡Enlace Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar Enlace para Teléfono</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Último código recibido */}
          {lastReceivedCode && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-[11px] font-medium text-emerald-700">
                    ¡Código detectado desde el teléfono!
                  </div>
                  <div className="text-sm font-mono font-bold">{lastReceivedCode}</div>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-mono">
                Agregado al carrito
              </span>
            </div>
          )}

          {/* Historial de lecturas de esta sesión */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700">
                Códigos Recibidos de la Sesión ({recentScans.length})
              </span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                title="Sonido de confirmación en computadora"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sonido activado</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span>Silenciado</span>
                  </>
                )}
              </button>
            </div>

            <div className="max-h-28 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-2 divide-y divide-slate-200/60">
              {recentScans.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  Esperando el primer escaneo desde el teléfono...
                </div>
              ) : (
                recentScans.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 text-xs">
                    <span className="font-mono font-bold text-slate-800">{item.code}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Simulación directa / prueba manual */}
          <div className="pt-2 border-t border-slate-100">
            <form onSubmit={handleSimulateScan} className="flex gap-2">
              <input
                type="text"
                placeholder="Probar recepción tecleando código..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-blue-600"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Simular</span>
              </button>
            </form>
          </div>
        </div>

        {/* Pie */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href={mobileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1"
          >
            <span>Abrir en nueva pestaña</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
