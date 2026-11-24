import { GlassWater, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bebidaFotoUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Bebida } from "@/types/types";

export const BEBIDA_QTD_MAXIMA = 50; // mesmo limite da API, por bebida

interface BebidaProps {
  bebidas: Bebida[];
  /** bebidaId -> unidades (só as com quantidade maior que zero). */
  quantidades: Record<number, number>;
  setQuantidades: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  /** Marcou que não quer bebida. */
  semBebida: boolean;
  setSemBebida: (valor: boolean) => void;
  erro?: string;
}

// Passo 3: quantas unidades de cada bebida (pode ser mais de uma, de sabores diferentes) ou "Não quero bebida".
// A escolha é obrigatória, como nos outros passos.
const BebidaEscolha = ({
  bebidas,
  quantidades,
  setQuantidades,
  semBebida,
  setSemBebida,
  erro,
}: BebidaProps) => {
  function definir(id: number, quantidade: number) {
    const n = Math.min(BEBIDA_QTD_MAXIMA, Math.max(0, quantidade));
    setQuantidades((prev) => {
      const copy = { ...prev, [id]: n };
      if (n === 0) delete copy[id];
      return copy;
    });
    if (n > 0) setSemBebida(false);
  }

  function aoMarcarSemBebida(marcado: boolean) {
    setSemBebida(marcado);
    if (marcado) setQuantidades({});
  }

  return (
    <section className="section" id="bebida">
      <h2 className="section__title">
        <span className="section__step">3</span> Bebidas
      </h2>
      <p className="section__hint">
        Escolha quantas unidades quer de cada bebida, ou marque que não quer
        nenhuma. O valor é somado ao total do pedido.
      </p>
      <ul className="drink-options">
        {bebidas.map((b) => {
          const q = quantidades[b.id] ?? 0;
          return (
            <li key={b.id} className="option drink-option" data-active={q > 0}>
              <span className="drink-option__photo">
                {b.fotoVersao ? (
                  <img
                    src={bebidaFotoUrl(b.id, b.fotoVersao)}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <GlassWater className="size-5" aria-hidden="true" />
                )}
              </span>
              <span className="drink-option__text">
                <span className="option__title">{b.nome}</span>
                <span className="option__desc">{formatPrice(b.preco)}</span>
              </span>
              <div className="flavor__controls drink-option__qty">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Menos ${b.nome}`}
                  disabled={q === 0}
                  onClick={() => definir(b.id, q - 1)}
                >
                  <Minus />
                </Button>
                <Input
                  inputMode="numeric"
                  className="flavor__input"
                  value={q === 0 ? "" : String(q)}
                  placeholder="0"
                  maxLength={2}
                  aria-label={`Quantidade de ${b.nome}`}
                  onChange={(e) =>
                    definir(b.id, Number(e.target.value.replace(/\D/g, "")))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Mais ${b.nome}`}
                  disabled={q >= BEBIDA_QTD_MAXIMA}
                  onClick={() => definir(b.id, q + 1)}
                >
                  <Plus />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <label className="drink-none">
        <input
          type="checkbox"
          className="size-4 accent-current"
          checked={semBebida}
          onChange={(e) => aoMarcarSemBebida(e.target.checked)}
        />
        Não quero bebida.
      </label>
      {erro && <p className="field__error mt-2">{erro}</p>}
    </section>
  );
};

export default BebidaEscolha;
