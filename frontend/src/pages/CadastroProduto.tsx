import { useState, useEffect } from "react";
import { ArrowLeft, Save, Box, DollarSign, BarChart2, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { criarProduto, getFornecedores, ProdutoPayload } from "../services/productService";
import { getCategorias } from "../services/categoryService";

export function CadastroProduto() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoriasLista, setCategoriasLista] = useState<string[]>([]);
  const [fornecedoresLista, setFornecedoresLista] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    nome_produto: "",
    categoria: "",
    fornecedor: "",
    preco: "",
    peso_kg: "",
    estoque_disponivel: "",
    ativo: "Ativo",
    precisa_revisao: "Não",
    estoque: "",
  });

  useEffect(() => {
    getCategorias().then((data) => {
      setCategoriasLista(data.map((c: any) => c.nome_categoria));
    });
  }, []);

  useEffect(() => {
    getFornecedores().then((data) => {
      setFornecedoresLista(data);
    });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "preco" || name === "peso_kg") {
      let valorFiltrado = value.replace(/\./g, ",").replace(/[^0-9,]/g, "");

      const partes = valorFiltrado.split(",");
      if (partes.length > 2) {
        valorFiltrado = partes[0] + "," + partes.slice(1).join("");
      }

      setFormData((prev) => ({ ...prev, [name]: valorFiltrado }));
      return;
    }

    // Comportamento normal para os outros campos (nome, categoria, etc.)
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  setIsSubmitting(true);

  const precoFormatado =
    parseFloat(formData.preco.replace(/\./g, "").replace(",", ".")) || 0;

  const pesoFormatado = parseFloat(formData.peso_kg.replace(",", ".")) || 0;

  const payload: ProdutoPayload = {
    nome_produto: formData.nome_produto,
    categoria: formData.categoria || "Outros",
    fornecedor: formData.fornecedor || "Não informado",
    preco: precoFormatado,
    peso_kg: pesoFormatado,
    estoque_disponivel: parseInt(formData.estoque) || 0,
    ativo: formData.ativo === "Ativo" ? "Sim" : "Não",
    precisa_revisao:
      formData.precisa_revisao === "Sim" || formData.precisa_revisao === "true"
        ? "Sim"
        : "Não",
  };

  const sucesso = await criarProduto(payload);

  if (sucesso) {
    navigate("/produtos");
  } else {
    console.error("Erro ao cadastrar produto. Verifique o payload e a API.");
  }

  setIsSubmitting(false);
};;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/produtos")}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-[#020854]">Novo Produto</h1>
            <p className="text-slate-500 text-sm mt-1">
              Preencha as informações para cadastrar um novo item no catálogo.
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-[#1E5EFF] text-white px-8 py-3.5 rounded-full font-black hover:bg-[#1E5EFF]/90 transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {isSubmitting ? "Salvando..." : "Salvar Produto"}
        </button>
      </div>

      {/* Espaço do Formulário principal */}
      <div className="space-y-6">
        {/* LINHA 1: Informações Básicas (2/3) + Status do Produto (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Informações Básicas */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-black text-[#020854] mb-6 flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" /> Informações Básicas
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Nome do Produto*
                  </label>
                  <input
                    type="text"
                    name="nome_produto"
                    value={formData.nome_produto}
                    onChange={handleChange}
                    placeholder="Ex: Smart TV 55 QLED 4K"
                    className="w-full p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Fornecedor
                    </label>
                    <div className="relative">
                      <select
                        name="fornecedor"
                        value={formData.fornecedor}
                        onChange={handleChange}
                        className="w-full p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700 appearance-none"
                      >
                        <option value="">Selecione um fonecedor</option>
                        {fornecedoresLista.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Categoria
                    </label>
                    <div className="relative">
                      <select
                        name="categoria"
                        value={formData.categoria}
                        onChange={handleChange}
                        className="w-full p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700 appearance-none"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categoriasLista.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status do Produto (Alinhado perfeitamente em altura com items-stretch) */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-black text-[#020854] mb-6 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-orange-500" /> Status do
                Produto
              </h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="ativo" // Alterado de "status" para "ativo" para casar com o seu estado formData.ativo
                    value="Ativo"
                    checked={formData.ativo === "Ativo"}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-bold text-slate-700">Ativo</p>
                    <p className="text-xs text-slate-500 font-medium">
                      O produto será exibido na loja.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="ativo" // Alterado de "status" para "ativo" para casar com o seu estado formData.ativo
                    value="Inativo"
                    checked={formData.ativo === "Inativo"}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-bold text-slate-700">Inativo</p>
                    <p className="text-xs text-slate-500 font-medium">
                      Oculto do catálogo e da loja.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 w-full">
          <h2 className="text-xl font-black text-[#020854] mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" /> Preço e Estoque
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Preço (R$)*
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  R$
                </span>
                <input
                  type="text"
                  name="preco"
                  value={formData.preco}
                  onChange={handleChange}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-black text-slate-800"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Peso do produto (kg)*
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  Kg
                </span>
                <input
                  type="text"
                  name="peso_kg"
                  value={formData.peso_kg}
                  onChange={handleChange}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-black text-slate-800"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Quantidade em Estoque*
              </label>
              <div className="relative">
                <Box className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  name="estoque"
                  value={formData.estoque}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold text-slate-700"
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
