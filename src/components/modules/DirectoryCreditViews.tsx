import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  DollarSign,
  Eye,
  FileSpreadsheet,
  Download,
  FileUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Mail,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import {
  Client,
  Supplier,
  CreditAccount,
  CompanyConfig,
} from '../../types/erp';
import {
  PageHeader,
  SummaryStrip,
  FilterToolbar,
  Modal,
  ConfirmModal,
  formatCurrency,
} from '../ui/EnterpriseComponents';
import {
  exportClientsToExcel,
  exportClientsToCSV,
  downloadClientsExcelTemplate,
  downloadClientsCSVTemplate,
  readClientsFromExcel,
  exportSuppliersToExcel,
} from '../../utils/excel';
import {
  sendGmailMessage,
  googleSignIn,
  getGoogleAccessToken,
} from '../../services/firebase';

/* ============================================================================
   1. MÓDULO: CLIENTES
   ============================================================================ */
interface ClientesViewProps {
  clients: Client[];
  config: CompanyConfig;
  onSaveClient: (client: Omit<Client, 'id'>, existingId?: string) => void;
  onDeleteClient: (id: string) => void;
  onDeleteAllClients?: () => void;
  onBatchImportClients?: (clients: Omit<Client, 'id'>[]) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  clients,
  config,
  onSaveClient,
  onDeleteClient,
  onDeleteAllClients,
  onBatchImportClients,
}) => {
  const [search, setSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // Estados para Importación Masiva Excel / CSV
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importPreviewClients, setImportPreviewClients] = useState<Omit<Client, 'id'>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const [document, setDocument] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('200');
  const [currentBalance, setCurrentBalance] = useState('0');
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');

  const openNew = () => {
    setEditingClient(null);
    setDocument('');
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCreditLimit('200');
    setCurrentBalance('0');
    setActive(true);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (cli: Client) => {
    setEditingClient(cli);
    setDocument(cli.document);
    setName(cli.name);
    setPhone(cli.phone);
    setEmail(cli.email);
    setAddress(cli.address);
    setCreditLimit(String(cli.creditLimit));
    setCurrentBalance(String(cli.currentBalance));
    setActive(cli.active);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!document.trim() || !name.trim()) {
      setError('El documento de identidad/NIT y el nombre completo son obligatorios.');
      return;
    }
    onSaveClient(
      {
        document: document.trim(),
        name: name.trim(),
        phone: phone.trim() || '-',
        email: email.trim() || '-',
        address: address.trim() || '-',
        creditLimit: Math.max(0, parseFloat(creditLimit) || 0),
        currentBalance: Math.max(0, parseFloat(currentBalance) || 0),
        active,
      },
      editingClient?.id
    );
    setIsModalOpen(false);
  };

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.document.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q);
    const matchBal =
      balanceFilter === 'ALL'
        ? true
        : balanceFilter === 'WITH_DEBT'
        ? c.currentBalance > 0
        : c.currentBalance === 0;
    return matchQ && matchBal;
  });

  const totalCreditLimit = clients.reduce((s, c) => s + c.creditLimit, 0);
  const totalBalance = clients.reduce((s, c) => s + c.currentBalance, 0);

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setIsProcessingFile(true);
    setImportErrors([]);
    setImportSuccessMsg('');

    try {
      const result = await readClientsFromExcel(file);
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors);
      }

      if (result.success && result.data.length > 0) {
        setImportPreviewClients(result.data);
        setImportSuccessMsg(
          `Se validaron exitosamente ${result.data.length} clientes listos para importar.`
        );
      } else {
        setImportPreviewClients([]);
        if (!result.errors || result.errors.length === 0) {
          setImportErrors(['No se encontraron filas con clientes válidos en el archivo.']);
        }
      }
    } catch (err) {
      setImportErrors([
        err instanceof Error ? err.message : 'Error al procesar el archivo Excel / CSV.',
      ]);
      setImportPreviewClients([]);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleConfirmBatchImport = () => {
    if (importPreviewClients.length === 0) return;

    if (onBatchImportClients) {
      onBatchImportClients(importPreviewClients);
    } else {
      importPreviewClients.forEach((c) => onSaveClient(c));
    }

    setIsImportModalOpen(false);
    setImportPreviewClients([]);
    setImportFileName('');
    setImportErrors([]);
    setImportSuccessMsg('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Directorio de Clientes"
        description="Gestión comercial de clientes, cupos de crédito autorizados y saldos pendientes de pago."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportClientsToExcel(clients)}
              title="Descargar directorio de clientes en formato Microsoft Excel (.xlsx)"
              className="px-3 py-1.5 text-xs font-semibold rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => exportClientsToCSV(clients)}
              title="Descargar directorio de clientes en formato CSV (RFC-4180)"
              className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setImportFileName('');
                setImportPreviewClients([]);
                setImportErrors([]);
                setImportSuccessMsg('');
                setIsImportModalOpen(true);
              }}
              title="Importar lista de clientes desde archivo Excel (.xlsx, .xls) o CSV con validación estricta"
              className="px-3 py-1.5 text-xs font-semibold rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            >
              <FileUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Importar Excel / CSV</span>
            </button>

            {clients.length > 0 && onDeleteAllClients && (
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(true)}
                title="Eliminar todos los clientes del directorio"
                className="px-3 py-1.5 text-xs font-semibold rounded border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 flex items-center gap-1.5 whitespace-nowrap shadow-2xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Vaciar Directorio</span>
              </button>
            )}

            <button
              type="button"
              onClick={openNew}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Cliente
            </button>
          </div>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Clientes Registrados',
            value: clients.length,
            subtext: 'Base de datos comercial activa',
          },
          {
            label: 'Cupo Total Otorgado',
            value: formatCurrency(totalCreditLimit, config.currencySymbol),
            subtext: 'Límite global de cartera',
          },
          {
            label: 'Saldo Total por Cobrar',
            value: formatCurrency(totalBalance, config.currencySymbol),
            subtext: 'Deuda vigente de clientes',
            tone: totalBalance > 0 ? 'warning' : 'success',
          },
          {
            label: 'Clientes con Saldo',
            value: clients.filter((c) => c.currentBalance > 0).length,
            subtext: 'Cuentas activas en crédito',
            tone: 'primary',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Buscar cliente por nombre, razón social, NIT/cédula o teléfono..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            label: 'Estado de Cuenta',
            value: balanceFilter,
            onChange: setBalanceFilter,
            options: [
              { value: 'ALL', label: 'Todos los clientes' },
              { value: 'WITH_DEBT', label: 'Con saldo pendiente' },
              { value: 'CLEAN', label: 'Paz y salvo ($0.00)' },
            ],
          },
        ]}
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Documento / NIT</th>
                <th className="py-2.5 px-3 font-semibold">Cliente / Razón Social</th>
                <th className="py-2.5 px-3 font-semibold">Teléfono / Correo</th>
                <th className="py-2.5 px-3 font-semibold">Dirección</th>
                <th className="py-2.5 px-3 font-semibold text-right">Límite Crédito</th>
                <th className="py-2.5 px-3 font-semibold text-right">Saldo Pendiente</th>
                <th className="py-2.5 px-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((cli) => (
                <tr key={cli.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {cli.document}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {cli.name}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-slate-800">{cli.phone}</div>
                    <div className="text-[11px] text-slate-500">{cli.email}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{cli.address}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {formatCurrency(cli.creditLimit, config.currencySymbol)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                      cli.currentBalance > 0
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {formatCurrency(cli.currentBalance, config.currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(cli)}
                        className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingClient(cli)}
                        title={`Eliminar cliente ${cli.name}`}
                        className="px-2 py-1 text-xs border border-red-200 rounded bg-white text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Documento / NIT *
              </label>
              <input
                type="text"
                required
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfono *
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre Completo o Razón Social *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Límite de Crédito ({config.currencySymbol})
              </label>
              <input
                type="number"
                min={0}
                step="10"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Dirección Comercial / Residencial
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-700 text-white"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingClient}
        title="Eliminar Cliente"
        message={`¿Confirma eliminar al cliente "${deletingClient?.name}" del sistema? Esta acción removerá el registro permanentemente.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deletingClient) {
            onDeleteClient(deletingClient.id);
            setDeletingClient(null);
          }
        }}
        onCancel={() => setDeletingClient(null)}
      />

      <ConfirmModal
        isOpen={isClearAllModalOpen}
        title="Vaciar Directorio de Clientes"
        message={`¿Confirma eliminar TODOS los clientes registrados (${clients.length})? Esta acción removerá todos los compradores y clientes del sistema.`}
        confirmLabel="Sí, Vaciar Todo"
        onConfirm={() => {
          if (onDeleteAllClients) {
            onDeleteAllClients();
          }
          setIsClearAllModalOpen(false);
        }}
        onCancel={() => setIsClearAllModalOpen(false)}
      />

      {/* Modal de Importación Masiva de Clientes desde Excel / CSV */}
      <Modal
        isOpen={isImportModalOpen}
        title="Importar Directorio de Clientes (Excel / CSV)"
        onClose={() => {
          setIsImportModalOpen(false);
          setImportPreviewClients([]);
          setImportFileName('');
          setImportErrors([]);
          setImportSuccessMsg('');
        }}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <FileSpreadsheet className="w-4 h-4 text-blue-700" />
              <span>Instrucciones para Importación Contable</span>
            </div>
            <p className="text-slate-600">
              Puede cargar archivos en formato Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) o texto delimitado (<strong>.csv</strong>). Los campos <strong>Identificación/NIT</strong> y <strong>Nombre Completo</strong> son obligatorios para garantizar la integridad contable.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={downloadClientsExcelTemplate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-white border border-blue-300 text-blue-800 hover:bg-blue-100 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Plantilla Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={downloadClientsCSVTemplate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Plantilla CSV (.csv)
              </button>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded p-5 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
            <input
              type="file"
              id="clients-file-input"
              accept=".xlsx, .xls, .csv"
              onChange={handleImportFileChange}
              className="hidden"
            />
            <label
              htmlFor="clients-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <FileUp className="w-8 h-8 text-blue-600" />
              <span className="text-sm font-semibold text-slate-800">
                Haga clic para seleccionar archivo Excel o CSV
              </span>
              <span className="text-slate-500 text-[11px]">
                {importFileName ? `Archivo cargado: ${importFileName}` : 'Formatos soportados: .xlsx, .xls, .csv'}
              </span>
            </label>
          </div>

          {isProcessingFile && (
            <div className="p-3 bg-slate-100 text-slate-700 rounded text-center font-medium animate-pulse">
              Analizando estructura y validando registros del archivo...
            </div>
          )}

          {importSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-300 rounded text-red-800 space-y-1 max-h-36 overflow-y-auto">
              <div className="flex items-center gap-1.5 font-bold text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Advertencias / Inconsistencias detectadas ({importErrors.length}):</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {importErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {importPreviewClients.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800">
                  Vista previa de registros válidos ({importPreviewClients.length}):
                </h4>
                <span className="text-slate-500 text-[11px]">
                  Mostrando los primeros {Math.min(5, importPreviewClients.length)}
                </span>
              </div>
              <div className="border border-slate-200 rounded overflow-x-auto max-h-48">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="py-1.5 px-2 font-semibold">Documento</th>
                      <th className="py-1.5 px-2 font-semibold">Cliente</th>
                      <th className="py-1.5 px-2 font-semibold">Teléfono</th>
                      <th className="py-1.5 px-2 font-semibold text-right">Límite Crédito</th>
                      <th className="py-1.5 px-2 font-semibold text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {importPreviewClients.slice(0, 5).map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 font-mono">{c.document}</td>
                        <td className="py-1.5 px-2 font-medium">{c.name}</td>
                        <td className="py-1.5 px-2">{c.phone}</td>
                        <td className="py-1.5 px-2 text-right font-mono">
                          {formatCurrency(c.creditLimit, config.currencySymbol)}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {c.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportPreviewClients([]);
                setImportFileName('');
                setImportErrors([]);
                setImportSuccessMsg('');
              }}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={importPreviewClients.length === 0}
              onClick={handleConfirmBatchImport}
              className={`px-4 py-1.5 text-xs font-semibold rounded text-white flex items-center gap-1.5 ${
                importPreviewClients.length > 0
                  ? 'bg-blue-700 hover:bg-blue-800 cursor-pointer shadow-sm'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar e Importar {importPreviewClients.length} Clientes</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ============================================================================
   2. MÓDULO: PROVEEDORES
   ============================================================================ */
interface ProveedoresViewProps {
  suppliers: Supplier[];
  onSaveSupplier: (sup: Omit<Supplier, 'id'>, existingId?: string) => void;
  onDeleteSupplier: (id: string) => void;
  onDeleteAllSuppliers?: () => void;
}

export const ProveedoresView: React.FC<ProveedoresViewProps> = ({
  suppliers,
  onSaveSupplier,
  onDeleteSupplier,
  onDeleteAllSuppliers,
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [deletingSup, setDeletingSup] = useState<Supplier | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  const [taxId, setTaxId] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [categorySpecialty, setCategorySpecialty] = useState('Papelería y Oficina');
  const [paymentTerms, setPaymentTerms] = useState('30 días');
  const [error, setError] = useState('');

  const openNew = () => {
    setEditingSup(null);
    setTaxId('');
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCategorySpecialty('General');
    setPaymentTerms('30 días');
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (sup: Supplier) => {
    setEditingSup(sup);
    setTaxId(sup.taxId);
    setName(sup.name);
    setContactPerson(sup.contactPerson);
    setPhone(sup.phone);
    setEmail(sup.email);
    setAddress(sup.address);
    setCategorySpecialty(sup.categorySpecialty);
    setPaymentTerms(sup.paymentTerms);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxId.trim() || !name.trim()) {
      setError('El NIT/RUC y la Razón Social del proveedor son obligatorios.');
      return;
    }
    onSaveSupplier(
      {
        taxId: taxId.trim(),
        name: name.trim(),
        contactPerson: contactPerson.trim() || '-',
        phone: phone.trim() || '-',
        email: email.trim() || '-',
        address: address.trim() || '-',
        categorySpecialty: categorySpecialty.trim() || 'General',
        paymentTerms: paymentTerms.trim() || 'Contado',
        active: true,
      },
      editingSup?.id
    );
    setIsModalOpen(false);
  };

  const filtered = suppliers.filter((s) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.taxId.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.categorySpecialty.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Directorio de Proveedores"
        description="Empresas mayoristas y distribuidores autorizados que abastecen a VARIEDADES CS."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportSuppliersToExcel(suppliers)}
              title="Descargar directorio de proveedores en formato Excel (.xlsx)"
              className="px-3 py-1.5 text-xs font-semibold rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            {suppliers.length > 0 && onDeleteAllSuppliers && (
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(true)}
                title="Eliminar todos los proveedores del directorio"
                className="px-3 py-1.5 text-xs font-semibold rounded border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 flex items-center gap-1.5 whitespace-nowrap shadow-2xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Vaciar Directorio</span>
              </button>
            )}

            <button
              type="button"
              onClick={openNew}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Proveedor
            </button>
          </div>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Total Proveedores',
            value: suppliers.length,
            subtext: 'Aliados comerciales registrados',
          },
          {
            label: 'Condición Crédito',
            value: suppliers.filter((s) => s.paymentTerms !== 'Contado').length,
            subtext: 'Proveedores con plazo de pago',
            tone: 'primary',
          },
          {
            label: 'Pago de Contado',
            value: suppliers.filter((s) => s.paymentTerms === 'Contado').length,
            subtext: 'Liquidación inmediata',
          },
          {
            label: 'Estado Operativo',
            value: '100% Activos',
            subtext: 'Verificados para compras',
            tone: 'success',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Buscar proveedor por NIT, razón social, ejecutivo de cuenta o línea..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-semibold">NIT / RUC</th>
                <th className="py-2.5 px-3 font-semibold">Razón Social</th>
                <th className="py-2.5 px-3 font-semibold">Contacto Comercial</th>
                <th className="py-2.5 px-3 font-semibold">Teléfono / Email</th>
                <th className="py-2.5 px-3 font-semibold">Línea Principal</th>
                <th className="py-2.5 px-3 font-semibold">Plazo Pago</th>
                <th className="py-2.5 px-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {sup.taxId}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{sup.name}</div>
                    <div className="text-[11px] text-slate-500">{sup.address}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">{sup.contactPerson}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-mono text-slate-800">{sup.phone}</div>
                    <div className="text-[11px] text-slate-500">{sup.email}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {sup.categorySpecialty}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                    {sup.paymentTerms}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(sup)}
                        className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingSup(sup)}
                        className="px-2 py-1 text-xs border border-red-200 rounded bg-white text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingSup ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                NIT / Identificación Fiscal *
              </label>
              <input
                type="text"
                required
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Condición de Pago
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="Contado">Contado</option>
                <option value="15 días">Crédito 15 días</option>
                <option value="30 días">Crédito 30 días</option>
                <option value="60 días">Crédito 60 días</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Razón Social / Empresa *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre de Contacto
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Especialidad / Categoría
              </label>
              <input
                type="text"
                value={categorySpecialty}
                onChange={(e) => setCategorySpecialty(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Dirección de Bodega / Oficinas
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-700 text-white"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingSup}
        title="Eliminar Proveedor"
        message={`¿Confirma eliminar al proveedor "${deletingSup?.name}" del sistema? Esta acción removerá el registro permanentemente.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deletingSup) {
            onDeleteSupplier(deletingSup.id);
            setDeletingSup(null);
          }
        }}
        onCancel={() => setDeletingSup(null)}
      />

      <ConfirmModal
        isOpen={isClearAllModalOpen}
        title="Vaciar Directorio de Proveedores"
        message={`¿Confirma eliminar TODOS los proveedores registrados (${suppliers.length})? Esta acción removerá todos los proveedores del sistema.`}
        confirmLabel="Sí, Vaciar Todo"
        onConfirm={() => {
          if (onDeleteAllSuppliers) {
            onDeleteAllSuppliers();
          }
          setIsClearAllModalOpen(false);
        }}
        onCancel={() => setIsClearAllModalOpen(false)}
      />
    </div>
  );
};

/* ============================================================================
   3. MÓDULO: CRÉDITOS (CUENTAS POR COBRAR Y ABONOS)
   ============================================================================ */
interface CreditosViewProps {
  credits: CreditAccount[];
  clients?: Client[];
  config: CompanyConfig;
  onRegisterCreditPayment: (data: {
    creditId: string;
    amount: number;
    paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia';
    notes: string;
  }) => void;
}

export const CreditosView: React.FC<CreditosViewProps> = ({
  credits,
  clients = [],
  config,
  onRegisterCreditPayment,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [payingCredit, setPayingCredit] = useState<CreditAccount | null>(null);
  const [viewingHistory, setViewingHistory] = useState<CreditAccount | null>(
    null
  );

  // Estados para Recordatorio por Gmail / Correo
  const [reminderCredit, setReminderCredit] = useState<CreditAccount | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success: boolean; msg: string } | null>(null);

  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<
    'Efectivo' | 'Tarjeta' | 'Transferencia'
  >('Efectivo');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');

  const openPaymentModal = (cred: CreditAccount) => {
    setPayingCredit(cred);
    setPayAmount(cred.balance.toFixed(2));
    setPayMethod('Efectivo');
    setPayNotes('Abono a factura a crédito.');
    setPayError('');
  };

  const openReminderModal = (cred: CreditAccount) => {
    setReminderCredit(cred);
    const cli = clients.find(
      (c) => c.id === cred.clientId || c.name.toLowerCase() === cred.clientName.toLowerCase()
    );
    const mail = cli?.email || '';
    setRecipientEmail(mail);
    setEmailSubject(`Recordatorio de Pago Pendiente - ${config.companyName || 'Sync Connect'} (Factura #${cred.invoiceNumber})`);
    setEmailMessage(
      `Estimado/a ${cred.clientName},\n\n` +
      `Le saludamos de ${config.companyName || 'Sync Connect'} para recordarle cordialmente que presenta un saldo pendiente de pago por valor de ${formatCurrency(cred.balance, config.currencySymbol)} correspondiente a la factura #${cred.invoiceNumber}.\n\n` +
      `• Vencimiento: ${cred.dueDate}\n` +
      `• Saldo pendiente: ${formatCurrency(cred.balance, config.currencySymbol)}\n\n` +
      `Agradecemos coordinar su pago a la brevedad posible. Si ya realizó este abono recientemente, por favor haga caso omiso de este mensaje.\n\n` +
      `Atentamente,\n${config.companyName || 'Sync Connect'}`
    );
    setEmailStatus(null);
  };

  const handleSendReminderViaGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderCredit) return;
    if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
      setEmailStatus({ success: false, msg: 'Por favor ingrese una dirección de correo válida para el cliente.' });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      let token = getGoogleAccessToken();
      if (!token) {
        // Solicitar autorización con Google para envío de correos
        const authRes = await googleSignIn({ requestGmailScope: true });
        token = authRes?.accessToken;
      }

      if (!token) {
        setEmailStatus({
          success: false,
          msg: 'Se requiere iniciar sesión con Google para enviar correos desde su cuenta de Gmail.',
        });
        setIsSendingEmail(false);
        return;
      }

      const htmlBody = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff; color: #1e293b;">
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #1e3a8a; margin: 0; font-size: 20px;">${config.companyName || 'Sync Connect'}</h2>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Aviso de Cobranza y Recordatorio de Pago</p>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6;">
            Estimado/a <strong>${reminderCredit.clientName}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Esperamos que se encuentre bien. Le escribimos cordialmente para compartirle el estado de su cuenta a crédito:
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Comprobante / Factura:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #0f172a;">${reminderCredit.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Fecha de Vencimiento:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #dc2626;">${reminderCredit.dueDate}</td>
              </tr>
              <tr style="border-top: 1px dashed #cbd5e1;">
                <td style="padding: 8px 0; font-weight: bold; font-size: 15px; color: #0f172a;">Saldo Pendiente:</td>
                <td style="padding: 8px 0; font-weight: bold; font-size: 16px; text-align: right; color: #2563eb;">${formatCurrency(reminderCredit.balance, config.currencySymbol)}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            Agradecemos coordinar su pago a la brevedad. Si ya realizó este abono recientemente, por favor haga caso omiso de este aviso.
          </p>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <strong>${config.companyName || 'Sync Connect'}</strong><br/>
            ${config.phone ? `Teléfono / WhatsApp: ${config.phone}<br/>` : ''}
            ${config.email ? `Correo: ${config.email}` : ''}
          </div>
        </div>
      `;

      const sendResult = await sendGmailMessage(recipientEmail, emailSubject, htmlBody);
      if (sendResult.success) {
        setEmailStatus({ success: true, msg: `✓ Recordatorio enviado con éxito a ${recipientEmail} vía Gmail.` });
        setTimeout(() => {
          setReminderCredit(null);
        }, 1800);
      } else {
        setEmailStatus({ success: false, msg: `Error al enviar correo: ${sendResult.error || 'Verifique conexión'}` });
      }
    } catch (err: unknown) {
      setEmailStatus({ success: false, msg: err instanceof Error ? err.message : 'Error inesperado al conectar con Gmail' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCredit) return;
    const amt = parseFloat(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setPayError('Ingrese un monto de abono mayor a 0.');
      return;
    }
    if (amt > payingCredit.balance + 0.001) {
      setPayError(
        `El abono no puede superar el saldo pendiente (${formatCurrency(
          payingCredit.balance,
          config.currencySymbol
        )}).`
      );
      return;
    }

    onRegisterCreditPayment({
      creditId: payingCredit.id,
      amount: amt,
      paymentMethod: payMethod,
      notes: payNotes.trim() || 'Abono en caja.',
    });
    setPayingCredit(null);
  };

  const filtered = credits.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      c.clientName.toLowerCase().includes(q) ||
      c.invoiceNumber.toLowerCase().includes(q);
    const matchSt = statusFilter === 'ALL' || c.status === statusFilter;
    return matchQ && matchSt;
  });

  const totalPending = credits.reduce((s, c) => s + c.balance, 0);
  const overdueAmount = credits
    .filter((c) => c.status === 'Vencido')
    .reduce((s, c) => s + c.balance, 0);
  const totalCollected = credits.reduce((s, c) => s + c.paidAmount, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Créditos y Cuentas por Cobrar"
        description="Control de cartera de clientes, vencimientos, estado de cuenta y recepción de abonos."
      />

      <SummaryStrip
        items={[
          {
            label: 'Cartera Total por Cobrar',
            value: formatCurrency(totalPending, config.currencySymbol),
            subtext: `${
              credits.filter((c) => c.balance > 0).length
            } obligaciones pendientes`,
            tone: 'primary',
          },
          {
            label: 'Cartera en Mora (Vencida)',
            value: formatCurrency(overdueAmount, config.currencySymbol),
            subtext: 'Cuentas con fecha límite superada',
            tone: overdueAmount > 0 ? 'danger' : 'success',
          },
          {
            label: 'Total Recaudado en Abonos',
            value: formatCurrency(totalCollected, config.currencySymbol),
            subtext: 'Pagos parciales y totales recibidos',
            tone: 'success',
          },
          {
            label: 'Cuentas Liquidadas',
            value: credits.filter((c) => c.status === 'Pagado').length,
            subtext: 'Créditos pagados en su totalidad',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Buscar cuenta por nombre de cliente o número de factura..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            label: 'Estado de Cartera',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'ALL', label: 'Todos los estados' },
              { value: 'Vigente', label: 'Vigentes' },
              { value: 'Vencido', label: 'Vencidos (En Mora)' },
              { value: 'Pagado', label: 'Pagados' },
            ],
          },
        ]}
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Factura</th>
                <th className="py-2.5 px-3 font-semibold">Cliente</th>
                <th className="py-2.5 px-3 font-semibold">Emisión</th>
                <th className="py-2.5 px-3 font-semibold">Vencimiento</th>
                <th className="py-2.5 px-3 font-semibold text-right">Monto Inicial</th>
                <th className="py-2.5 px-3 font-semibold text-right">Abonado</th>
                <th className="py-2.5 px-3 font-semibold text-right">Saldo Pendiente</th>
                <th className="py-2.5 px-3 font-semibold">Estado</th>
                <th className="py-2.5 px-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((cred) => (
                <tr key={cred.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {cred.invoiceNumber}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">
                      {cred.clientName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tel: {cred.clientPhone}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {cred.issueDate}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-800 whitespace-nowrap">
                    {cred.dueDate}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {formatCurrency(cred.totalAmount, config.currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                    {formatCurrency(cred.paidAmount, config.currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(cred.balance, config.currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        cred.status === 'Pagado'
                          ? 'text-emerald-700'
                          : cred.status === 'Vencido'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {cred.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewingHistory(cred)}
                        className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Abonos ({cred.payments.length})
                      </button>
                      {cred.balance > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => openReminderModal(cred)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Enviar recordatorio de pago a este cliente por Gmail"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Recordatorio
                          </button>
                          <button
                            type="button"
                            onClick={() => openPaymentModal(cred)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Abonar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Abono */}
      <Modal
        isOpen={!!payingCredit}
        title={`Registrar Abono — ${payingCredit?.invoiceNumber}`}
        subtitle={`Cliente: ${payingCredit?.clientName}`}
        onClose={() => setPayingCredit(null)}
        maxWidth="sm"
      >
        {payingCredit && (
          <form onSubmit={handlePaymentSubmit} className="space-y-3.5 text-xs">
            {payError && (
              <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 rounded">
                {payError}
              </div>
            )}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="font-sans text-slate-600">Deuda Original:</span>
                <span>
                  {formatCurrency(
                    payingCredit.totalAmount,
                    config.currencySymbol
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-slate-600">Total Abonado:</span>
                <span className="text-emerald-700">
                  {formatCurrency(
                    payingCredit.paidAmount,
                    config.currencySymbol
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span className="font-sans">Saldo Pendiente:</span>
                <span>
                  {formatCurrency(payingCredit.balance, config.currencySymbol)}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Monto a Abonar ({config.currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={payingCredit.balance}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Método de Pago *
              </label>
              <select
                value={payMethod}
                onChange={(e) =>
                  setPayMethod(
                    e.target.value as 'Efectivo' | 'Tarjeta' | 'Transferencia'
                  )
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="Efectivo">Efectivo (Ingresa a Caja)</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Tarjeta">Tarjeta Débito / Crédito</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Observación / Referencia de Recibo
              </label>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPayingCredit(null)}
                className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Confirmar Pago
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Historial de Abonos */}
      <Modal
        isOpen={!!viewingHistory}
        title={`Historial de Abonos — ${viewingHistory?.invoiceNumber}`}
        subtitle={`Cliente: ${viewingHistory?.clientName}`}
        onClose={() => setViewingHistory(null)}
        maxWidth="md"
        footer={
          <button
            type="button"
            onClick={() => setViewingHistory(null)}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-800 text-white"
          >
            Cerrar
          </button>
        }
      >
        {viewingHistory && (
          <div className="space-y-3 text-xs">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                <tr>
                  <th className="py-2 px-3">Fecha / Hora</th>
                  <th className="py-2 px-3">Método</th>
                  <th className="py-2 px-3">Recibido por</th>
                  <th className="py-2 px-3 text-right">Monto Abonado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {viewingHistory.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 px-3">
                      {p.date} · {p.time}
                    </td>
                    <td className="py-2 px-3 font-sans">{p.paymentMethod}</td>
                    <td className="py-2 px-3 font-sans">{p.receivedBy}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">
                      {formatCurrency(p.amount, config.currencySymbol)}
                    </td>
                  </tr>
                ))}
                {viewingHistory.payments.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center font-sans text-slate-500"
                    >
                      No se han registrado abonos para esta obligación.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Modal Enviar Recordatorio de Cobro por Gmail */}
      <Modal
        isOpen={!!reminderCredit}
        title="Enviar Recordatorio de Pago por Gmail"
        subtitle={`Factura ${reminderCredit?.invoiceNumber} · Cliente: ${reminderCredit?.clientName}`}
        onClose={() => setReminderCredit(null)}
        maxWidth="md"
      >
        {reminderCredit && (
          <form onSubmit={handleSendReminderViaGmail} className="space-y-4 text-xs">
            {emailStatus && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  emailStatus.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {emailStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{emailStatus.msg}</span>
              </div>
            )}

            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px]">Saldo Pendiente a Cobrar:</span>
                <strong className="text-blue-900 text-base font-bold font-mono">
                  {formatCurrency(reminderCredit.balance, config.currencySymbol)}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Vencimiento:</span>
                <span className="font-semibold text-slate-800 font-mono">{reminderCredit.dueDate}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Correo Electrónico del Cliente *
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-700"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                El correo se enviará oficialmente a través de su cuenta de Gmail autorizada.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Asunto del Correo *
              </label>
              <input
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mensaje de Recordatorio
              </label>
              <textarea
                rows={5}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-sans focus:outline-none focus:border-blue-700 leading-relaxed"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-200">
              {reminderCredit.clientPhone ? (
                <a
                  href={`https://wa.me/${reminderCredit.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    emailMessage
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </a>
              ) : <div />}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setReminderCredit(null)}
                  className="w-full sm:w-auto px-3.5 py-2 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingEmail ? 'Despachando por Gmail...' : 'Enviar por Gmail'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
