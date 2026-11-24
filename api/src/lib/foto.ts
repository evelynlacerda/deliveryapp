import { RegraDeNegocioError } from "./errors.js";

export const FOTO_TAMANHO_MAXIMO = 300 * 1024; // 300 KB
export const TIPOS_FOTO = ["image/png", "image/jpeg", "image/webp"] as const;
export type TipoFoto = (typeof TIPOS_FOTO)[number];

const comecaCom = (dados: Buffer, bytes: number[], deslocamento = 0) =>
  bytes.every((b, i) => dados[deslocamento + i] === b);

// Confere o conteúdo real do arquivo (assinatura), sem confiar só no tipo declarado pelo cliente.
const ASSINATURAS: Record<TipoFoto, (dados: Buffer) => boolean> = {
  "image/png": (d) => comecaCom(d, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/jpeg": (d) => comecaCom(d, [0xff, 0xd8, 0xff]),
  // "RIFF" + tamanho + "WEBP"
  "image/webp": (d) => comecaCom(d, [0x52, 0x49, 0x46, 0x46]) && comecaCom(d, [0x57, 0x45, 0x42, 0x50], 8),
};

export function validarFoto(tipo: TipoFoto, dados: Buffer) {
  if (dados.length === 0) throw new RegraDeNegocioError("O arquivo da foto está vazio.");
  if (dados.length > FOTO_TAMANHO_MAXIMO) {
    throw new RegraDeNegocioError(`A foto deve ter no máximo ${FOTO_TAMANHO_MAXIMO / 1024} KB.`);
  }
  if (!ASSINATURAS[tipo](dados)) {
    throw new RegraDeNegocioError("O arquivo não é uma imagem válida do tipo informado.");
  }
}
