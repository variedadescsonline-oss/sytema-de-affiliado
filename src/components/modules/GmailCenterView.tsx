import React, { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  User,
  FileText,
  ShieldCheck,
  ExternalLink,
  Inbox,
  LogOut,
} from 'lucide-react';
import { sendGmailMessage, getGoogleAccessToken, googleSignIn } from '../../services/firebase';
import { SystemUser, AffiliateOrder } from '../../types/erp';

interface GmailCenterViewProps {
  currentUser: SystemUser;
  recentOrders?: AffiliateOrder[];
}

export const GmailCenterView: React.FC<GmailCenterViewProps> = ({
  currentUser,
  recentOrders = [],
}) => {
  const [recipient, setRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [messageBody, setMessageBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sent messages log stored in session
  const [sentLog, setSentLog] = useState<{ id: string; to: string; subject: string; date: string }[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('variedades_cs_gmail_log') || '[]');
    } catch {
      return [];
    }
  });

  const hasAccessToken = !!getGoogleAccessToken();

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setStatusAlert(null);
    try {
      const res = await googleSignIn({ requestGmailScope: true });
      if (res?.accessToken) {
        setStatusAlert({
          type: 'success',
          message: `¡Conexión establecida con Gmail exitosamente como ${res.user.email}!`,
        });
      }
    } catch (err: unknown) {
      setStatusAlert({
        type: 'error',
        message: 'No se pudo completar la autenticación con Google. Verifique los permisos de ventanas emergentes.',
      });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusAlert(null);
    if (!recipient.trim() || !recipient.includes('@')) {
      setStatusAlert({ type: 'error', message: 'Por favor ingrese una dirección de correo válida.' });
      return;
    }
    if (!subject.trim()) {
      setStatusAlert({ type: 'error', message: 'Por favor complete el asunto del correo.' });
      return;
    }
    if (!messageBody.trim()) {
      setStatusAlert({ type: 'error', message: 'Por favor redacte el cuerpo del mensaje.' });
      return;
    }
    // Open explicit confirmation dialog
    setShowConfirmModal(true);
  };

  const handleExecuteSend = async () => {
    setShowConfirmModal(false);
    setIsSending(true);
    setStatusAlert(null);

    try {
      const formattedHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background-color: #1d4ed8; padding: 20px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">VARIEDADES CS</h2>
              <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 12px;">Comunicaciones Oficiales</p>
            </div>
            <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
              ${messageBody.replace(/\n/g, '<br/>')}
            </div>
            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8;">
              Mensaje enviado por ${currentUser.fullName} (${currentUser.role}) a través de VARIEDADES CS
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await sendGmailMessage(recipient.trim(), subject.trim(), formattedHtml);

      if (result.success) {
        setStatusAlert({
          type: 'success',
          message: `Correo despachado con éxito mediante Gmail a: ${recipient.trim()}`,
        });
        const newLog = [
          {
            id: result.messageId || String(Date.now()),
            to: recipient.trim(),
            subject: subject.trim(),
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...sentLog,
        ];
        setSentLog(newLog);
        try {
          sessionStorage.setItem('variedades_cs_gmail_log', JSON.stringify(newLog.slice(0, 20)));
        } catch {}

        setRecipient('');
        setSubject('');
        setMessageBody('');
      } else {
        if (result.error === 'NO_GOOGLE_TOKEN') {
          setStatusAlert({
            type: 'error',
            message: 'Se requiere autorización de Gmail. Haga clic en "Conectar con Google" para activar el envío.',
          });
        } else {
          setStatusAlert({
            type: 'error',
            message: result.error || 'No se pudo enviar el mensaje a través de Gmail.',
          });
        }
      }
    } catch (err: unknown) {
      setStatusAlert({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error inesperado al despachar el correo.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickTemplate = (order: AffiliateOrder) => {
    setRecipient(order.affiliateEmail || 'cliente@ejemplo.com');
    setSubject(`Información de Pedido #${order.orderNumber} - VARIEDADES CS`);
    setMessageBody(
      `Hola ${order.customerName},\n\nLe confirmamos que su pedido con número #${order.orderNumber} por un valor total de $${order.totalAmount.toFixed(
        2
      )} se encuentra actualmente en estado: "${order.status}".\n\nDirección registrada: ${order.customerAddress}.\n\nCualquier duda o ajuste puede comunicarse directamente con nosotros.\n\nAtentamente,\nEquipo de VARIEDADES CS.`
    );
  };

  return (
    <div className="space-y-6">
      {/* CABECERA GMAIL CENTER */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full uppercase tracking-wider">
              Integración Google Workspace
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-600">Gmail API v1</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Centro de Notificaciones & Gmail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Despache correos oficiales a clientes, afiliados y proveedores directamente desde la cuenta autorizada de Google.
          </p>
        </div>

        {/* ESTADO DE CONEXIÓN GMAIL */}
        <div className="flex items-center gap-3">
          {hasAccessToken ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Gmail Conectado & Listo</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnectGoogle}
              disabled={isConnectingGoogle}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span>{isConnectingGoogle ? 'Conectando...' : 'Conectar con Google'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ALERTA DE ESTADO */}
      {statusAlert && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
            statusAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {statusAlert.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          )}
          <span className="font-medium">{statusAlert.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FORMULARIO DE REDACCIÓN */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Redactar Correo Oficial</h2>
            <p className="text-xs text-slate-500">
              El correo se enviará con el membrete oficial y formato corporativo de VARIEDADES CS.
            </p>
          </div>

          <form onSubmit={handleInitiateSend} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Destinatario (Email) *
              </label>
              <input
                type="email"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="ej: cliente@gmail.com o roques@gmail.com"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Asunto del Correo *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="ej: Notificación de Despacho de Pedido - VARIEDADES CS"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Mensaje / Contenido *
              </label>
              <textarea
                rows={6}
                required
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Escriba aquí los detalles, confirmación de pedido o instrucciones para el destinatario..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-sans leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Correo vía Gmail</span>
            </button>
          </form>
        </div>

        {/* LADO DERECHO: PLANTILLAS RÁPIDAS DE PEDIDOS & HISTORIAL */}
        <div className="lg:col-span-5 space-y-4">
          {/* PLANTILLAS RÁPIDAS BASADAS EN PEDIDOS RECIENTES */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Plantillas Rápidas de Pedidos
            </h3>
            <p className="text-[11px] text-slate-500">
              Haga clic sobre un pedido reciente para autocompletar el correo de notificación.
            </p>

            {recentOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-lg">
                No hay pedidos recientes para generar plantillas.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {recentOrders.slice(0, 5).map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => handleQuickTemplate(ord)}
                    className="p-2 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <strong className="text-blue-700 font-mono">{ord.orderNumber}</strong>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-slate-900 font-medium mt-0.5">Cliente: {ord.customerName}</p>
                    <p className="text-[11px] text-slate-500 truncate">Dir: {ord.customerAddress}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTORIAL DE CORREOS DESPACHADOS EN ESTA SESIÓN */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Envíos Recientes por Gmail
            </h3>

            {sentLog.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-lg">
                No hay correos enviados en esta sesión.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sentLog.map((log) => (
                  <div key={log.id} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">{log.to}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.date}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] truncate">{log.subject}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DIÁLOGO OBLIGATORIO DE CONFIRMACIÓN SEGÚN WORKSPACE SKILL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">¿Confirmar Envío de Correo Electrónico?</h3>
                <p className="text-[11px] text-slate-500">
                  Esta acción enviará un correo oficial a través de la API de Gmail en su nombre.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 text-slate-700">
              <p>
                <strong>Destinatario:</strong> {recipient}
              </p>
              <p>
                <strong>Asunto:</strong> {subject}
              </p>
              <p className="text-[11px] text-slate-500 line-clamp-3">
                <strong>Vista previa:</strong> {messageBody}
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-1/3 py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteSend}
                disabled={isSending}
                className="w-2/3 py-2 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Despachando...' : 'Confirmar y Enviar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
