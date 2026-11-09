
type AudioContextCtor = typeof AudioContext

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

export function unlockAudio() {
  const c = getContext()
  if (c && c.state === 'suspended') void c.resume().catch(() => {})
}

export function isAudioReady() {
  return ctx?.state === 'running'
}

function nota(c: AudioContext, frequencia: number, inicio: number, duracao: number) {
  const osc = c.createOscillator()
  const ganho = c.createGain()
  osc.type = 'square'
  osc.frequency.value = frequencia
  ganho.gain.setValueAtTime(0.0001, inicio)
  ganho.gain.exponentialRampToValueAtTime(0.9, inicio + 0.01)
  ganho.gain.setValueAtTime(0.9, inicio + duracao - 0.02)
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao)
  osc.connect(ganho).connect(c.destination)
  osc.start(inicio)
  osc.stop(inicio + duracao + 0.02)
}

export function playNewOrderSound(repeticoes = 3): boolean {
  const c = getContext()
  if (!c) return false
  if (c.state === 'suspended') void c.resume().catch(() => {})
  if (c.state !== 'running') return false

  const BIPE = 0.14
  const TOQUE = 8 * BIPE
  const PAUSA = 0.45
  let t = c.currentTime + 0.02
  for (let i = 0; i < repeticoes; i++) {
    for (let b = 0; b < 8; b++) nota(c, b % 2 === 0 ? 1318.51 : 987.77, t + b * BIPE, BIPE)
    t += TOQUE + PAUSA
  }
  return true
}
