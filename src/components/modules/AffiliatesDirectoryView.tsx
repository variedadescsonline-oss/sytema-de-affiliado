import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Package,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldCheck,
  Send,
  Building,
  TrendingUp,
} from 'lucide-react';
import { SystemUser, AffiliateOrder } from '../../types/erp';

interface AffiliatesDirectoryViewProps {
  affiliates: SystemUser[];
  orders: AffiliateOrder[];
  onToggleAffiliateStatus?: (userId: string) => void;
  onOpenGmailComposer?: (recipientEmail: string, affiliateName: string) => void;
  exchangeRate?: number;
}

export const AffiliatesDirectoryView: React.FC<AffiliatesDirectoryViewProps> = ({
  affiliates,
  orders,
  onToggleAffiliateStatus,
  onOpenGmailComposer,
  exchangeRate = 37,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAffiliateOrders, setSelectedAffiliateOrders] = useState<SystemUser | null>(null);

  const filteredAffiliates = useMemo(() => {
    return affiliates.filter((a) => {
      const q = searchQuery.toLowerCase();
      return (
        a.fullName.toLowerCase().includes(q) ||
        (a.cedula && a.cedula.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        a.username.toLowerCase().includes(q) ||
        (a.phone && a.phone.includes(q))
      );
    });
  }, [affiliates, searchQuery]);

  // Aggregate stats
  const directoryStats = useMemo(() => {
    const totalAffiliates = affiliates.length;
    const activeAffiliates = affiliates.filter((a) => a.active !== false).length;
    const totalOrdersPlaced = orders.length;
    const validOrders = orders.filter((o) => o.status !== 'Cancelado');
    const totalSalesAmount = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCommissionsDistributed = validOrders.reduce((sum, o) => sum + (o.affiliateCommissionTotal || 0), 0);

    return {
      totalAffiliates,
      activeAffiliates,
      totalOrdersPlaced,
      totalSalesAmount,
      totalCommissionsDistributed,
    };
  }, [affiliates, orders]);

  // Orders for the selected affiliate modal
  const affiliateDetailOrders = useMemo(() => {
    if (!selectedAffiliateOrders) return [];
    return orders.filter(
      (o) =>
        o.affiliateId === selectedAffiliateOrders.id ||
        (selectedAffiliateOrders.email && o.affiliateEmail?.toLowerCase() === selectedAffiliateOrders.email.toLowerCase())
    );
  }, [orders, selectedAffiliateOrders]);

  return (
    <div className="space-y-6">
      {/* CABECERA DIRECTORIO DE AFILIADOS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full uppercase tracking-wider">
              Control de Vendedores
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-600">VARIEDADES CS</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Directorio de Afiliados & Vendedores</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro completo de vendedores afiliados, cédulas de identidad, pedidos realizados y comisiones devengadas.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cédula, nombre, email..."
            className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 w-64"
          />
        </div>
      </div>

      {/* METRICAS DE LA RED DE AFILIADOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Afiliados Activos</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900">{directoryStats.activeAffiliates}</span>
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {directoryStats.totalAffiliates} registrados en total
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Ventas de Afiliados</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600">
              ${directoryStats.totalSalesAmount.toFixed(2)}
            </span>
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            ≈ C$ {(directoryStats.totalSalesAmount * exchangeRate).toFixed(2)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Pedidos de la Red</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900">{directoryStats.totalOrdersPlaced}</span>
            <Package className="w-6 h-6 text-purple-600" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Total pedidos generados
          </span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider block">Comisiones Totales</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-extrabold text-blue-900">
              ${directoryStats.totalCommissionsDistributed.toFixed(2)}
            </span>
            <TrendingUp className="w-6 h-6 text-blue-700" />
          </div>
          <span className="text-[10px] text-blue-600 font-medium block mt-0.5">
            Liquidación en variedadescs.online@gmail.com
          </span>
        </div>
      </div>

      {/* TABLA DE AFILIADOS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {filteredAffiliates.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No se encontraron afiliados registrados</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Los nuevos vendedores pueden registrarse en el portal de acceso.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Cédula / Documento</th>
                  <th className="py-2.5 px-3">Nombre Completo</th>
                  <th className="py-2.5 px-3">Teléfono / WhatsApp</th>
                  <th className="py-2.5 px-3">Correo Electrónico</th>
                  <th className="py-2.5 px-3">Dirección / Ciudad</th>
                  <th className="py-2.5 px-3 text-center">Pedidos</th>
                  <th className="py-2.5 px-3 text-right">Ventas Generadas</th>
                  <th className="py-2.5 px-3 text-right">Comisión Devengada</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAffiliates.map((aff) => {
                  const affOrders = orders.filter(
                    (o) => o.affiliateId === aff.id || (aff.email && o.affiliateEmail?.toLowerCase() === aff.email.toLowerCase())
                  );
                  const validOrders = affOrders.filter((o) => o.status !== 'Cancelado');
                  const totalSold = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                  const totalEarned = validOrders.reduce((sum, o) => sum + (o.affiliateCommissionTotal || 0), 0);

                  return (
                    <tr key={aff.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {aff.cedula || 'Sin cédula'}
                      </td>
                      <td className="py-3 px-3">
                        <strong className="text-slate-900 block font-semibold">{aff.fullName}</strong>
                        <span className="text-[10px] text-slate-400">@{aff.username}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {aff.phone || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {aff.email}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={aff.address || 'No especificada'}>
                        {aff.address || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedAffiliateOrders(aff)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-100 text-blue-700 font-bold text-xs cursor-pointer"
                        >
                          {affOrders.length} pedidos
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ${totalSold.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-emerald-700">
                        +${totalEarned.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            aff.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {aff.active !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedAffiliateOrders(aff)}
                            title="Ver pedidos de este afiliado"
                            className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {onOpenGmailComposer && aff.email && (
                            <button
                              type="button"
                              onClick={() => onOpenGmailComposer(aff.email, aff.fullName)}
                              title="Enviar correo por Gmail"
                              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL HISTORIAL DE PEDIDOS DEL AFILIADO */}
      {selectedAffiliateOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Historial de Pedidos de Afiliado
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedAffiliateOrders.fullName} (Cédula: {selectedAffiliateOrders.cedula || 'N/A'})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAffiliateOrders(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="text-slate-400 block text-[10px]">Teléfono:</span>
                <span className="font-semibold text-slate-800">{selectedAffiliateOrders.phone || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Email:</span>
                <span className="font-semibold text-slate-800">{selectedAffiliateOrders.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Dirección:</span>
                <span className="font-semibold text-slate-800">{selectedAffiliateOrders.address || '-'}</span>
              </div>
            </div>

            {affiliateDetailOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                Este afiliado aún no ha enviado pedidos de clientes.
              </p>
            ) : (
              <div className="space-y-2">
                {affiliateDetailOrders.map((ord) => (
                  <div key={ord.id} className="p-3 border border-slate-200 rounded-lg space-y-1.5 text-xs hover:bg-slate-50/50">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-blue-700">{ord.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {ord.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Cliente: <strong>{ord.customerName}</strong> ({ord.customerPhone})</span>
                      <span className="text-slate-900 font-bold">${ord.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Entrega: {ord.customerAddress}</span>
                      <span className="text-emerald-700 font-bold">Comisión: +${ord.affiliateCommissionTotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedAffiliateOrders(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer mt-2"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
