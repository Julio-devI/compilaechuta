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
  clientType?: string;
  orderDateFloor?: string;
  orderDateCeil?: string;
  ticketStatus?: string;
  productName?: string;
  productIdDisplay?: string;
}

type FiltersType = ClientFilters | OrderFilters;

interface ExportCsvButtonProps<T extends FiltersType = FiltersType> {
  filters: T;
  endpoint: string;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function ExportCsvButton<T extends FiltersType = FiltersType>({
  filters,
  endpoint,
  onSuccess,
  onError,
}: ExportCsvButtonProps<T>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`Erro ao exportar: ${response.statusText}`);
      }

      // Para download de arquivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export_${new Date().getTime()}.csv`;
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



