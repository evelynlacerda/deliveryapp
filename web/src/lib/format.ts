import type { FormaPagamento, StatusPedido, TipoEntrega } from "@/types/types";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export const formatPrice = (value: number | string) =>
  brl.format(typeof value === "string" ? parseFloat(value) : value);

/** "Rua das Flores, 123 - Centro". Pedidos antigos (sem número/bairro) mostram só o endereço. */
export function textoEndereco(p: {
  endereco: string | null;
  numero?: string | null;
  bairro?: string | null;
}) {
  const rua = [p.endereco, p.numero].filter(Boolean).join(", ");
  return [rua, p.bairro].filter(Boolean).join(" - ");
}

/** "Troco para R$ 100,00" ou "Não precisa de troco"; null quando o pagamento não é em dinheiro. */
export function textoTroco(
  troco: { precisa: boolean; para: string | null } | null,
) {
  if (!troco) return null;
  return troco.precisa && troco.para
    ? `Troco para ${formatPrice(troco.para)}`
    : "Não precisa de troco";
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Data local no formato AAAA-MM-DD (o que a API espera em ?de= e ?ate=).
export type Periodo = "dia" | "semana" | "mes" | "todos";

const isoUTC = (d: Date) => d.toISOString().slice(0, 10);

/** Intervalo [de, ate] (AAAA-MM-DD) do período que contém o dia dado. Semana de segunda a domingo. */
export function intervaloDoPeriodo(
  periodo: Periodo,
  diaISO: string,
): { de?: string; ate?: string } {
  if (periodo === "todos" || !diaISO) return {};
  const [a, m, d] = diaISO.split("-").map(Number);
  if (periodo === "dia") return { de: diaISO, ate: diaISO };
  if (periodo === "mes")
    return {
      de: isoUTC(new Date(Date.UTC(a, m - 1, 1))),
      ate: isoUTC(new Date(Date.UTC(a, m, 0))),
    };
  const dia = new Date(Date.UTC(a, m - 1, d));
  const desdeSegunda = (dia.getUTCDay() + 6) % 7;
  const segunda = new Date(Date.UTC(a, m - 1, d - desdeSegunda));
  const domingo = new Date(Date.UTC(a, m - 1, d - desdeSegunda + 6));
  return { de: isoUTC(segunda), ate: isoUTC(domingo) };
}

export function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Só dígitos, sem o DDI 55 do Brasil. O 55 sai quando o valor começa com "+" ou quando o número tem
 * 13 dígitos (55 + DDD + 9 dígitos). Fora disso o 55 é o DDD de verdade (RS) e é mantido:
 * o tamanho sozinho não diz se foi digitado ou colado, então o tratamento mais agressivo fica em telefoneColado().
 */
export function normalizarTelefone(value: string) {
  const d = value.replace(/\D/g, "");
  if (!d.startsWith("55")) return d;
  const comMais = /^[^\d+]*\+/.test(value);
  return comMais || d.length === 13 ? d.slice(2) : d;
}

/**
 * Telefone vindo de um "colar": tira o DDI 55 (com ou sem "+", com 12 ou 13 dígitos) e, se o celular veio
 * sem o 9 depois do DDD (10 dígitos), acrescenta o 9. Fixo (começa com 2 a 5 depois do DDD) não é alterado.
 * Só vale para colagem: ao digitar, 10 dígitos são apenas um número ainda incompleto.
 */
export function telefoneColado(texto: string) {
  let d = texto.replace(/\D/g, "");
  if (d.startsWith("55") && (/^[^\d+]*\+/.test(texto) || d.length >= 12))
    d = d.slice(2);
  if (d.length === 10 && !/[2-5]/.test(d[2]))
    d = `${d.slice(0, 2)}9${d.slice(2)}`;
  return d;
}

/** Celular brasileiro: DDD + 9 + 8 dígitos. */
export const telefoneValido = (value: string) =>
  /^[1-9][1-9]9\d{8}$/.test(normalizarTelefone(value));

export function formatPhone(value: string) {
  const d = normalizarTelefone(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const statusLabels: Record<StatusPedido, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGAMENTO_APROVADO: "Pagamento aprovado",
  AGUARDANDO: "Aguardando",
  EM_PRODUCAO: "Em produção",
  EM_ROTA_ENTREGA: "Em rota de entrega",
  PRONTO_RETIRADA: "Pronto para retirada",
  FINALIZADO: "Finalizado",
};

export const allStatuses = Object.keys(statusLabels) as StatusPedido[];

type PedidoFluxo = {
  tipoEntrega: TipoEntrega;
  formaPagamento: FormaPagamento;
  status: StatusPedido;
};

export function statusFlow(pedido: PedidoFluxo): StatusPedido[] {
  const inicio: StatusPedido[] =
    pedido.formaPagamento === "PIX"
      ? ["AGUARDANDO_PAGAMENTO", "PAGAMENTO_APROVADO"]
      : ["AGUARDANDO"];
  const flow: StatusPedido[] = [
    ...inicio,
    "EM_PRODUCAO",
    pedido.tipoEntrega === "ENTREGA" ? "EM_ROTA_ENTREGA" : "PRONTO_RETIRADA",
    "FINALIZADO",
  ];
  // Pedidos antigos podem estar num status que não existe mais no fluxo (ex.: Pix em "aguardando").
  return flow.includes(pedido.status) ? flow : [pedido.status, ...flow];
}

export function nextStatus(pedido: PedidoFluxo): StatusPedido | null {
  const flow = statusFlow(pedido);
  const i = flow.indexOf(pedido.status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

// Pedido sem horário agendado ("para quando ficar pronto").
export const QUANDO_PRONTO = "Assim que ficar pronto";

export const tipoLabels: Record<TipoEntrega, string> = {
  ENTREGA: "Entrega",
  RETIRADA: "Retirada",
};

export const paymentLabels: Record<FormaPagamento, string> = {
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  PIX: "Pix",
};

export function parseMoney(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export const hasMaxTwoDecimals = (n: number) =>
  Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

// "13.00" (API) -> "13,00" (campo de edição)
export const moneyToInput = (v: string) => v.replace(".", ",");

export const tipoPixLabels = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  TELEFONE: "Telefone",
  ALEATORIA: "Chave aleatória",
} as const;

// Itens do pedido: "20 un." ou, quando o cliente só escolheu o sabor, "a dividir" (a loja divide as unidades).
export const formatQtdItem = (quantidade: number | null) =>
  quantidade === null ? "a dividir" : `${quantidade} un.`;
export const temItemADividir = (itens: { quantidade: number | null }[]) =>
  itens.some((i) => i.quantidade === null);
