import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Valores } from "@/types/types";

const QUICK_QUANTITIES = [10, 20, 30, 50, 100, 200];

interface QuantidadeProps {
  valores: Valores;
  /** Texto digitado no campo (pode estar vazio ou inválido). */
  qtdText: string;
  setQtdText: (texto: string) => void;
  /** Quantidade numérica atual e se ela é válida para os `valores`. */
  qtd: number;
  qtdOk: boolean;
  /** Erro vindo da validação do formulário. */
  erro?: string;
}

const Quantidade = ({
  valores,
  qtdText,
  setQtdText,
  qtd,
  qtdOk,
  erro,
}: QuantidadeProps) => {
  function bump(delta: number) {
    // Campo vazio ou inválido: os botões começam pela quantidade mínima.
    if (!qtdOk) return setQtdText(String(valores.quantidadeMinima));
    setQtdText(
      String(
        Math.min(
          valores.quantidadeMaxima,
          Math.max(valores.quantidadeMinima, qtd + delta),
        ),
      ),
    );
  }

  return (
    <section className="section">
      <h2 className="section__title">
        <span className="section__step">1</span> Quantas unidades?
      </h2>
      <p className="section__hint">
        Mini salgados em múltiplos de {valores.passo}. Quanto maior o pedido,
        menor o preço por unidade.
      </p>
      <div className="qty">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={`Diminuir ${valores.passo} unidades`}
          onClick={() => bump(-valores.passo)}
        >
          <Minus />
        </Button>
        <Input
          inputMode="numeric"
          value={qtdText}
          onChange={(e) => setQtdText(e.target.value.replace(/\D/g, ""))}
          aria-label="Quantidade de unidades"
          aria-invalid={!!erro || (qtdText !== "" && !qtdOk)}
          className="qty__input"
        />
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={`Aumentar ${valores.passo} unidades`}
          onClick={() => bump(valores.passo)}
        >
          <Plus />
        </Button>
        <span className="qty__unit">unidades</span>
      </div>
      <div className="chip-row mt-3">
        {QUICK_QUANTITIES.filter(
          (q) => q >= valores.quantidadeMinima && q <= valores.quantidadeMaxima,
        ).map((q) => (
          <button
            key={q}
            type="button"
            className="chip"
            aria-pressed={qtdOk && qtd === q}
            onClick={() => setQtdText(String(q))}
          >
            {q}
          </button>
        ))}
      </div>
      {(erro || (qtdText !== "" && !qtdOk)) && (
        <p className="field__error mt-2">
          Escolha de {valores.quantidadeMinima} a {valores.quantidadeMaxima}{" "}
          unidades, de {valores.passo} em {valores.passo}.
        </p>
      )}
    </section>
  );
};

export default Quantidade;
