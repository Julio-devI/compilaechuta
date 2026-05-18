import { Download } from 'lucide-react';
import { useState } from 'react';

export interface ClientFilters {
  rfmSegment?: string;
  lastOrderDateFloor?: string;
  lastOrderDateCeil?: string;
  averageTicketFloor?: number;
  averageTicketCeil?: number;
  region?: string;
  ltvFloor?: number;
  ltvCeil?: number;
}

export interface OrderFilters {
  orderStatus?: string;
  orderIdDisplay?: string;
  orderDateFloor?: string;
  orderDateCeil?: string;
  productName?: string;
  ticketStatus?: string;
}

export interface ProductFilters { 
  productName?: string;
  category?: string;
  status?: string;
  price_min?: number;
  price_max?: number;
}

type FiltersType = ClientFilters | OrderFilters | ProductFilters;

interface ExportCsvButtonProps<T extends FiltersType = FiltersType> {
  type: 'client' | 'order' | 'product';
  filters: T;
  endpoint: string;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function ExportCsvButton<T extends FiltersType = FiltersType>({
  type,
  filters,
  endpoint,
  onSuccess,
  onError,
}: ExportCsvButtonProps<T>) {
  const [isLoading, setIsLoading] = useState(false);

  const formatPayload = (rawFilters: T) => {
    if (type === 'client') {

      const clientFilters = rawFilters as ClientFilters;
      return {
        ticket_min: clientFilters.averageTicketFloor,
        ticket_max: clientFilters.averageTicketCeil,
        lvt_min: clientFilters.ltvFloor,
        lvt_max: clientFilters.ltvCeil,
        data_inicio: clientFilters.lastOrderDateFloor,
        data_fim: clientFilters.lastOrderDateCeil,
        regiao: clientFilters.region,
        status: clientFilters.rfmSegment,
      };
    }

    else if (type === 'order') {

      const orderFilters = rawFilters as OrderFilters;
      return {
        status: orderFilters.orderStatus,
        id_pedido_display: orderFilters.orderIdDisplay,
        data_inicio: orderFilters.orderDateFloor,
        data_fim: orderFilters.orderDateCeil,
        nome_produto: orderFilters.productName,
        status_ticket: orderFilters.ticketStatus?.toLowerCase(),
      };
    }

    else if (type === 'product') {

      const productFilters = rawFilters as ProductFilters;
      return {
        nome_produto: productFilters.productName,
        categoria: productFilters.category,
        status: productFilters.status,
        preco_min: productFilters.price_min,
        preco_max: productFilters.price_max,
      };
    }

    return {};
  };

  const handleExport = async () => {
    try {
      setIsLoading(true);

      const mappedBody = formatPayload(filters);
      const query = new URLSearchParams(
        Object.entries(mappedBody)
          .filter(([, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => [key, String(value)])
      ).toString();

      const response = await fetch(`${endpoint}?${query}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Erro ao exportar: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = type === 'client' ? `clientes_${new Date().getTime()}.csv` : type === 'order' ? `pedidos_${new Date().getTime()}.csv` : `produtos_${new Date().getTime()}.csv`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      onSuccess?.('Arquivo exportado com sucesso!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      onError?.(errorMessage);
      console.error('Erro ao exportar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2.5 bg-background border border-border rounded-4xl text-[#6B7588] font-medium hover:bg-card shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Exportando...' : 'Exportar CSV'}
    </button>
  );
}



