import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime, paymentLabels } from "@/lib/format";
import { previaPrazoPix, textoPrazoPix } from "@/lib/prazo-pix";
import { cn } from "@/lib/utils";
import type {
  Erros,
  FormaPagamento,
  Pix,
  Quando,
} from "@/types/types";

const paymentDescriptions: Record<FormaPagamento, string> = {
  DINHEIRO: "Pague na entrega ou na retirada.",
  CARTAO: "Débito ou crédito, na entrega ou na retirada.",
  PIX: "Copie a chave e pague pelo seu banco. O pedido só começa após o comprovante e a confirmação do pagamento.",
};

interface PagamentoProps {
  formasPagamento: FormaPagamento[];
  pagamento: FormaPagamento | null;
  setPagamento: (f: FormaPagamento) => void;
  precisaTroco: boolean;
  setPrecisaTroco: (v: boolean) => void;
  trocoText: string;
  setTrocoText: (v: string) => void;
  /** Troco informado em reais (0 se vazio ou inválido), calculado no formulário. */
  troco: number;
  /** Dados do pedido usados na prévia do prazo do Pix. */
  pix: Pix;
  qtd: number;
  qtdOk: boolean;
  quando: Quando | null;
  horario: string;
  erros: Erros;
}

const Pagamento = ({
  formasPagamento,
  pagamento,
  setPagamento,
  precisaTroco,
  setPrecisaTroco,
  trocoText,
  setTrocoText,
  troco,
  pix,
  qtd,
  qtdOk,
  quando,
  horario,
  erros,
}: PagamentoProps) => {
  return (
    <section className="section">
      <h2 className="section__title">
        <span className="section__step">6</span> Pagamento
      </h2>
      <div
        className={cn(
          "option-grid mt-3",
          formasPagamento.length === 3 && "option-grid--3",
        )}
      >
        {formasPagamento.map((f) => (
          <button
            key={f}
            type="button"
            className="option"
            aria-pressed={pagamento === f}
            onClick={() => setPagamento(f)}
          >
            <span className="option__title">{paymentLabels[f]}</span>
            <span className="option__desc">{paymentDescriptions[f]}</span>
          </button>
        ))}
      </div>
      {erros.formaPagamento && (
        <p className="field__error mt-2">{erros.formaPagamento}</p>
      )}
      {pagamento === "DINHEIRO" && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium">Precisa de troco?</h3>
          <div className="option-grid">
            <button
              type="button"
              className="option"
              aria-pressed={!precisaTroco}
              onClick={() => setPrecisaTroco(false)}
            >
              <span className="option__title">Não</span>
              <span className="option__desc">Vou pagar o valor exato.</span>
            </button>
            <button
              type="button"
              className="option"
              aria-pressed={precisaTroco}
              onClick={() => setPrecisaTroco(true)}
            >
              <span className="option__title">Sim</span>
              <span className="option__desc">
                Informe com qual nota vai pagar.
              </span>
            </button>
          </div>
          {precisaTroco && (
            <div className="field mt-3">
              <Label htmlFor="troco">Troco para quanto?</Label>
              <Input
                id="troco"
                inputMode="decimal"
                value={trocoText}
                onChange={(ev) =>
                  setTrocoText(ev.target.value.replace(/[^\d,.]/g, ""))
                }
                onBlur={() => {
                  const v = troco;
                  if (v) setTrocoText(v.toFixed(2).replace(".", ","));
                }}
                maxLength={10}
                placeholder="Ex.: 50 ou 100"
                aria-invalid={!!erros.trocoPara}
              />
              {erros.trocoPara ? (
                <p className="field__error">{erros.trocoPara}</p>
              ) : (
                <p className="field__hint">
                  Pode digitar só o número (ex.: 100); os centavos entram
                  automaticamente.
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {pagamento === "PIX" && (
        <div className="alert alert--info mt-3 grid gap-1">
          <p>
            Depois de enviar o pedido você verá a chave Pix para copiar, o
            valor e o botão para enviar o comprovante por WhatsApp.
          </p>
          <p className="font-medium">
            {textoPrazoPix(
              previaPrazoPix(
                quando === "agendar" && horario ? new Date(horario) : null,
                qtdOk ? qtd : 0,
                pix.antecedencia,
              ),
              formatDateTime,
            )}
          </p>
        </div>
      )}
    </section>
  );
};

export default Pagamento;
