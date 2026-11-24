import type { TipoFoto } from '@/types/types'

export const FOTO_MAX_KB = 300 // mesmo limite da API
const LADO_MAXIMO = 800
const QUALIDADES = [0.85, 0.7, 0.55, 0.4]

export interface FotoPreparada {
  tipo: TipoFoto
  /** Conteúdo em base64, sem o prefixo "data:...". */
  dados: string
  /** Endereço local para mostrar a prévia (libere com URL.revokeObjectURL). */
  previa: string
}

function lerBase64(blob: Blob): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader()
    leitor.onload = () => ok(String(leitor.result).split(',')[1] ?? '')
    leitor.onerror = () => falha(new Error('Não foi possível ler o arquivo.'))
    leitor.readAsDataURL(blob)
  })
}

const paraBlob = (canvas: HTMLCanvasElement, tipo: string, qualidade: number) =>
  new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, qualidade))

/**
 * Reduz a foto escolhida (lado maior de até 800 px, WebP ou JPEG) para caber no limite da API.
 * Assim o admin pode usar a foto direto do celular, sem se preocupar com o tamanho do arquivo.
 */
export async function prepararFoto(arquivo: File): Promise<FotoPreparada> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type)) {
    throw new Error('Use uma imagem PNG, JPG ou WebP.')
  }

  let imagem: ImageBitmap
  try {
    imagem = await createImageBitmap(arquivo)
  } catch {
    throw new Error('Não foi possível abrir essa imagem. Tente outro arquivo.')
  }

  let escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height))
  const canvas = document.createElement('canvas')
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('Seu navegador não conseguiu processar a imagem.')

  // Tenta reduzir qualidade e, se ainda passar do limite, o tamanho, até caber.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    canvas.width = Math.max(1, Math.round(imagem.width * escala))
    canvas.height = Math.max(1, Math.round(imagem.height * escala))
    contexto.clearRect(0, 0, canvas.width, canvas.height)
    contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height)

    for (const qualidade of QUALIDADES) {
      let blob = await paraBlob(canvas, 'image/webp', qualidade)
      // Navegadores sem WebP devolvem PNG: nesse caso usamos JPEG (fundo branco no lugar da transparência).
      if (blob?.type !== 'image/webp') {
        contexto.globalCompositeOperation = 'destination-over'
        contexto.fillStyle = '#fff'
        contexto.fillRect(0, 0, canvas.width, canvas.height)
        contexto.globalCompositeOperation = 'source-over'
        blob = await paraBlob(canvas, 'image/jpeg', qualidade)
      }
      if (blob && blob.size <= FOTO_MAX_KB * 1024) {
        imagem.close()
        return {
          tipo: blob.type as TipoFoto,
          dados: await lerBase64(blob),
          previa: URL.createObjectURL(blob),
        }
      }
    }
    escala *= 0.75
  }

  imagem.close()
  throw new Error(`Não foi possível reduzir a foto para ${FOTO_MAX_KB} KB. Tente uma imagem menor.`)
}
