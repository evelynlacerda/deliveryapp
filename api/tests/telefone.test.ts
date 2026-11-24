import { describe, expect, it } from "vitest";
import { criarPedidoSchema, normalizarTelefone } from "../src/schemas/pedido.js";

const base = {
  nomeCliente: "Ana Souza",
  telefone: "(44) 99123-4567",
  formaPagamento: "PIX",
  tipoEntrega: "RETIRADA",
  quantidade: 50,
};
const MSG = "Informe um celular com DDD + 9 (ex.: (44) 91234-5678). Não inclua o +55 do Brasil.";

const telefoneDe = (telefone: string) => {
  const r = criarPedidoSchema.safeParse({ ...base, telefone });
  return r.success ? r.data.telefone : r.error.issues.map((i) => i.message);
};

describe("telefone do cliente", () => {
  it.each([
    ["(44) 99123-4567", "44991234567"],
    ["44991234567", "44991234567"],
    ["+55 44 99123-4567", "44991234567"],
    ["5544991234567", "44991234567"],
    ["(55) 99123-4567", "55991234567"], // DDD 55 de verdade: não é DDI
  ])("aceita %s e guarda %s", (entrada, esperado) => {
    expect(telefoneDe(entrada)).toBe(esperado);
  });

  it.each([
    ["sem o 9 na frente (fixo ou número antigo)", "(44) 3123-4567"],
    ["com o 9 fora do lugar", "(44) 81234-5678"],
    ["sem DDD", "991234567"],
    ["DDD começando com 0", "(04) 99123-4567"],
    ["DDI com número fixo", "554431234567"],
    ["dígito a mais", "449912345678"],
    ["em branco", ""],
  ])("rejeita número %s", (_motivo, telefone) => {
    expect(telefoneDe(telefone)).toEqual([MSG]);
  });

  it("normalizarTelefone só tira o 55 quando há 13 dígitos", () => {
    expect(normalizarTelefone("55 44 99123-4567")).toBe("44991234567");
    expect(normalizarTelefone("55991234567")).toBe("55991234567");
  });
});
