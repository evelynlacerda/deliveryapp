import { TipoChavePix } from "../generated/prisma/enums.js";

// Marcador de "chave ainda não configurada" (não é um CPF válido de propósito).
export const PIX_CHAVE_PADRAO = "00000000000";

/** Dados fixos do modo demonstração (MODO_DEMO=true): fictícios e não editáveis pelo painel. */
export const NOME_DEMO = "DeliveryApp";
export const PIX_CHAVE_DEMO = "12345678900";
export const PIX_TITULAR_DEMO = "Maria Exemplo da Silva";
export const PIX_BANCO_DEMO = "Banco Demo";
export const WHATSAPP_DEMO = "11999990000";

function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(cpf.slice(0, 9), 10) === Number(cpf[9]) && digito(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digito = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesos[i] ?? 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return digito(cnpj.slice(0, 12)) === Number(cnpj[12]) && digito(cnpj.slice(0, 13)) === Number(cnpj[13]);
}

function telefoneValido(telefone: string): boolean {
  // DDD + número, com 9 na frente quando for celular (11 dígitos).
  return /^[1-9]\d(9\d{8}|\d{8})$/.test(telefone);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Devolve a chave no formato salvo (CPF/CNPJ/telefone só com dígitos) ou null se for inválida. */
export function normalizarChavePix(tipo: TipoChavePix, chave: string): string | null {
  const texto = chave.trim();

  switch (tipo) {
    case TipoChavePix.CPF: {
      const cpf = texto.replace(/\D/g, "");
      return cpfValido(cpf) ? cpf : null;
    }
    case TipoChavePix.CNPJ: {
      const cnpj = texto.replace(/\D/g, "");
      return cnpjValido(cnpj) ? cnpj : null;
    }
    case TipoChavePix.TELEFONE: {
      let telefone = texto.replace(/\D/g, "");
      if (telefone.length >= 12 && telefone.startsWith("55")) telefone = telefone.slice(2);
      return telefoneValido(telefone) ? telefone : null;
    }
    case TipoChavePix.ALEATORIA: {
      const uuid = texto.toLowerCase();
      return UUID.test(uuid) ? uuid : null;
    }
  }
}

/** Telefone precisa do +55 para o app do banco reconhecer a chave ao colar. */
export function chaveParaCopiar(tipo: TipoChavePix, chave: string): string {
  return tipo === TipoChavePix.TELEFONE ? `+55${chave}` : chave;
}
