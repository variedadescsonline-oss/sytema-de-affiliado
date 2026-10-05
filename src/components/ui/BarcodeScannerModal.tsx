import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, Zap, ZapOff, Check, AlertCircle, Volume2, VolumeX } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
  continuous?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras con la Cámara',
  subtitle = 'Apunte la cámara del teléfono hacia el código de barras o código QR del producto.',
  continuous = false,
}) => {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-scanner-viewfinder';

  // Sonido de confirmación con Web Audio API (funciona offline en cualquier celular)
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, audioCtx.currentTime); // 1760 Hz (A6)
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
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
        navigator.vibrate([100, 50, 100]);
      } catch {
        // Vibración no disponible
      }
    }
  }, []);

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

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      const cleanCode = decodedText.trim();
      if (!cleanCode) return;

      playBeep();
      triggerVibrate();
      setLastScannedCode(cleanCode);

      onScan(cleanCode);

      if (!continuous) {
        stopScanner().then(() => {
          onClose();
        });
      }
    },
    [continuous, onScan, onClose, playBeep, triggerVibrate, stopScanner]
  );

  const startScanner = useCallback(
    async (cameraId?: string) => {
      try {
        setErrorMsg(null);
        await stopScanner();

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

        // Configuración de escaneo para máxima respuesta en teléfonos móviles
        const scanConfig = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdgePercentage = 0.75;
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxWidth = Math.floor(minEdgeSize * minEdgePercentage);
            const qrboxHeight = Math.floor(qrboxWidth * 0.6); // Formato rectangular ideal para códigos de barras 1D
            return {
              width: Math.max(250, qrboxWidth),
              height: Math.max(140, qrboxHeight),
            };
          },
          aspectRatio: 1.333,
        };

        const cameraToUse = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: 'environment' }; // Preferir cámara trasera en teléfonos

        await html5QrCode.start(cameraToUse, scanConfig, handleScanSuccess, () => {
          // Frame sin código detectado, continuar
        });

        setIsScanning(true);

        // Verificar si la linterna (torch) está soportada en el track
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const track = (html5QrCode as any).localMediaStream?.getVideoTracks()?.[0];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const capabilities = track?.getCapabilities?.() as any;
          if (capabilities && 'torch' in capabilities) {
            setTorchSupported(true);
          } else {
            setTorchSupported(false);
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
          console.info('Permiso de cámara no autorizado en el navegador.');
        } else {
          console.warn('No se pudo inicializar la cámara:', err);
        }

        const errMsg =
          err instanceof Error
            ? err.message
            : 'No se pudo acceder a la cámara. Verifique los permisos del navegador.';
        setErrorMsg(
          isPermissionDenied
            ? 'Acceso a la cámara bloqueado o no concedido por el navegador. Conceda permiso a la cámara o ingrese el código manualmente.'
            : errMsg.includes('NotFound')
            ? 'No se detectó ninguna cámara disponible en el dispositivo.'
            : `No se pudo iniciar la cámara: ${errMsg}`
        );
        setIsScanning(false);
      }
    },
    [handleScanSuccess, stopScanner]
  );

  // Alternar linterna (Flash)
  const toggleTorch = async () => {
    try {
      if (!scannerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const track = (scannerRef.current as any).localMediaStream?.getVideoTracks()?.[0];
      if (track) {
        const nextState = !torchOn;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({ advanced: [{ torch: nextState }] as any });
        setTorchOn(nextState);
      }
    } catch (e) {
      console.warn('Error alternando linterna:', e);
    }
  };

  // Alternar entre cámaras (trasera / delantera)
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex];
    if (nextCam) {
      setSelectedCameraId(nextCam.id);
      startScanner(nextCam.id);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setLastScannedCode(null);
      setErrorMsg(null);
      return;
    }

    // Enumerar cámaras del dispositivo al abrir el modal
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const list = devices.map((d) => ({ id: d.id, label: d.label || `Cámara ${d.id}` }));
          setCameras(list);
          // Buscar cámara trasera por defecto
          const backCam = list.find(
            (c) =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('trasera') ||
              c.label.toLowerCase().includes('environment')
          );
          const initialId = backCam?.id || list[0].id;
          setSelectedCameraId(initialId);
          startScanner(initialId);
        } else {
          startScanner();
        }
      })
      .catch(() => {
        startScanner();
      });

    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera del Escáner */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenedor del Visor de la Cámara */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] overflow-hidden">
          <div id={containerId} className="w-full h-full object-cover" />

          {/* Guía visual y mira láser */}
          {isScanning && !errorMsg && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Marco visor */}
              <div className="relative w-64 h-36 border-2 border-emerald-400/80 rounded-xl shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center">
                {/* Esquinas destacadas */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                {/* Línea láser animada */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse shadow-[0_0_8px_#ef4444]" />
              </div>
              <p className="text-white text-xs mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs font-medium">
                Alinee el código dentro del recuadro
              </p>
            </div>
          )}

          {/* Mensaje de error / Ayuda de permisos */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-white font-medium text-sm mb-1">No se pudo acceder a la cámara</h4>
              <p className="text-slate-400 text-xs mb-4 max-w-xs">{errorMsg}</p>
              <button
                type="button"
                onClick={() => startScanner(selectedCameraId)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar conexión
              </button>
            </div>
          )}

          {/* Notificación de último código escaneado */}
          {lastScannedCode && (
            <div className="absolute top-3 left-3 right-3 bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-lg flex items-center justify-between">
              <span className="flex items-center gap-1.5 truncate">
                <Check className="w-4 h-4" /> Escaneado: {lastScannedCode}
              </span>
              <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded font-mono">OK</span>
            </div>
          )}
        </div>

        {/* Barra de Controles Rápidos (Luz, Cambiar Cámara, Silencio) */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-slate-300">
          <div className="flex items-center gap-2">
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  torchOn ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Encender o apagar flash/linterna"
              >
                {torchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                <span className="hidden sm:inline">{torchOn ? 'Linterna ON' : 'Linterna'}</span>
              </button>
            )}

            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5"
                title="Cambiar entre cámara trasera y delantera"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Cambiar Cámara</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            {cameras.length > 0 ? `${cameras.length} cámara(s)` : 'Cámara activa'}
          </span>
        </div>

        {/* Entrada Manual de Respaldo */}
        <div className="p-3 bg-slate-900 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) {
                handleScanSuccess(manualCode.trim());
                setManualCode('');
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="O teclee el código de barras aquí..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500 font-mono"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shrink-0"
            >
              Aceptar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
