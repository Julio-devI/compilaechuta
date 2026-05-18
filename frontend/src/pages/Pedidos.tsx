import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, ChevronDown, ChevronUp, History,
  CheckCircle2, Database, Box, Calendar, ArrowDown, ArrowUp,
  Filter, Ticket, Table, Grid
} from 'lucide-react'
import { ModalDetalhesPedido } from '../components/ModalDetalhesPedido'
import { ExportCsvButton, OrderFilters } from '../components/ExportCsvButton'
import { Toaster, toast } from 'react-hot-toast'
import { getPedidos, FiltrosPedidos } from '../services/orderService'

// --- Interfaces ---
// Mantemos a interface do layout original para não quebrar os cards
interface Pedido {
  id: string
  idReal: string
  cliente: string
  cidade: string
  estado: string
  produtos: number
  valor: string
  data: string
  status: 'Atrasado' | 'No prazo' | string
  recorrente: boolean
  ticket: number
  tempoAberto: string
  progresso: number
  mediaEstrelas: number
  totalPedidosCliente: number
  nomeProduto: string
  valorUnitario: string
  skuProduto: string
  metodo_pagamento: string
}

type SortConfig = {
  key: string | null;
  direction: "ascending" | "descending";
};

const getStatusStyle = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  switch (normalizedStatus) {
    case "aprovado":
      return {
        bg: "bg-background dark:bg-card text-purple-600",
        dot: "bg-purple-500",
      };
    case "processando":
      return {
        bg: "bg-background dark:bg-card text-orange-600",
        dot: "bg-orange-500",
      };
    case "recusado":
    case "atrasado": // Cor mapeada para o seu mock
      return {
        bg: "bg-background dark:bg-card text-red-600",
        dot: "bg-red-500",
      };
    case "reembolsado":
      return {
        bg: "bg-background dark:bg-card text-blue-600",
        dot: "bg-blue-500",
      };
    case "no prazo": // Cor mapeada para o seu mock
      return {
        bg: "bg-background dark:bg-card text-emerald-600",
        dot: "bg-emerald-500",
      };
    default:
      return {
        bg: "bg-background dark:bg-card text-slate-600",
        dot: "bg-slate-500",
      };
  }
};

export function Pedidos() {
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null)
  const [isFiltrosOpen, setIsFiltrosOpen] = useState(true)
  const [viewMode, setViewMode] = useState<'tabela' | 'grade'>('tabela')
  const [isLoading, setIsLoading] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' });

  // --- API State ---
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20

  // --- Filter State ---
  const [searchTerm, setSearchTerm] = useState('')
  const [productNameFilter, setProductNameFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [tipoClienteFilter] = useState<string>('')  // kept for type compat; no UI setter
  const [periodoFilter, setPeriodoFilter] = useState<string>('Todos')
  const [ticketFilter, setTicketFilter] = useState<string>('')
  const [dataInicioFilter, setDataInicioFilter] = useState<string>("");
  const [dataFimFilter, setDataFimFilter] = useState<string>("");

  const statusStyles: Record<string, string> = {
    Aprovado: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Processando: "bg-orange-50 text-orange-600 border-orange-100",
    Recusado: "bg-red-50 text-red-600 border-red-100",
    Reembolsado: "bg-blue-50 text-blue-600 border-blue-100",
    default: "bg-slate-50 text-slate-600 border-slate-100",
  };

  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const SortIcon = ({ columnKey, sortConfig }: { columnKey: string, sortConfig: SortConfig }) => {
    if (sortConfig.key !== columnKey)
      return <ArrowUp className="w-4 h-4 text-white ml-auto opacity-30" />;

    return sortConfig.direction === "ascending" ? (
      <ArrowUp className="w-4 h-4 text-white ml-auto" />
    ) : (
      <ArrowDown className="w-4 h-4 text-white ml-auto" />
    );
  };

  const fetchPedidosData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filtros: FiltrosPedidos = {
        id_pedido_display: searchTerm || undefined,
        status: statusFilter || undefined,
        tipo_cliente: tipoClienteFilter || undefined,
        data_inicio: dataInicioFilter || undefined,
        data_fim: dataFimFilter || undefined,
        nome_produto: productNameFilter || undefined,
        status_ticket:
          ticketFilter === "Aberto"
            ? "aberto"
            : ticketFilter === "Finalizado"
              ? "resolvido"
              : undefined,
      };

      const res = await getPedidos((page - 1) * pageSize, pageSize, filtros);

      const pedidosMapeados: Pedido[] = res.data.map((p) => ({
        id: p.id,
        idReal: p.idReal,
        cliente: p.cliente,
        cidade: p.cidade,
        estado: p.estado,
        produtos: p.produtos,
        valor: p.valor,
        data: p.data,
        status: p.status,
        recorrente: p.recorrente,
        ticket: p.ticket,
        tempoAberto: p.tempoAberto,
        progresso: p.progresso,
        mediaEstrelas: p.mediaEstrelas,
        totalPedidosCliente: p.totalPedidosCliente,
        nomeProduto: p.nomeProduto,
        valorUnitario: p.valorUnitario,
        skuProduto: p.skuProduto,
        metodo_pagamento: p.metodo_pagamento,
      }));

      setPedidos(pedidosMapeados);
      console.log(res.total);
      setTotalItems(res.total);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    searchTerm,
    statusFilter,
    tipoClienteFilter,
    ticketFilter,
    periodoFilter,
    dataInicioFilter,
    dataFimFilter,
    productNameFilter,
  ]);

  const getFormattedDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handlePeriodoPreset = (periodo: string) => {
    setPeriodoFilter(periodo);
    const hoje = new Date();

    switch (periodo) {
      case "Hoje":
        const hojeStr = getFormattedDate(hoje);
        setDataInicioFilter(hojeStr);
        setDataFimFilter(hojeStr);
        break;
      case "Últimos 7 dias":
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(hoje.getDate() - 7);
        setDataInicioFilter(getFormattedDate(seteDiasAtras));
        setDataFimFilter(getFormattedDate(hoje));
        break;
      case "Todos":
        setDataInicioFilter("");
        setDataFimFilter("");
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchPedidosData()
    }, 500)
    return () => clearTimeout(handler)
  }, [fetchPedidosData])

  // Reset pagination when filters or search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, productNameFilter, periodoFilter, ticketFilter, dataInicioFilter, dataFimFilter])

  const handleViewChange = (mode: 'tabela' | 'grade') => {
    if (viewMode === mode) return;

    setIsLoading(true);
    setViewMode(mode);

    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const toggleStatus = (label: string) => setStatusFilter(prev => prev === label ? '' : label)
  const toggleTicket = (label: string) => setTicketFilter(prev => prev === label ? '' : label)

  const rawDataSource = pedidos.length > 0 ? pedidos : [];

  const dataSource = useMemo(() => {
    if (!sortConfig.key) return rawDataSource;

    return [...rawDataSource].sort((a: any, b: any) => {
      let aValue = a[sortConfig.key as string];
      let bValue = b[sortConfig.key as string];

      // Ajuste para valores monetários
      if (sortConfig.key === "valor" && typeof aValue === "string") {
        aValue = parseFloat(aValue.replace(/[R$\s.]/g, "").replace(",", "."));
        bValue = parseFloat(bValue.replace(/[R$\s.]/g, "").replace(",", "."));
      }

      if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  }, [rawDataSource, sortConfig]);

  const PedidoCardSkeleton = () => (
    <div className="bg-card p-6 rounded-3xl border border-border animate-pulse flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-2 w-1/2">
            <div className="h-6 bg-slate-200 rounded w-full"></div>
            <div className="h-3 bg-slate-200 rounded w-2/3"></div>
          </div>
          <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
        </div>

        <div className="bg-background rounded-2xl p-4 mb-4 space-y-2">
          <div className="h-5 bg-slate-200 rounded w-3/4"></div>
          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-4 w-16 bg-slate-200 rounded"></div>
            <div className="h-4 w-12 bg-slate-200 rounded"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 w-20 bg-slate-200 rounded"></div>
            <div className="h-5 w-24 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-1 justify-center">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div className="w-5 h-5 rounded-full bg-slate-200"></div>
              {step < 5 && <div className="w-3 h-0.5 bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-8 font-sans text-foreground">
      <h1 className="text-4xl font-bold text-[#020854] dark:text-foreground mb-8">
        Pedidos
      </h1>

      {/* 1. Database Search Card */}
      <div className="bg-card rounded-3xl p-6 shadow-sm border-0 mb-6">
        <div className="flex justify-between items-center mb-4">
          <ExportCsvButton<OrderFilters>
            type="order"
            filters={{
              orderStatus: statusFilter,
              orderIdDisplay: searchTerm,
              orderDateFloor: dataInicioFilter,
              orderDateCeil: dataFimFilter,
              productName: productNameFilter,
              ticketStatus: ticketFilter === "Finalizado" ? "resolvido" : undefined,
            }}
            endpoint="http://localhost:8000/api/v1/orders/exportar"
            onSuccess={(msg) => toast.success(msg)}
            onError={(err) => toast.error(err)}
          />
          <Toaster position="top-right" />
          <div className="flex items-center gap-2 text-foreground font-bold">
            <span className="p-1.5 bg-background rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-muted-foreground" />
            </span>
            Consultar Database
          </div>
          <div className="text-sm font-semibold text-muted-foreground">
            Total{" "}
            <span className="text-blue-700 ml-2 font-black">
              {totalItems > 0 ? totalItems.toLocaleString("pt-BR") : 0}
            </span>
          </div>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID do pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-background rounded-2xl border-none text-foreground focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Exibindo</span>
            <span className="bg-sky-400 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {dataSource.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Seção de Filtros (Conforme Imagem) */}
      <div className="bg-card rounded-3xl shadow-sm border-0 mb-8 overflow-hidden transition-all duration-300">
        <div className="p-6 flex justify-between items-center">
          <button
            onClick={() => setIsFiltrosOpen(!isFiltrosOpen)}
            className="flex items-center gap-2 font-bold text-foreground border-none outline-none cursor-pointer hover:opacity-70 transition-opacity"
          >
            {isFiltrosOpen ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
            {isFiltrosOpen ? "Esconder Filtros" : "Mostrar Filtros"}
          </button>
          {/* {isFiltrosOpen ? (
            <Minimize2 className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Maximize2 className="w-5 h-5 text-muted-foreground" />
          )} */}
        </div>

        {isFiltrosOpen && (
          <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Coluna Esquerda */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Box className="w-4 h-4" /> Nome do Produto
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Digite o nome..."
                    value={productNameFilter}
                    onChange={(e) => setProductNameFilter(e.target.value)}
                    className="w-full p-4 bg-background rounded-2xl border-none text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <Search className="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Filter className="w-4 h-4" /> Status
                </label>
                <div className="flex flex-wrap gap-2">
                  <StatusChip
                    label="Aprovado"
                    color="bg-background dark:bg-card text-purple-600"
                    dot="bg-purple-500"
                    isActive={statusFilter === "Aprovado"}
                    onClick={() => toggleStatus("Aprovado")}
                  />
                  <StatusChip
                    label="Processando"
                    color="bg-background dark:bg-card text-orange-600"
                    dot="bg-orange-500"
                    isActive={statusFilter === "Processando"}
                    onClick={() => toggleStatus("Processando")}
                  />
                  <StatusChip
                    label="Recusado"
                    color="bg-background dark:bg-card text-red-600"
                    dot="bg-red-500"
                    isActive={statusFilter === "Recusado"}
                    onClick={() => toggleStatus("Recusado")}
                  />
                  <StatusChip
                    label="Reembolsado"
                    color="bg-background dark:bg-card text-blue-600"
                    dot="bg-blue-500"
                    isActive={statusFilter === "Reembolsado"}
                    onClick={() => toggleStatus("Reembolsado")}
                  />
                </div>
              </div>
            </div>

            {/* Coluna Direita */}
            <div>
              <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                <Calendar className="w-4 h-4" /> Período de Abertura
              </label>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                      Início
                    </span>
                    <input
                      type="date"
                      value={dataInicioFilter}
                      onChange={(e) => {
                        setDataInicioFilter(e.target.value);
                        setPeriodoFilter("Personalizado");
                      }}
                      className="w-full p-3 bg-background rounded-xl border-none text-muted-foreground outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                      Fim
                    </span>
                    <input
                      type="date"
                      value={dataFimFilter}
                      onChange={(e) => {
                        setDataFimFilter(e.target.value);
                        setPeriodoFilter("Personalizado");
                      }}
                      className="w-full p-3 bg-background rounded-xl border-none text-muted-foreground outline-none text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                    <Ticket className="w-4 h-4" /> Ticket
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleTicket("Aberto")}
                      className={`px-5 py-2.5 rounded-full text-xs font-bold ${ticketFilter === "Aberto" ? "bg-blue-600 text-white" : "bg-background text-muted-foreground"}`}
                    >
                      Aberto
                    </button>
                    <button
                      onClick={() => toggleTicket("Finalizado")}
                      className={`px-5 py-2.5 rounded-full text-xs font-bold ${ticketFilter === "Finalizado" ? "bg-blue-600 text-white" : "bg-background text-muted-foreground"}`}
                    >
                      Finalizado
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Tabela Header */}
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold text-[#020854] dark:text-foreground">
          {dataSource.length} Pedidos Encontrados
        </h2>
        <div className="flex items-center gap-2 bg-slate-200 dark:bg-border p-1 rounded-xl">
          <button
            onClick={() => handleViewChange("tabela")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border-none outline-none transition-colors cursor-pointer ${viewMode === "tabela" ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-slate-300 dark:hover:bg-background"}`}
          >
            <Table className="w-4 h-4" />
            Tabela
          </button>
          <button
            onClick={() => handleViewChange("grade")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border-none outline-none transition-colors cursor-pointer ${viewMode === "grade" ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-slate-300 dark:hover:bg-background"}`}
          >
            <Grid className="w-4 h-4" />
            Grade
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 bg-card p-4 rounded-2xl shadow-sm">
        <p className="text-sm text-muted-foreground font-medium">
          Mostrando página {page} de {Math.ceil(totalItems / pageSize) || 1}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="px-4 py-2 bg-background border border-border rounded-xl text-sm text-muted-foreground hover:bg-slate-50 disabled:opacity-50 font-bold transition-all"
          >
            Anterior
          </button>
          <span className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm">
            {page}
          </span>
          <button
            disabled={page >= Math.ceil(totalItems / pageSize)}
            onClick={() =>
              setPage((prev) =>
                Math.min(Math.ceil(totalItems / pageSize), prev + 1),
              )
            }
            className="px-4 py-2 bg-background border border-border rounded-xl text-sm text-muted-foreground hover:bg-slate-50 disabled:opacity-50 font-bold transition-all"
          >
            Próximo
          </button>
        </div>
      </div>

      {/* 4. Tabela de Conteúdo / Grid / Skeleton */}
      <div className="w-full overflow-hidden">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <PedidoCardSkeleton key={index} />
            ))}
          </div>
        ) : dataSource.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-16">
            <span className="text-2xl text-muted-foreground font-bold mb-2">
              Nenhum pedido encontrado
            </span>
            <span className="text-muted-foreground">
              Tente ajustar os filtros ou a busca.
            </span>
          </div>
        ) : viewMode === "tabela" ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="bg-[#020854] text-white">
                  <th
                    className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none cursor-pointer select-none hover:bg-blue-900 transition-colors"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center gap-2">
                      SKU Pedido{" "}
                      <SortIcon columnKey="id" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th
                    className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none cursor-pointer select-none hover:bg-blue-900 transition-colors"
                    onClick={() => handleSort("cliente")}
                  >
                    <div className="flex items-center gap-2">
                      Cliente{" "}
                      <SortIcon columnKey="cliente" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th
                    className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none cursor-pointer select-none hover:bg-blue-900 transition-colors"
                    onClick={() => handleSort("data")}
                  >
                    <div className="flex items-center gap-2">
                      Data <SortIcon columnKey="data" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th
                    className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none cursor-pointer select-none hover:bg-blue-900 transition-colors"
                    onClick={() => handleSort("produtos")}
                  >
                    <div className="flex items-center gap-2">
                      Qtd.{" "}
                      <SortIcon columnKey="produtos" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th
                    className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none cursor-pointer select-none hover:bg-blue-900 transition-colors"
                    onClick={() => handleSort("valor")}
                  >
                    <div className="flex items-center gap-2">
                      Valor{" "}
                      <SortIcon columnKey="valor" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th
                    className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none cursor-pointer select-none hover:bg-blue-900 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-2">
                      Status{" "}
                      <SortIcon columnKey="status" sortConfig={sortConfig} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {dataSource.map((pedido, idx) => (
                  <tr
                    key={idx}
                    className="bg-card group cursor-pointer hover:bg-background transition-colors"
                    onClick={() => setPedidoSelecionado(pedido)}
                  >
                    <td className="py-4 px-6 rounded-l-2xl border-0">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-blue-900 dark:text-blue-300 text-lg">
                            {pedido.id}
                          </span>
                          <span className="text-[#FFD700] text-[10px] font-black flex items-center gap-1">
                            # {pedido.ticket} TICKET
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <History className="w-3 h-3" /> metodo de pagamento
                            - {pedido.metodo_pagamento}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 border-0">
                      <div className="bg-background rounded-2xl p-4 flex items-center justify-between min-w-[240px]">
                        <div className="flex flex-col">
                          <span className="font-black text-[#020854] dark:text-foreground text-base leading-tight">
                            {pedido.cliente}
                          </span>
                          <span className="text-muted-foreground text-sm font-medium">
                            {pedido.cidade}, {pedido.estado}
                          </span>
                        </div>
                        {pedido.recorrente && (
                          <span className="bg-[#BDEBFF] text-[#0070E0] px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 rotate-180 stroke-[3px]" />
                            Recorrente
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 border-0 text-[11px]">
                      <div className="text-muted-foreground leading-tight font-medium">
                        Comprado em:
                        <br />
                        <span className="text-foreground font-bold">
                          {pedido.data}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6 border-0">
                      <span className="text-muted-foreground font-bold text-sm">
                        {pedido.produtos == -1
                          ? "Sem dados"
                          : `${pedido.produtos} itens`}
                      </span>
                    </td>

                    <td className="py-4 px-6 border-0">
                      <span className="text-blue-900 dark:text-blue-300 font-black text-lg">
                        {pedido.valor}
                      </span>
                    </td>

                    <td className="py-4 px-6 rounded-r-2xl border-0">
                      <div className="flex items-center gap-4">
                        {/* Badge de Status à Esquerda */}
                        <span
                          className={`${getStatusStyle(pedido.status).bg} px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(pedido.status).dot}`}
                          ></span>
                          {pedido.status.toUpperCase()}
                        </span>

                        {/* Pipeline de 4 Passos */}
                        <div className="flex items-center gap-1">
                          {(() => {
                            const pipelineSteps = [
                              "Processando",
                              "Reembolsado",
                              "Aprovado",
                              "Recusado",
                            ];
                            const currentStepIndex = pipelineSteps.indexOf(
                              pedido.status,
                            );

                            return pipelineSteps.map((statusName, index) => {
                              const stepNumber = index + 1;
                              const isActive = statusName === pedido.status;
                              const isCompleted = index < currentStepIndex;

                              // Cores dinâmicas baseadas no seu dicionário ou estado concluído
                              const stepStyle = isActive
                                ? statusStyles[statusName]
                                : isCompleted
                                  ? "bg-slate-700 border-slate-700 text-white"
                                  : "bg-background border-border text-muted-foreground";

                              return (
                                <div
                                  key={statusName}
                                  className="flex items-center"
                                >
                                  {/* Bolinha com Número Fixo */}
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all duration-300 ${stepStyle}`}
                                  >
                                    {stepNumber}
                                  </div>

                                  {/* Linha Conectora */}
                                  {index < pipelineSteps.length - 1 && (
                                    <div
                                      className={`w-3 h-0.5 transition-colors duration-300 ${index < currentStepIndex
                                        ? "bg-slate-700"
                                        : "bg-border"
                                        }`}
                                    />
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataSource.map((pedido) => (
              <div
                key={pedido.id}
                className="bg-card p-6 rounded-3xl border border-border flex flex-col justify-between hover:shadow-[0_4px_24px_-8px_rgba(0,110,219,0.12)] transition-shadow cursor-pointer h-full"
                onClick={() => setPedidoSelecionado(pedido)}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-blue-900 dark:text-blue-300 text-xl">
                        {pedido.id}
                      </span>
                      <span className="text-muted-foreground text-xs font-bold">
                        {pedido.data}
                      </span>
                    </div>
                    <span
                      className={`${getStatusStyle(pedido.status).bg} px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(pedido.status).dot}`}
                      ></span>
                      {pedido.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="bg-background rounded-2xl p-4 mb-4">
                    <h3 className="font-black text-[#020854] dark:text-foreground text-lg">
                      {pedido.cliente}
                    </h3>
                    <p className="text-muted-foreground text-sm font-medium">
                      {pedido.cidade}, {pedido.estado}
                    </p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-bold">
                        Produtos
                      </span>
                      <span className="font-medium text-foreground">
                        {pedido.produtos} itens
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-bold">
                        Valor Total
                      </span>
                      <span className="font-black text-blue-900 dark:text-blue-300 text-lg">
                        {pedido.valor}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex items-center gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div key={step} className="flex items-center">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2 
                          ${step < pedido.progresso
                              ? "bg-blue-900 border-blue-900 text-white"
                              : step === pedido.progresso
                                ? "bg-red-400 border-red-400 text-white"
                                : "bg-background border-border text-muted-foreground"
                            }`}
                        >
                          {step < pedido.progresso ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            step
                          )}
                        </div>
                        {step < 5 && (
                          <div
                            className={`w-3 h-0.5 ${step < pedido.progresso ? "bg-blue-900" : "bg-border"}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6 bg-card p-4 rounded-2xl shadow-sm">
        <p className="text-sm text-muted-foreground font-medium">
          Mostrando página {page} de {Math.ceil(totalItems / pageSize) || 1}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="px-4 py-2 bg-background border border-border rounded-xl text-sm text-muted-foreground hover:bg-slate-50 disabled:opacity-50 font-bold transition-all"
          >
            Anterior
          </button>
          <span className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm">
            {page}
          </span>
          <button
            disabled={page >= Math.ceil(totalItems / pageSize)}
            onClick={() =>
              setPage((prev) =>
                Math.min(Math.ceil(totalItems / pageSize), prev + 1),
              )
            }
            className="px-4 py-2 bg-background border border-border rounded-xl text-sm text-muted-foreground hover:bg-slate-50 disabled:opacity-50 font-bold transition-all"
          >
            Próximo
          </button>
        </div>
      </div>

      {/* Modal de Detalhes */}
      <ModalDetalhesPedido
        isOpen={!!pedidoSelecionado}
        onClose={() => setPedidoSelecionado(null)}
        pedido={pedidoSelecionado}
      />
    </div>
  );
}

function StatusChip({ label, color, dot, isActive, onClick }: { label: string, color: string, dot: string, isActive?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`${color} px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border-none hover:opacity-80 transition-transform ${isActive ? 'scale-105 ring-2 ring-current ring-offset-2' : ''}`}
    >
      <span className={`w-2 h-2 rounded-full ${dot}`}></span>
      {label}
    </button>
  )
}