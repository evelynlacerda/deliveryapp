
export type TipoEntrega = 'ENTREGA' | 'RETIRADA'
export type FormaPagamento = 'DINHEIRO' | 'CARTAO' | 'PIX'
export type StatusPedido =
  | 'AGUARDANDO_PAGAMENTO'
  | 'PAGAMENTO_APROVADO'
  | 'AGUARDANDO'
  | 'EM_PRODUCAO'
  | 'EM_ROTA_ENTREGA'
  | 'PRONTO_RETIRADA'
  | 'FINALIZADO'
export type TipoChavePix = 'CPF' | 'CNPJ' | 'TELEFONE' | 'ALEATORIA'

export interface Sabor {
  id: number
  nome: string
}

export interface Valores {
  faixas: { quantidade: number; valor: string }[]
  acimaDe: { quantidade: number; valorPorUnidade: string }
  quantidadeMinima: number
  quantidadeMaxima: number
  passo: number
}

export interface TempoPreparo {
  minimoMin: number
  maximoMin: number
}

export interface TaxasEntrega {
  taxaAte49: string
  taxaDe50a199: string
  entregaGratisAPartirDe: number
}

export interface Pix {
  tipo: TipoChavePix
  chave: string
  chaveParaCopiar: string
  configurada: boolean
  bloqueada: boolean
  titular: string | null
  banco: string | null
  whatsapp: string | null
  antecedencia: { ateLimiteHoras: number; acimaLimiteHoras: number; limiteUnidades: number }
}

export interface InstrucaoPix {
  imediato: boolean
  horasAntecedencia: number | null
  pagarAte: string | null
}

export interface Funcionamento {
  horarioAbertura: string | null
  horarioFechamento: string | null
  diasAtendimento: number[]
  enderecoRetirada: string | null
  estabelecimentoFechado: boolean
  aberto: boolean
  motivoFechado: 'FECHADO_MANUAL' | 'FORA_DO_HORARIO' | null
  entregaHoje: boolean
}

export interface SalvarFuncionamentoBody {
  horarioAbertura: string | null
  horarioFechamento: string | null
  estabelecimentoFechado: boolean
  entregaHoje: boolean
  diasAtendimento?: number[]
}

export interface Catalogo {
  sabores: Sabor[]
  /** Bebidas que o cliente pode escolher (vazio = a seção não aparece). */
  bebidas: Bebida[]
  valores: Valores
  tempo: TempoPreparo
  taxas: TaxasEntrega
  pix: Pix
  funcionamento: Funcionamento
}

export interface Pedido {
  codigo: string
  status: StatusPedido
  nomeCliente: string
  tipoEntrega: TipoEntrega
  /** Entrega: rua ou avenida. Pedidos antigos podem ter número e bairro dentro dele. */
  endereco: string | null
  numero: string | null
  bairro: string | null
  pontoReferencia: string | null
  observacao: string | null
  enderecoRetirada: string | null
  horarioAgendado: string | null
  tempoPreparoMin: number | null
  previsaoEm: string | null
  formaPagamento: FormaPagamento
  troco: { precisa: boolean; para: string | null } | null
  instrucaoPix: InstrucaoPix | null
  quantidadeTotal: number
  subtotal: string
  taxaEntrega: string
  total: string
  /** Bebidas pedidas (o valor já está no total); vazio = sem bebida. valor = valorUnitario x quantidade. */
  bebidas: { nome: string; quantidade: number; valorUnitario: string; valor: string }[]
  /** Soma das bebidas (já incluída no total). */
  totalBebidas: string
  criadoEm: string
  itens: { sabor: string; quantidade: number | null }[]
}

export interface PedidoAdmin extends Pedido {
  telefone: string
}

export interface CriarPedidoBody {
  nomeCliente: string
  telefone: string
  quantidade: number
  sabores: { saborId: number; quantidade?: number }[]
  /** Bebidas com quantidade; [] = não quer bebida. Obrigatório quando há bebidas à venda. */
  bebidas?: { bebidaId: number; quantidade: number }[]
  tipoEntrega: TipoEntrega
  /** Entrega: rua ou avenida, número e bairro são obrigatórios. */
  endereco?: string
  numero?: string
  bairro?: string
  /** Opcional, só na entrega. */
  pontoReferencia?: string
  observacao?: string
  horarioAgendado?: string
  formaPagamento: FormaPagamento
  precisaTroco?: boolean
  trocoPara?: number
}

export interface SalvarPixBody {
  tipo: TipoChavePix
  chave: string
  titular: string
  banco: string
  whatsapp: string
  antecedenciaAteLimiteHoras: number
  antecedenciaAcimaLimiteHoras: number
}

export interface SaborAdmin extends Sabor {
  ativo: boolean
}

// Bebida na visão do admin (inclui desativadas).
export interface Bebida {
  id: number
  nome: string
  /** "12.00": formate com formatPrice. */
  preco: string
  ativo: boolean
  /** Versão da foto (use em bebidaFotoUrl) ou null quando não há foto. */
  fotoVersao: number | null
}

export interface BebidasAdmin {
  /** Chave geral: desligada, o app não oferece bebidas. */
  vendaAtiva: boolean
  bebidas: Bebida[]
}

export type TipoFoto = 'image/png' | 'image/jpeg' | 'image/webp'

// Marca e aparência (editáveis no painel). Cores em #rrggbb; ausente = padrão do tema.
export type ChaveCor = 'fundo' | 'texto' | 'cartao' | 'primaria' | 'destaque' | 'textoSecundario' | 'borda'
export type TemaCores = Partial<Record<ChaveCor, string>>
export type TemaCoresAdmin = TemaCores & { barraLateral?: string }

export interface Cores {
  publico?: { claro?: TemaCores; escuro?: TemaCores }
  admin?: { claro?: TemaCoresAdmin; escuro?: TemaCoresAdmin }
}

export interface Marca {
  nome: string
  nomeBloqueado?: boolean
  logoVersao: number | null
  logoEscuraVersao: number | null
  cores: Cores | null
}

/** Mensagens de erro do formulário de pedido, por campo. */
export type Erros = Record<string, string>;
export type Quando = "pronto" | "agendar";
export type ModoSabores = "misto" | "quantidades" | "selecao";
