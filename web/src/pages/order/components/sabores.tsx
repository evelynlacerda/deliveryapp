import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ModoSabores,
  Sabor,
} from "@/types/types";

interface SaboresProps {
  sabores: Sabor[];
  /** Quantidade do pedido e se ela é válida (a soma dos sabores é comparada com ela). */
  qtd: number;
  qtdOk: boolean;
  modoSabores: ModoSabores | null;
  setModoSabores: (modo: ModoSabores) => void;
  /** Modo "quantidades": saborId -> unidades. */
  selecao: Record<number, number>;
  setSelecao: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  /** Modo "selecao": só os sabores marcados. */
  escolhidos: number[];
  setEscolhidos: React.Dispatch<React.SetStateAction<number[]>>;
  /** Erro vindo da validação do formulário. */
  erro?: string;
}

const Sabores = ({
  sabores,
  qtd,
  qtdOk,
  modoSabores,
  setModoSabores,
  selecao,
  setSelecao,
  escolhidos,
  setEscolhidos,
  erro,
}: SaboresProps) => {
  const somaSabores = Object.values(selecao).reduce((a, b) => a + b, 0);
  const restante = qtdOk ? qtd - somaSabores : 0;

  function changeFlavor(id: number, delta: number) {
    setSelecao((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      const copy = { ...prev, [id]: next };
      if (next === 0) delete copy[id];
      return copy;
    });
  }

  // A quantidade de cada sabor também pode ser digitada (só números; vazio = 0).
  function setFlavorQty(id: number, text: string) {
    const n = Number(text.replace(/\D/g, ""));
    setSelecao((prev) => {
      const copy = { ...prev, [id]: n };
      if (!n) delete copy[id];
      return copy;
    });
  }

  function toggleFlavor(id: number) {
    setEscolhidos((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <section className="section">
      <h2 className="section__title">
        <span className="section__step">2</span> Sabores
      </h2>
      <p className="section__hint">
        Deixe misto, diga a quantidade de cada sabor ou só marque os sabores
        que você quer.
      </p>
      <div className="option-grid option-grid--3">
        <button
          type="button"
          className="option"
          aria-pressed={modoSabores === "misto"}
          onClick={() => setModoSabores("misto")}
        >
          <span className="option__title">Misto</span>
          <span className="option__desc">
            A gente monta uma variedade de todos os sabores para você.
          </span>
        </button>
        <button
          type="button"
          className="option"
          aria-pressed={modoSabores === "selecao"}
          onClick={() => setModoSabores("selecao")}
        >
          <span className="option__title">Só escolher os sabores</span>
          <span className="option__desc">
            Você marca os sabores e a gente divide as unidades entre eles.
          </span>
        </button>
        <button
          type="button"
          className="option"
          aria-pressed={modoSabores === "quantidades"}
          onClick={() => setModoSabores("quantidades")}
        >
          <span className="option__title">Definir a quantidade</span>
          <span className="option__desc">
            Você diz quantas unidades quer de cada sabor.
          </span>
        </button>
      </div>
      {!modoSabores && erro && (
        <p className="field__error mt-2">{erro}</p>
      )}

      {modoSabores === "quantidades" && (
        <>
          <ul className="flavor-list">
            {sabores.map((s) => {
              const q = selecao[s.id] ?? 0;
              return (
                <li key={s.id} className="flavor" data-active={q > 0}>
                  <span className="flavor__name">{s.nome}</span>
                  <div className="flavor__controls">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Menos ${s.nome}`}
                      disabled={q === 0}
                      onClick={() => changeFlavor(s.id, -1)}
                    >
                      <Minus />
                    </Button>
                    <Input
                      inputMode="numeric"
                      className="flavor__input"
                      value={q === 0 ? "" : String(q)}
                      placeholder="0"
                      maxLength={4}
                      aria-label={`Quantidade de ${s.nome}`}
                      onChange={(e) => setFlavorQty(s.id, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Mais ${s.nome}`}
                      disabled={qtdOk && restante <= 0}
                      onClick={() => changeFlavor(s.id, 1)}
                    >
                      <Plus />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p
            className="flavor-progress"
            data-state={
              !qtdOk
                ? undefined
                : restante === 0
                  ? "ok"
                  : restante < 0
                    ? "over"
                    : undefined
            }
          >
            {!qtdOk
              ? "Defina a quantidade do pedido primeiro."
              : restante === 0
                ? `Tudo certo: ${qtd} de ${qtd} unidades.`
                : restante > 0
                  ? `Faltam ${restante} unidades para completar ${qtd}.`
                  : `Você passou ${-restante} unidades do total de ${qtd}.`}
          </p>
          {erro && (
            <p className="field__error mt-1">{erro}</p>
          )}
        </>
      )}

      {modoSabores === "selecao" && (
        <>
          <div className="flavor-picker__bar">
            <span
              className="flavor-progress"
              data-state={escolhidos.length > 0 ? "ok" : undefined}
            >
              {escolhidos.length === 0
                ? "Marque ao menos um sabor."
                : `${escolhidos.length} ${escolhidos.length === 1 ? "sabor escolhido" : "sabores escolhidos"}.`}
            </span>
            <div className="flavor-picker__actions">
              <button
                type="button"
                className="flavor-picker__link"
                onClick={() => setEscolhidos(sabores.map((s) => s.id))}
              >
                Marcar todos
              </button>
              <button
                type="button"
                className="flavor-picker__link"
                disabled={escolhidos.length === 0}
                onClick={() => setEscolhidos([])}
              >
                Limpar
              </button>
            </div>
          </div>
          <ul className="flavor-picker">
            {sabores.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="option flavor-picker__item"
                  aria-pressed={escolhidos.includes(s.id)}
                  onClick={() => toggleFlavor(s.id)}
                >
                  <span className="option__title">
                    {escolhidos.includes(s.id) && (
                      <Check className="size-4" />
                    )}{" "}
                    {s.nome}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {erro && (
            <p className="field__error mt-2">{erro}</p>
          )}
        </>
      )}
    </section>
  );
};

export default Sabores;
