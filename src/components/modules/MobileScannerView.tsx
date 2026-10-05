import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  Zap,
  ZapOff,
  CheckCircle2,
  Smartphone,
  Send,
  Volume2,
  VolumeX,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { sendRemoteBarcode } from '../../services/firebase';

interface MobileScannerViewProps {
  sessionId: string;
  onExit?: () => void;
}

export const MobileScannerView: React.FC<MobileScannerViewProps> = ({
  sessionId,
  onExit,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScanned, setLastScanned] = useState<{ code: string; time: string } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [sentCount, setSentCount] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'mobile-remote-scanner-viewfinder';

  // Sonido de confirmación en el celular
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio no disponible
    }
  }, [soundEnabled]);

  const triggerVibrate = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch {
        // Vibración no disponible
      }
    }
  }, []);

  const sendBarcodeToComputer = useCallback(
    async (code: string) => {
      const clean = code.trim();
      if (!clean) return;

      playBeep();
      triggerVibrate();

      const timeStr = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastScanned({ code: clean, time: timeStr });
      setSentCount((prev) => prev + 1);

      // 1. Enviar vía Firestore
      await sendRemoteBarcode(sessionId, clean);

      // 2. Enviar vía BroadcastChannel
      try {
        const bc = new BroadcastChannel(`remote_scanner_${sessionId.toLowerCase()}`);
        bc.postMessage({ barcode: clean, timestamp: Date.now() });
        bc.close();
      } catch {
        // BroadcastChannel no soportado
      }

      // 3. Enviar vía localStorage
      try {
        localStorage.setItem(
          `remote_scan_event_${sessionId.toLowerCase()}`,
          JSON.stringify({ barcode: clean, timestamp: Date.now() })
        );
      } catch {
        // Storage no disponible
      }
    },
    [sessionId, playBeep, triggerVibrate]
  );

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error al detener escáner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    try {
      setErrorMsg(null);
      await stopScanner();

      const element = document.getElementById(containerId);
      if (!element) {
        setTimeout(startScanner, 200);
        return;
      }

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const scanConfig = {
        fps: 15,
        qrbox: (viewWidth: number, viewHeight: number) => {
          const minEdge = Math.min(viewWidth, viewHeight);
          const boxW = Math.floor(minEdge * 0.8);
          const boxH = Math.floor(boxW * 0.65);
          return { width: Math.max(260, boxW), height: Math.max(160, boxH) };
        },
        aspectRatio: 1.333,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        scanConfig,
        (decodedText) => {
          sendBarcodeToComputer(decodedText);
        },
        () => {}
      );

      setIsScanning(true);

      // Comprobar soporte linterna
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const track = (html5QrCode as any).localMediaStream?.getVideoTracks()?.[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const caps = track?.getCapabilities?.() as any;
        if (caps && 'torch' in caps) {
          setTorchSupported(true);
        }
      } catch {
        setTorchSupported(false);
      }
    } catch (err: unknown) {
      const isPermissionDenied =
        (err instanceof Error &&
          (err.name === 'NotAllowedError' ||
            err.message.includes('Permission denied') ||
            err.message.includes('NotAllowedError'))) ||
        String(err).includes('Permission denied') ||
        String(err).includes('NotAllowedError');

      if (isPermissionDenied) {
        console.info('Permiso de cámara no autorizado en el teléfono.');
      } else {
        console.warn('Error iniciando escáner:', err);
      }

      setErrorMsg(
        isPermissionDenied
          ? 'Permiso de cámara no otorgado. Habilite el acceso a la cámara en el navegador de su teléfono para escanear.'
          : err instanceof Error
          ? err.message
          : 'No se pudo acceder a la cámara del teléfono.'
      );
      setIsScanning(false);
    }
  }, [sendBarcodeToComputer, stopScanner]);

  const toggleTorch = async () => {
    try {
      if (!scannerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const track = (scannerRef.current as any).localMediaStream?.getVideoTracks()?.[0];
      if (track) {
        const next = !torchOn;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({ advanced: [{ torch: next }] as any });
        setTorchOn(next);
      }
    } catch (e) {
      console.warn('Error alternando linterna:', e);
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none">
      {/* Barra superior de estado */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider text-white">
              VARIEDADES CS · Escáner Remoto
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sesión: {sessionId.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                torchOn ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {torchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </header>

      {/* Visor de Cámara */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Guía de lectura */}
        {isScanning && !errorMsg && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
            <div className="relative w-72 h-44 border-2 border-emerald-400 rounded-2xl shadow-[0_0_25px_rgba(52,211,153,0.35)] flex items-center justify-center">
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse shadow-[0_0_10px_#ef4444]" />
            </div>
            <p className="mt-4 px-3 py-1 bg-slate-900/80 rounded-full text-xs text-slate-200 backdrop-blur-xs font-medium">
              Apunte hacia el código del producto
            </p>
          </div>
        )}

        {/* Notificación de escaneo exitoso transmitido a la computadora */}
        {lastScanned && (
          <div className="absolute top-4 left-4 right-4 bg-emerald-600/95 backdrop-blur-xs text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center justify-between border border-emerald-400/40">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <div>
                <div className="text-[11px] font-medium text-emerald-100">
                  ¡Enviado a la Computadora!
                </div>
                <div className="text-xs font-mono font-bold">{lastScanned.code}</div>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-emerald-800/80 px-2 py-0.5 rounded">
              {lastScanned.time}
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Permiso de Cámara Requerido</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-xs">{errorMsg}</p>
            <button
              type="button"
              onClick={startScanner}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        )}
      </div>

      {/* Barra inferior: Entrada manual de respaldo y estadísticas */}
      <footer className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode.trim()) {
              sendBarcodeToComputer(manualCode.trim());
              setManualCode('');
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="O teclee el código de barras..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500 placeholder-slate-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar</span>
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Escaneados en esta sesión: <strong className="text-white">{sentCount}</strong></span>
          <span className="text-emerald-400 font-medium">● Conectado a la Caja</span>
        </div>
      </footer>
    </div>
  );
};
