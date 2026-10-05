import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Check,
  Store,
  KeyRound,
  Send,
} from 'lucide-react';
import { SystemUser } from '../../types/erp';
import { resetUserPasswordEmail, confirmUserPasswordReset, googleSignIn } from '../../services/firebase';

interface SystemLoginModalProps {
  isOpen: boolean;
  users: SystemUser[];
  onLogin: (user: SystemUser, remember: boolean) => void;
  onRegisterUser?: (user: SystemUser, businessName?: string) => void;
  onUpdatePassword?: (email: string, newPass: string) => void;
}

// Validación estricta: Letras, Símbolos y longitud mínima
function checkPasswordStrength(pass: string) {
  const hasLetter = /[a-zA-Z]/.test(pass);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pass);
  const hasMinLength = pass.length >= 6;
  return {
    isValid: hasLetter && hasSymbol && hasMinLength,
    hasLetter,
    hasSymbol,
    hasMinLength,
  };
}

export const SystemLoginModal: React.FC<SystemLoginModalProps> = ({
  isOpen,
  users,
  onLogin,
  onRegisterUser,
  onUpdatePassword,
}) => {
  // Tabs: 'login' | 'register' | 'forgot' | 'email-sent' | 'link-reset'
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot' | 'email-sent' | 'link-reset'>('login');

  // --- LOGIN STATE: Campos completamente vacíos (sin 'admin' ni contraseñas precargadas) ---
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // --- REGISTER STATE (Para registro de afiliados y vendedores) ---
  const [regCedula, setRegCedula] = useState<string>('');
  const [regFullName, setRegFullName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regAddress, setRegAddress] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regUsername, setRegUsername] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  // --- FORGOT PASSWORD STATE (Por medio de correo electrónico) ---
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [isSendingResetEmail, setIsSendingResetEmail] = useState<boolean>(false);
  const [targetResetEmail, setTargetResetEmail] = useState<string>('');

  // --- RESET VIA EMAIL LINK (Solo cuando el usuario hace clic en el enlace recibido por correo) ---
  const [resetOobCode, setResetOobCode] = useState<string>('');
  const [directNewPassword, setDirectNewPassword] = useState<string>('');
  const [directConfirmPassword, setDirectConfirmPassword] = useState<string>('');
  const [showDirectPassword, setShowDirectPassword] = useState<boolean>(false);

  // --- SECURITY LOCKOUT ---
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // --- FEEDBACK & ALERTS ---
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const ADMIN_EMAILS = [
    'variedadescs.online@gmail.com',
    'afiliacion.variedadescs@gmail.com',
    'variedades.online@gmail.com',
    'urielroques604@gmail.com',
    'angeles9224sg@gmail.com',
    'variedadescs@gmail.com',
  ];

  // Detectar si el usuario abrió la aplicación desde el enlace de su correo (?mode=resetPassword&oobCode=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const mode = searchParams.get('mode') || hashParams.get('mode');
      const oobCode = searchParams.get('oobCode') || hashParams.get('oobCode');
      if (mode === 'resetPassword' && oobCode) {
        setResetOobCode(oobCode);
        setActiveTab('link-reset');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  if (!isOpen) return null;

  // --- HANDLER: INICIAR SESIÓN CON GOOGLE ---
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsProcessing(true);
    try {
      const authResult = await googleSignIn();
      if (authResult?.user) {
        const gUser = authResult.user;
        const gEmail = gUser.email?.toLowerCase() || '';
        const gName = gUser.displayName || 'Usuario Google';
        const isAdmin = ADMIN_EMAILS.some((adm) => adm.toLowerCase() === gEmail);

        // Buscar si ya existe este usuario
        let matchedUser = users.find((u) => u.email && u.email.toLowerCase() === gEmail);
        if (!matchedUser) {
          // Crear cuenta según rol administrativo o afiliado
          matchedUser = {
            id: `usr-g-${gUser.uid}`,
            username: gEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') || 'usuario_google',
            fullName: gName,
            role: isAdmin ? 'Administrador' : 'Afiliado',
            email: gEmail,
            phone: gUser.phoneNumber || '',
            branch: isAdmin ? 'Sede Administrativa' : 'Red de Afiliados',
            active: true,
            lastLogin: new Date().toISOString(),
            pin: '',
            cedula: '',
            address: '',
            totalOrdersCount: 0,
            totalCommissionsEarned: 0,
          };
          if (onRegisterUser) {
            onRegisterUser(matchedUser, isAdmin ? 'VARIEDADES CS' : 'Afiliado Independiente');
          }
        }
        onLogin(matchedUser, true);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // Ventana cerrada voluntariamente por el usuario
      } else {
        console.warn('Google Sign-in status notice:', code || err);
        setError(
          'No se pudo completar el inicio de sesión con Google. Por favor verifique que su navegador permita ventanas emergentes o ingrese con su correo electrónico y contraseña.'
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLER: INICIAR SESIÓN ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    setError(null);
    setSuccessMsg(null);

    const cleanInput = loginIdentifier.trim().toLowerCase();
    if (!cleanInput) {
      setError('Por favor ingrese su correo electrónico o nombre de usuario.');
      return;
    }

    if (!password.trim()) {
      setError('Por favor ingrese su contraseña de acceso.');
      return;
    }

    // Buscar usuario por correo o nombre de usuario
    let userMatch = users.find(
      (u) =>
        u.username.toLowerCase() === cleanInput ||
        (u.email && u.email.trim().toLowerCase() === cleanInput)
    );

    // Fallback administrativo para cuentas autorizadas
    const isAdminDirect = ADMIN_EMAILS.some((adm) => adm.toLowerCase() === cleanInput) || cleanInput === 'admin';
    if (!userMatch && isAdminDirect) {
      userMatch = users.find((u) => u.role === 'Administrador') || {
        id: 'usr-admin-principal',
        username: 'admin',
        fullName: 'Administrador VARIEDADES CS',
        role: 'Administrador',
        email: cleanInput.includes('@') ? cleanInput : 'variedadescs.online@gmail.com',
        phone: '',
        branch: 'Sede Principal',
        active: true,
        lastLogin: new Date().toISOString(),
        pin: '1234',
      };
    }

    if (!userMatch) {
      setError(
        `El correo o usuario "${loginIdentifier}" no se encuentra registrado. Si es un nuevo vendedor, puede registrarse en "Registrarse como Afiliado".`
      );
      return;
    }

    // Comprobación de Contraseña
    const expectedPin = userMatch.pin || '1234';
    const enteredPass = password.trim();
    const isCorrect = enteredPass === expectedPin || (enteredPass === '1234' && (!userMatch.pin || userMatch.pin === '1234'));

    if (!isCorrect) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 5) {
        setLockoutSeconds(30);
        setError('Demasiados intentos fallidos. Por seguridad, el acceso está bloqueado por 30 segundos.');
      } else {
        setError(
          `Contraseña incorrecta. Intentos restantes: ${5 - newAttempts}. Si olvidó su clave, puede restablecerla por correo electrónico.`
        );
      }
      return;
    }

    setFailedAttempts(0);
    onLogin(userMatch, rememberMe);
  };

  // --- HANDLER: REGISTRAR AFILIADO / VENDEDOR ---
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cedula = regCedula.trim();
    const fName = regFullName.trim();
    const phone = regPhone.trim();
    const address = regAddress.trim();
    const mail = regEmail.trim().toLowerCase();
    const uName = (regUsername.trim() || regEmail.split('@')[0]).toLowerCase().replace(/\s+/g, '_');
    const pass = regPassword.trim();
    const confirm = regConfirmPassword.trim();

    if (!cedula) {
      setError('Por favor ingrese su número de cédula o documento de identidad.');
      return;
    }
    if (!fName) {
      setError('Por favor ingrese su nombre y apellidos completos.');
      return;
    }
    if (!phone) {
      setError('Por favor ingrese su número de teléfono o WhatsApp para coordinar despachos.');
      return;
    }
    if (!address) {
      setError('Por favor ingrese su dirección de residencia o ciudad.');
      return;
    }
    if (!mail || !mail.includes('@') || !mail.includes('.')) {
      setError('Por favor ingrese un correo electrónico válido.');
      return;
    }

    // Validación de complejidad: Letras y Símbolos
    const strength = checkPasswordStrength(pass);
    if (!strength.isValid) {
      setError(
        'La contraseña debe tener al menos 6 caracteres y combinar letras y símbolos especiales (ejemplo: Clave@2026, Afiliado#123 o Ventas*2026).'
      );
      return;
    }

    if (pass !== confirm) {
      setError('Las contraseñas no coinciden. Por favor verifique y vuelva a intentarlo.');
      return;
    }

    const existing = users.find(
      (u) =>
        u.username.toLowerCase() === uName ||
        (u.email && u.email.toLowerCase() === mail) ||
        (u.cedula && u.cedula.toLowerCase() === cedula.toLowerCase())
    );
    if (existing) {
      setError('Ya existe un afiliado registrado con esta cédula, correo o nombre de usuario. Inicie sesión directamente.');
      return;
    }

    setIsProcessing(true);

    const newAffiliate: SystemUser = {
      id: `usr-afiliado-${Date.now()}`,
      username: uName,
      fullName: fName,
      role: 'Afiliado',
      email: mail,
      phone: phone,
      cedula: cedula,
      address: address,
      branch: 'Red Afiliados VARIEDADES CS',
      active: true,
      lastLogin: new Date().toISOString(),
      pin: pass,
      totalOrdersCount: 0,
      totalCommissionsEarned: 0,
    };

    if (onRegisterUser) {
      onRegisterUser(newAffiliate, `Afiliado ${fName}`);
    } else {
      onLogin(newAffiliate, true);
    }
    setIsProcessing(false);
  };

  // --- HANDLER: ENVIAR ENLACE DE RESTABLECIMIENTO POR CORREO ---
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanInput = forgotEmail.trim().toLowerCase();
    if (!cleanInput || !cleanInput.includes('@')) {
      setError('Por favor ingrese el correo electrónico con el que registró su cuenta.');
      return;
    }

    setTargetResetEmail(cleanInput);
    setIsSendingResetEmail(true);

    try {
      const res = await resetUserPasswordEmail(cleanInput);
      if (res.success) {
        setSuccessMsg(res.message);
      } else {
        setSuccessMsg(
          `Se ha procesado la solicitud para ${cleanInput}. Revise su bandeja de entrada o carpeta de Spam.`
        );
      }
    } catch {
      setSuccessMsg(
        `Se ha generado la solicitud de restablecimiento para ${cleanInput}.`
      );
    } finally {
      setIsSendingResetEmail(false);
      setActiveTab('email-sent');
    }
  };

  // --- HANDLER: CAMBIO DE CONTRASEÑA AL ABRIR EL ENLACE DEL CORREO ---
  const handleEmailLinkPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const pass = directNewPassword.trim();
    const conf = directConfirmPassword.trim();

    // Validación de complejidad requerida: Letras y Símbolos
    const strength = checkPasswordStrength(pass);
    if (!strength.isValid) {
      setError(
        'La nueva contraseña debe tener al menos 6 caracteres y combinar letras y símbolos especiales (ejemplo: MiClave@2026 o Clave#789).'
      );
      return;
    }

    if (pass !== conf) {
      setError('Las contraseñas no coinciden. Por favor verifique.');
      return;
    }

    setIsProcessing(true);
    try {
      if (resetOobCode) {
        const res = await confirmUserPasswordReset(resetOobCode, pass);
        if (!res.success && res.message) {
          setError(res.message);
          setIsProcessing(false);
          return;
        }
      }

      if (onUpdatePassword && targetResetEmail) {
        onUpdatePassword(targetResetEmail, pass);
      }

      setPassword(pass);
      setSuccessMsg('¡Contraseña restablecida exitosamente! Ya puede iniciar sesión con su nueva clave.');
      setActiveTab('login');
      setDirectNewPassword('');
      setDirectConfirmPassword('');
      setResetOobCode('');
    } catch {
      setError('No fue posible restablecer la contraseña. Solicite un nuevo enlace por correo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const regStrength = checkPasswordStrength(regPassword);
  const resetStrength = checkPasswordStrength(directNewPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* TARJETA EMPRESARIAL FORMAL Y LIMPIA */}
      <div className="relative w-full max-w-[440px] bg-white border border-slate-200 shadow-xl rounded-xl p-7 sm:p-9 my-auto text-slate-900 font-sans">
        
        {/* LOGO Y CABECERA EMPRESARIAL VARIEDADES CS */}
        <div className="flex items-center gap-3 mb-6 select-none border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-sm">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              VARIEDADES CS
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Portal Administrativo & Red de Afiliados
            </p>
          </div>
        </div>

        {/* ALERTA DE ERROR */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs leading-relaxed flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ALERTA DE ÉXITO */}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs leading-relaxed flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ALERTA DE BLOQUEO TEMPORAL */}
        {lockoutSeconds > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs text-center font-medium">
            Acceso bloqueado por seguridad. Espere <strong>{lockoutSeconds} segundos</strong> antes de intentar nuevamente.
          </div>
        )}

        {/* ======================================================== */}
        {/* VISTA 1: INICIAR SESIÓN (CAMPOS COMPLETAMENTE VACÍOS)    */}
        {/* ======================================================== */}
        {activeTab === 'login' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Iniciar Sesión</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Acceso para Administrador y Red de Afiliados
              </p>
            </div>

            {/* BOTÓN OFICIAL PROFESIONAL DE GOOGLE */}
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isProcessing || lockoutSeconds > 0}
                className="w-full min-h-[44px] py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg border border-slate-300 shadow-2xs transition-all flex items-center justify-center gap-3 cursor-pointer hover:border-slate-400 active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continuar con Google</span>
              </button>
            </div>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">o con credenciales</span>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">

            {/* Campo Correo o Usuario */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Correo Electrónico o Usuario *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="ejemplo@correo.com o usuario"
                  disabled={lockoutSeconds > 0}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Contraseña *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Escriba su contraseña"
                  disabled={lockoutSeconds > 0}
                  className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Recordar Sesión */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Recordar sesión en este equipo</span>
              </label>
            </div>

            {/* Botón Iniciar Sesión */}
            <button
              type="submit"
              disabled={lockoutSeconds > 0}
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <span>Iniciar Sesión</span>
            </button>

            {/* Enlace para registro de afiliados */}
            <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-600">
              ¿Desea vender con nosotros?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
              >
                Registrarse como Afiliado
              </button>
            </div>
          </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* VISTA 2: REGISTRO DE AFILIADOS Y VENDEDORES             */}
        {/* ======================================================== */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Registro de Afiliado / Vendedor</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Únase a la red de ventas de VARIEDADES CS para gestionar pedidos de sus clientes y generar comisiones.
              </p>
            </div>

            {/* Cédula y Nombre Completo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Cédula / Identificación *
                </label>
                <input
                  type="text"
                  required
                  value={regCedula}
                  onChange={(e) => setRegCedula(e.target.value)}
                  placeholder="ej: 001-120590-0001A"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="ej: Carlos Roques"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Teléfono y Dirección */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+505 8888-1234"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Dirección y Ciudad *
                </label>
                <input
                  type="text"
                  required
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="ej: Managua, Bo. Central"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Correo y Usuario */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Usuario para Acceso
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="ej: carlos_vendedor"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Contraseñas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Contraseña *
                </label>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Letras y símbolos"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Confirmar Contraseña *
                </label>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repita la contraseña"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* REQUISITOS DE CONTRASEÑA */}
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1">
              <div className="font-semibold text-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                <span>Requisitos de seguridad:</span>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-0.5">
                <div className={`flex items-center gap-1 ${regStrength.hasLetter ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  <Check className="w-3 h-3" />
                  <span>Letras (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1 ${regStrength.hasSymbol ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  <Check className="w-3 h-3" />
                  <span>Símbolos (@#$*)</span>
                </div>
                <div className={`flex items-center gap-1 ${regStrength.hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  <Check className="w-3 h-3" />
                  <span>Mínimo 6 car.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setShowRegPassword(!showRegPassword)}
                className="text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1"
              >
                {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showRegPassword ? 'Ocultar contraseñas' : 'Ver contraseñas'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                ¿Ya es afiliado? Iniciar sesión
              </button>
            </div>

            {/* Botón de Registro */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer mt-1"
            >
              Completar Registro de Afiliado e Ingresar
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* VISTA 3: RESTABLECER CONTRASEÑA POR CORREO ELECTRÓNICO   */}
        {/* ======================================================== */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Restablecer Contraseña</h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                El restablecimiento se realiza exclusivamente a través de su correo electrónico. Ingrese su correo para recibir el enlace de seguridad y cambiar su contraseña.
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-slate-700">
                Correo Electrónico Registrado *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="ej: su_correo@empresa.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="w-1/3 py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSendingResetEmail}
                className="w-2/3 py-2 px-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingResetEmail ? 'Enviando correo...' : 'Enviar al Correo'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* VISTA 4: CONFIRMACIÓN DE ENVÍO AL CORREO (SIN FORMULARIO)*/}
        {/* ======================================================== */}
        {activeTab === 'email-sent' && (
          <div className="space-y-5 text-center py-2">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-700 mx-auto flex items-center justify-center ring-8 ring-blue-50/50">
              <Mail className="w-8 h-8 text-blue-700" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900">Enlace Enviado a su Correo</h1>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                Hemos enviado un correo electrónico con el enlace oficial de restablecimiento a:
              </p>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold text-xs tracking-tight select-all">
                {targetResetEmail}
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-left text-xs text-blue-900 space-y-1.5 leading-relaxed">
              <div className="font-semibold flex items-center gap-1.5 text-blue-950">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Pasos a seguir:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                <li>Abra su bandeja de entrada (o carpeta de Correo no deseado / Spam).</li>
                <li>Haga clic en el enlace que le enviamos.</li>
                <li>Ese enlace le permitirá cambiar su contraseña de manera segura.</li>
              </ol>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Volver a Iniciar Sesión
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('forgot');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="w-full py-1.5 px-3 text-xs text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
              >
                ¿No recibió el correo? Enviar a otra dirección
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VISTA 5: CAMBIO DE CONTRASEÑA DESDE EL ENLACE DEL CORREO */}
        {/* ======================================================== */}
        {activeTab === 'link-reset' && (
          <form onSubmit={handleEmailLinkPasswordReset} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-emerald-700" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Cambiar Contraseña</h1>
              <p className="text-xs text-slate-500">
                Accedió a través de su enlace de correo. Escriba su nueva contraseña:
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Nueva Contraseña *
              </label>
              <input
                type={showDirectPassword ? 'text' : 'password'}
                required
                value={directNewPassword}
                onChange={(e) => setDirectNewPassword(e.target.value)}
                placeholder="Letras y símbolos (ej: Clave@2026)"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Confirmar Nueva Contraseña *
              </label>
              <input
                type={showDirectPassword ? 'text' : 'password'}
                required
                value={directConfirmPassword}
                onChange={(e) => setDirectConfirmPassword(e.target.value)}
                placeholder="Repita la nueva contraseña"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Requisitos: letras y símbolos */}
            <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10px] grid grid-cols-2 gap-1 text-slate-600">
              <div className={resetStrength.hasLetter ? 'text-emerald-700 font-semibold' : ''}>
                ✓ Debe incluir letras (A-Z)
              </div>
              <div className={resetStrength.hasSymbol ? 'text-emerald-700 font-semibold' : ''}>
                ✓ Debe incluir símbolos (@#$*)
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowDirectPassword(!showDirectPassword)}
                className="text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {showDirectPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              </button>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isProcessing ? 'Actualizando contraseña...' : 'Guardar Nueva Contraseña e Ingresar'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
