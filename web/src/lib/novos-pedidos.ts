export function encontrarNovos<T extends { codigo: string }>(vistos: ReadonlySet<string>, lista: readonly T[]): T[] {
  return lista.filter((p) => !vistos.has(p.codigo))
}
