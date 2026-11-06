import type {
  Catalogo,
  Cores,
  Funcionamento,
  Marca,
  CriarPedidoBody,
  Pedido,
  PedidoAdmin,
  Pix,
  Sabor,
  SaborAdmin,
  SalvarFuncionamentoBody,
  SalvarPixBody,
  StatusPedido,
  TaxasEntrega,
  TempoPreparo,
  Valores,
} from '@/types/types'

// O front nunca fala com outro serviço: tudo passa pela API.
const BASE_URL = (import.meta.env.API_URL ?? 'http://localhost:3333').replace(/\/$/, '')
const TOKEN_KEY = 'saborDeMae:token'

export class ApiError extends Error {
  status: number
  erros: { campo: string; mensagem: string }[]

  constructor(status: number, message: string, erros: { campo: string; mensagem: string }[] = []) {
    super(message)
    this.status = status
    this.erros = erros
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* armazenamento indisponível: o login vale só até recarregar */
  }
}

// Chamado quando uma rota de admin responde 401 (token inválido ou expirado).
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
  query?: Record<string, string | undefined>
}

async function request<T>(path: string, { method = 'GET', body, auth = false, query }: RequestOptions = {}): Promise<T> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) if (value) params.set(key, value)
  const qs = params.size ? `?${params}` : ''

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}${qs}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.')
  }

  if (res.status === 204) return undefined as T // sem corpo (ex.: exclusão)
  if (res.ok) return (await res.json()) as T

  let data: { mensagem?: string; message?: string; erros?: { campo: string; mensagem: string }[] } = {}
  try {
    data = await res.json()
  } catch {
    /* resposta sem corpo JSON */
  }

  if (res.status === 401 && auth) onUnauthorized?.()

  const fallback =
    res.status === 429
      ? 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.'
      : res.status >= 500
        ? 'O servidor teve um problema. Tente novamente em instantes.'
        : 'Não foi possível concluir a ação.'
  throw new ApiError(res.status, data.mensagem ?? fallback, data.erros)
}

// Endereço da imagem da logo (a versão muda a cada logo nova, então o navegador pode guardar em cache).
export const logoUrl = (versao: number, modo: 'claro' | 'escuro' = 'claro') =>
  `${BASE_URL}/marca/logo?${modo === 'escuro' ? 'modo=escuro&' : ''}v=${versao}`

export const api = {
  marca: () => request<Marca>('/marca'),
  // Público
  sabores: () => request<Sabor[]>('/sabores'),
  valores: () => request<Valores>('/valores'),
  tempoPreparo: () => request<TempoPreparo>('/tempo-preparo'),
  taxas: () => request<TaxasEntrega>('/taxa-entrega'),
  pix: () => request<Pix>('/pix'),
  funcionamento: () => request<Funcionamento>('/funcionamento'),
  async catalogo(): Promise<Catalogo> {
    const [sabores, valores, tempo, taxas, pix, funcionamento] = await Promise.all([
      api.sabores(),
      api.valores(),
      api.tempoPreparo(),
      api.taxas(),
      api.pix(),
      api.funcionamento(),
    ])
    return { sabores, valores, tempo, taxas, pix, funcionamento }
  },
  criarPedido: (body: CriarPedidoBody) => request<Pedido>('/pedido', { method: 'POST', body }),
  buscarPedido: (codigo: string) => request<Pedido>(`/pedido/${encodeURIComponent(codigo)}`),

  // Admin
  login: (usuario: string, senha: string) =>
    request<{ token: string }>('/auth/login', { method: 'POST', body: { usuario, senha } }),
  pedidosAdmin: (filtros: { status?: StatusPedido; de?: string; ate?: string } = {}) =>
    request<PedidoAdmin[]>('/pedidos', { auth: true, query: filtros }),
  saboresAdmin: () => request<SaborAdmin[]>('/admin/sabores', { auth: true }),
  criarSabor: (nome: string) => request<SaborAdmin>('/sabores', { method: 'POST', auth: true, body: { nome } }),
  atualizarSabor: (id: number, dados: { nome?: string; ativo?: boolean }) =>
    request<SaborAdmin>(`/sabores/${id}`, { method: 'PATCH', auth: true, body: dados }),
  salvarValores: (body: { faixas: { quantidade: number; valor: number }[]; valorUnidadeAcimaDe100: number }) =>
    request<Valores>('/valores', { method: 'PUT', auth: true, body }),
  salvarTaxas: (body: { taxaAte49: number; taxaDe50a199: number }) =>
    request<TaxasEntrega>('/taxa-entrega', { method: 'PUT', auth: true, body }),
  salvarTempoPreparo: (body: TempoPreparo) =>
    request<TempoPreparo>('/tempo-preparo', { method: 'PUT', auth: true, body }),
  salvarEnderecoRetirada: (enderecoRetirada: string) =>
    request<Funcionamento>('/endereco-retirada', { method: 'PUT', auth: true, body: { enderecoRetirada } }),
  salvarFuncionamento: (body: SalvarFuncionamentoBody) =>
    request<Funcionamento>('/funcionamento', { method: 'PUT', auth: true, body }),
  salvarPix: (body: SalvarPixBody) => request<Pix>('/pix', { method: 'PUT', auth: true, body }),
  definirTempoPreparoPedido: (codigo: string, minutos: number) =>
    request<PedidoAdmin>(`/pedido/${encodeURIComponent(codigo)}/tempo-preparo`, {
      method: 'PUT',
      auth: true,
      body: { minutos },
    }),
  salvarMarca: (body: { nome: string; cores: Cores | null }) =>
    request<Marca>('/marca', { method: 'PUT', auth: true, body }),
  enviarLogo: (tipo: 'image/png' | 'image/svg+xml', dados: string, modo: 'claro' | 'escuro' = 'claro') =>
    request<Marca>('/marca/logo', { method: 'PUT', auth: true, body: { modo, tipo, dados } }),
  removerLogo: (modo: 'claro' | 'escuro' = 'claro') =>
    request<Marca>('/marca/logo', { method: 'DELETE', auth: true, query: { modo } }),
  excluirPedido: (codigo: string) =>
    request<void>(`/pedido/${encodeURIComponent(codigo)}`, { method: 'DELETE', auth: true }),
  atualizarStatus: (codigo: string, status: StatusPedido) =>
    request<PedidoAdmin>(`/pedido/${encodeURIComponent(codigo)}/status`, {
      method: 'PUT',
      auth: true,
      body: { status },
    }),
}
