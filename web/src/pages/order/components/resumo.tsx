import { Clock, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { calcularPreco } from "@/lib/preco";
import type {
  ModoSabores,
  TempoPreparo,
  TipoEntrega,
} from "@/types/types";

interface ResumoProps {
  tempo: TempoPreparo;
  tipo: TipoEntrega | null;
  qtd: number;
  qtdOk: boolean;
  modoSabores: ModoSabores | null;
  /** Quantos sabores foram escolhidos (0 no modo misto). */
  nSabores: number;
  subtotal: number | null;
  preco: ReturnType<typeof calcularPreco> | null;
  faltaParaGratis: number;
  /** Bebidas escolhidas (null = nenhuma ou ainda não escolheu). */
  bebidas: { unidades: number; valor: number } | null;
  erroGeral: string;
  enviando: boolean;
}

const Resumo = ({
  tempo,
  tipo,
  qtd,
  qtdOk,
  modoSabores,
  nSabores,
  subtotal,
  preco,
  faltaParaGratis,
  bebidas,
  erroGeral,
  enviando,
}: ResumoProps) => {
  return (
    <aside className="summary">
      <h2 className="summary__title">
        <ShoppingBag className="size-5" /> Resumo do pedido
      </h2>
      <dl className="summary__rows">
        <div className="summary__row">
          <dt>Unidades</dt>
          <dd>
            {qtdOk
              ? `${qtd}${modoSabores === "misto" ? " (misto)" : nSabores > 0 ? ` (${nSabores} ${nSabores === 1 ? "sabor" : "sabores"})` : ""}`
              : "—"}
          </dd>
        </div>
        <div className="summary__row">
          <dt>Subtotal</dt>
          <dd>{subtotal !== null ? formatPrice(subtotal) : "—"}</dd>
        </div>
        {bebidas && (
          <div className="summary__row">
            <dt>
              Bebidas ({bebidas.unidades})
            </dt>
            <dd>{formatPrice(bebidas.valor)}</dd>
          </div>
        )}
        <div className="summary__row">
          <dt>
            {tipo === "ENTREGA"
              ? "Entrega"
              : tipo === "RETIRADA"
                ? "Retirada"
                : "Entrega ou retirada"}
          </dt>
          <dd>
            {!preco
              ? "—"
              : preco.taxa === 0
                ? "Grátis"
                : formatPrice(preco.taxa)}
          </dd>
        </div>
        <div className="summary__row summary__row--total">
          <dt>Total</dt>
          <dd>{preco ? formatPrice(preco.total) : "—"}</dd>
        </div>
      </dl>
      {tipo === "ENTREGA" && qtdOk && faltaParaGratis > 0 && (
        <p className="summary__note">
          Faltam {faltaParaGratis} unidades para a entrega ser grátis.
        </p>
      )}
      <p className="summary__note flex items-center gap-1.5">
        <Clock className="size-3.5" /> Preparo em {tempo.minimoMin} a{" "}
        {tempo.maximoMin} min.
      </p>
      {erroGeral && (
        <p role="alert" className="alert alert--error mb-3">
          {erroGeral}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full text-base"
        disabled={enviando}
      >
        {enviando
          ? "Enviando..."
          : `Fazer pedido${preco ? ` · ${formatPrice(preco.total)}` : ""}`}
      </Button>
      <p className="summary__note mt-2 text-center">
        O valor final é confirmado pelo sistema ao enviar.
      </p>
    </aside>
  );
};

export default Resumo;
