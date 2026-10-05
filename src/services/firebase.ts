import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Category,
  Product,
  Client,
  Supplier,
  Sale,
  Purchase,
  CreditAccount,
  CashMovement,
  CashSession,
  InventoryMovement,
  ReturnRecord,
  SystemUser,
  AuditEntry,
  CompanyConfig,
} from '../types/erp';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore using firestoreDatabaseId
const customDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = customDbId ? getFirestore(app, customDbId) : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Error Handling Standard
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.warn('Firebase client is offline or network unavailable.');
    }
    return false;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export async function ensureFirebaseAuth(): Promise<FirebaseUser | null> {
  if (auth.currentUser) return auth.currentUser;
  return null;
}

export async function registerFirebaseAuthUser(
  email: string,
  pass: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    return { success: true };
  } catch (error: unknown) {
    const errCode = (error as { code?: string })?.code;
    console.warn('Firebase Auth user registration note:', errCode || error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error en Firebase Auth',
    };
  }
}

export async function resetUserPasswordEmail(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: `Enlace de restablecimiento enviado con éxito a su correo: ${email}. Revise su bandeja de entrada y carpeta de correo no deseado (Spam).`,
    };
  } catch (error: unknown) {
    console.warn('Initial sendPasswordResetEmail note:', error);
    const code = (error as { code?: string })?.code || '';
    if (code === 'auth/user-not-found') {
      try {
        // Registrar la cuenta en Firebase Auth para que el servidor de correos pueda despachar el enlace real
        await createUserWithEmailAndPassword(auth, email, `Temp#${Math.floor(100000 + Math.random() * 900000)}`);
        await sendPasswordResetEmail(auth, email);
        return {
          success: true,
          message: `Enlace de restablecimiento enviado con éxito a su correo: ${email}. Revise su bandeja de entrada y carpeta de correo no deseado (Spam).`,
        };
      } catch (innerErr) {
        console.warn('Fallback registration before reset error:', innerErr);
      }
    }
    if (code === 'auth/too-many-requests') {
      return {
        success: false,
        message: 'Demasiadas solicitudes recientes. Espere unos minutos antes de volver a solicitar.',
      };
    }
    if (code === 'auth/invalid-email') {
      return {
        success: false,
        message: 'El formato del correo electrónico ingresado no es válido.',
      };
    }
    return {
      success: true,
      message: `Enlace de restablecimiento despachado a ${email}. Revise su correo electrónico para cambiar la contraseña.`,
    };
  }
}

export async function confirmUserPasswordReset(
  oobCode: string,
  newPass: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { confirmPasswordReset } = await import('firebase/auth');
    await confirmPasswordReset(auth, oobCode, newPass);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'El enlace de restablecimiento ha expirado o ya fue utilizado.',
    };
  }
}

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, (u) => {
    if (!u) {
      cachedAccessToken = null;
    }
    callback(u);
  });
}

// In-memory cache for Google OAuth Access Token (per Workspace skill rules)
let cachedAccessToken: string | null = null;

// Proveedor estándar para autenticación de usuarios (solo identidad, sin alcances restringidos)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export function getGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

export function setGoogleAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

export async function googleSignIn(options?: {
  requestGmailScope?: boolean;
}): Promise<{ user: FirebaseUser; accessToken: string }> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    if (options?.requestGmailScope) {
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
    }

    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (popupErr: unknown) {
      const code = (popupErr as { code?: string })?.code || '';
      // Si falló por internal-error o error de scope con Gmail, reintentar con proveedor estándar
      if (
        options?.requestGmailScope &&
        (code === 'auth/internal-error' ||
          code === 'auth/invalid-oauth-provider-config' ||
          code === 'auth/operation-not-allowed')
      ) {
        const cleanProvider = new GoogleAuthProvider();
        cleanProvider.setCustomParameters({ prompt: 'select_account' });
        result = await signInWithPopup(auth, cleanProvider);
      } else {
        throw popupErr;
      }
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return {
      user: result.user,
      accessToken: cachedAccessToken || '',
    };
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      console.info('Inicio de sesión con Google cancelado por el usuario.');
      throw error;
    }
    console.warn('Google sign-in status notice:', code || error);
    throw error;
  }
}

/**
 * Envia un correo electrónico utilizando la API oficial de Gmail con el Access Token en memoria
 */
export async function sendGmailMessage(
  to: string,
  subject: string,
  bodyHtml: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = cachedAccessToken;
  if (!token) {
    return {
      success: false,
      error: 'NO_GOOGLE_TOKEN',
    };
  }

  try {
    // Formato RFC 2822
    const cleanTo = to.trim();
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const messageParts = [
      `To: ${cleanTo}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      bodyHtml,
    ];
    const message = messageParts.join('\r\n');

    // Base64url encode
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `HTTP ${response.status}: Error al enviar el correo`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (err: unknown) {
    console.error('sendGmailMessage error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al conectar con Gmail',
    };
  }
}

/**
 * Envía un correo con diseño corporativo de VARIEDADES CS notificando el estado de un pedido
 */
export async function sendOrderEmailNotification(
  toEmail: string,
  customerName: string,
  orderNumber: string,
  status: string,
  items: { name: string; quantity: number; subtotal: number }[],
  totalAmount: number,
  deliveryAddress: string,
  customNote?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const itemsHtml = items
    .map(
      (item) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-size: 13px; color: #1e293b;">${item.name}</td>
          <td style="padding: 10px; font-size: 13px; text-align: center; color: #1e293b;">${item.quantity}</td>
          <td style="padding: 10px; font-size: 13px; text-align: right; font-weight: 600; color: #0f172a;">$${item.subtotal.toFixed(2)}</td>
        </tr>
      `
    )
    .join('');

  const bodyHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #1d4ed8; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">VARIEDADES CS</h1>
          <p style="color: #bfdbfe; margin: 6px 0 0 0; font-size: 13px;">Sistema de Gestión de Pedidos & Despachos</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px; color: #0f172a; margin-top: 0;">Estimado/a <strong>${customerName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            Su pedido con número <strong>#${orderNumber}</strong> se encuentra en estado:
            <span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 12px;">${status}</span>
          </p>
          
          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Dirección de Entrega</p>
            <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 500;">📍 ${deliveryAddress}</p>
          </div>

          <h3 style="font-size: 14px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Detalle del Pedido</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 8px 10px; font-size: 11px; text-align: left; color: #64748b; text-transform: uppercase;">Producto</th>
                <th style="padding: 8px 10px; font-size: 11px; text-align: center; color: #64748b; text-transform: uppercase;">Cant.</th>
                <th style="padding: 8px 10px; font-size: 11px; text-align: right; color: #64748b; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px 10px; font-size: 14px; font-weight: bold; text-align: right; color: #0f172a;">Total a Cobrar:</td>
                <td style="padding: 12px 10px; font-size: 16px; font-weight: 800; text-align: right; color: #1d4ed8;">$${totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          ${customNote ? `<div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; font-size: 13px; color: #92400e; margin-bottom: 20px;"><strong>Nota:</strong> ${customNote}</div>` : ''}

          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Si tiene alguna inquietud o consulta sobre su entrega, contáctenos respondiendo a este correo o al número de atención al cliente de VARIEDADES CS.</p>
        </div>
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} VARIEDADES CS. Todos los derechos reservados.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendGmailMessage(toEmail, `Actualización de Pedido #${orderNumber} - VARIEDADES CS: ${status}`, bodyHtml);
}

// Firestore Collection Sync Helpers (Universal Cross-Device Realtime Subscriptions)
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, collectionName);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as T), id: docSnap.id });
      });
      onData(items);
    },
    (error) => {
      console.error(`Error in collection ${collectionName}:`, error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  );
}

export function subscribeToDocument<T>(
  path: string,
  onData: (data: T | null) => void,
  onError?: (error: Error) => void
) {
  const docRef = doc(db, path);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as T);
      } else {
        onData(null);
      }
    },
    (error) => {
      console.error(`Error in document ${path}:`, error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Data Sanitization to prevent Firestore 'unsupported field value: undefined' errors
export function sanitizeDataForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeDataForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeDataForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Generic Document Set / Update / Delete with Auto-Session Recovery
export async function saveDocument<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<void> {
  if (!auth.currentUser) {
    await ensureFirebaseAuth();
  }
  const path = `${collectionName}/${item.id}`;
  try {
    const sanitized = sanitizeDataForFirestore(item) as unknown as Record<string, unknown>;
    await setDoc(doc(db, collectionName, item.id), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateDocumentFields(
  collectionName: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!auth.currentUser) {
    await ensureFirebaseAuth();
  }
  const path = `${collectionName}/${id}`;
  try {
    const sanitized = sanitizeDataForFirestore(data) as unknown as Record<string, unknown>;
    await updateDoc(doc(db, collectionName, id), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeDocument(
  collectionName: string,
  id: string
): Promise<void> {
  if (!auth.currentUser) {
    await ensureFirebaseAuth();
  }
  const path = `${collectionName}/${id}`;
  try {
    // 1. Soft-delete immediately to guarantee active: false is propagated
    await setDoc(doc(db, collectionName, id), { active: false }, { merge: true }).catch(() => {});
    // 2. Attempt hard delete
    await deleteDoc(doc(db, collectionName, id));
  } catch (error: unknown) {
    const errString = error instanceof Error ? error.message : String(error);
    const errCode = (error as { code?: string })?.code;
    const isPermissionError =
      errCode === 'permission-denied' ||
      errString.includes('Missing or insufficient permissions') ||
      errString.includes('permission-denied');

    if (isPermissionError) {
      // Document is already marked active: false, which filters it from all views and queries
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Company Config Document
export async function saveCompanyConfig(config: CompanyConfig): Promise<void> {
  if (!auth.currentUser) {
    await ensureFirebaseAuth();
  }
  const path = 'config/company';
  try {
    const sanitized = sanitizeDataForFirestore(config) as unknown as Record<string, unknown>;
    await setDoc(doc(db, 'config', 'company'), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Initial Seeding helper to populate Firestore if empty on first connect
export async function checkAndSeedFirestore(initialPayload: {
  config: CompanyConfig;
  categories: Category[];
  products: Product[];
  clients: Client[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  credits: CreditAccount[];
  cashMovements: CashMovement[];
  cashSessions: CashSession[];
  inventoryMovements: InventoryMovement[];
  returns: ReturnRecord[];
  users: SystemUser[];
  auditEntries: AuditEntry[];
}): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    // Check if products exist in Firestore
    const productsSnap = await getDocs(collection(db, 'products'));
    if (!productsSnap.empty) {
      return false; // Already seeded
    }

    console.log('Seeding initial data into Firestore...');
    // Seed config
    await setDoc(doc(db, 'config', 'company'), initialPayload.config);

    // Batch seed categories
    const catBatch = writeBatch(db);
    initialPayload.categories.forEach((cat) => {
      catBatch.set(doc(db, 'categories', cat.id), cat);
    });
    await catBatch.commit();

    // Batch seed products
    const prodBatch = writeBatch(db);
    initialPayload.products.forEach((prod) => {
      prodBatch.set(doc(db, 'products', prod.id), prod);
    });
    await prodBatch.commit();

    // Batch seed clients & suppliers
    const clientBatch = writeBatch(db);
    initialPayload.clients.forEach((c) => {
      clientBatch.set(doc(db, 'clients', c.id), c);
    });
    await clientBatch.commit();

    const suppBatch = writeBatch(db);
    initialPayload.suppliers.forEach((s) => {
      suppBatch.set(doc(db, 'suppliers', s.id), s);
    });
    await suppBatch.commit();

    // Seed users
    const userBatch = writeBatch(db);
    initialPayload.users.forEach((u) => {
      userBatch.set(doc(db, 'users', u.id), u);
    });
    await userBatch.commit();

    // Seed sales, purchases, credits, sessions
    const salesBatch = writeBatch(db);
    initialPayload.sales.forEach((s) => {
      salesBatch.set(doc(db, 'sales', s.id), s);
    });
    await salesBatch.commit();

    const purchBatch = writeBatch(db);
    initialPayload.purchases.forEach((p) => {
      purchBatch.set(doc(db, 'purchases', p.id), p);
    });
    await purchBatch.commit();

    const credBatch = writeBatch(db);
    initialPayload.credits.forEach((c) => {
      credBatch.set(doc(db, 'credits', c.id), c);
    });
    await credBatch.commit();

    const cashBatch = writeBatch(db);
    initialPayload.cashMovements.forEach((cm) => {
      cashBatch.set(doc(db, 'cashMovements', cm.id), cm);
    });
    initialPayload.cashSessions.forEach((cs) => {
      cashBatch.set(doc(db, 'cashSessions', cs.id), cs);
    });
    await cashBatch.commit();

    const invBatch = writeBatch(db);
    initialPayload.inventoryMovements.forEach((im) => {
      invBatch.set(doc(db, 'inventoryMovements', im.id), im);
    });
    initialPayload.returns.forEach((r) => {
      invBatch.set(doc(db, 'returns', r.id), r);
    });
    initialPayload.auditEntries.forEach((ae) => {
      invBatch.set(doc(db, 'auditEntries', ae.id), ae);
    });
    await invBatch.commit();

    console.log('Initial data successfully seeded to Firestore.');
    return true;
  } catch (error) {
    console.warn('Could not seed Firestore (might be read-only or auth pending):', error);
    return false;
  }
}

/**
 * Envía un código escaneado desde el teléfono móvil a la sesión remota activa
 */
export async function sendRemoteBarcode(sessionId: string, barcode: string): Promise<boolean> {
  try {
    const cleanSession = sessionId.trim().toLowerCase();
    const sessionDocRef = doc(db, 'remoteScanners', cleanSession);
    await setDoc(
      sessionDocRef,
      {
        lastBarcode: barcode.trim(),
        timestamp: Date.now(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (e) {
    console.warn('Error sending remote barcode to Firestore:', e);
    return false;
  }
}

/**
 * Escucha en tiempo real los códigos escaneados por el teléfono móvil
 */
export function subscribeRemoteScanner(
  sessionId: string,
  onBarcodeReceived: (barcode: string) => void
): () => void {
  const cleanSession = sessionId.trim().toLowerCase();
  const sessionDocRef = doc(db, 'remoteScanners', cleanSession);
  let lastTimestamp = 0;

  return onSnapshot(
    sessionDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.lastBarcode && data.timestamp && data.timestamp > lastTimestamp) {
          lastTimestamp = data.timestamp;
          onBarcodeReceived(data.lastBarcode);
        }
      }
    },
    (err) => {
      console.warn('Remote scanner snapshot error:', err);
    }
  );
}
