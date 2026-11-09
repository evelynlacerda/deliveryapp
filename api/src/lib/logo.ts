import { RegraDeNegocioError } from "./errors.js";

export const LOGO_TAMANHO_MAXIMO = 300 * 1024; // 300 KB
export const TIPOS_LOGO = ["image/png", "image/svg+xml"] as const;
export type TipoLogo = (typeof TIPOS_LOGO)[number];

const ASSINATURA_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/*
 * Um SVG pode carregar scripts. Mesmo servido como imagem (<img>) eles não rodam, mas recusamos qualquer coisa ativa para que o arquivo também seja inofensivo se alguém abri-lo direto.
 */
const PADROES_PERIGOSOS = [
  /<\s*script/i,
  /<\s*foreignObject/i,
  /<\s*(iframe|embed|object)/i,
  /\son[a-z]+\s*=/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
];

/*
 * Confere tamanho, tipo declarado e conteúdo real (não confia só no que o cliente diz).
 */
export function validarLogo(tipo: TipoLogo, dados: Buffer) {
  if (dados.length === 0)
    throw new RegraDeNegocioError("O arquivo da logo está vazio.");
  if (dados.length > LOGO_TAMANHO_MAXIMO) {
    throw new RegraDeNegocioError(
      `A logo deve ter no máximo ${LOGO_TAMANHO_MAXIMO / 1024} KB.`,
    );
  }

  if (tipo === "image/png") {
    if (!dados.subarray(0, ASSINATURA_PNG.length).equals(ASSINATURA_PNG)) {
      throw new RegraDeNegocioError("O arquivo não é um PNG válido.");
    }
    return;
  }

  const texto = dados.toString("utf8");
  if (!/<svg[\s>]/i.test(texto))
    throw new RegraDeNegocioError("O arquivo não é um SVG válido.");
  if (PADROES_PERIGOSOS.some((padrao) => padrao.test(texto))) {
    throw new RegraDeNegocioError(
      "O SVG contém conteúdo não permitido (scripts, eventos ou elementos externos).",
    );
  }
}
