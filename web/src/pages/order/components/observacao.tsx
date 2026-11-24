import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Erros } from "@/types/types";

interface ObservacaoProps {
  observacao: string;
  setObservacao: (v: string) => void;
  erros: Erros;
}

const Observacao = ({ observacao, setObservacao, erros }: ObservacaoProps) => {
  return (
    <section className="section">
      <h2 className="section__title">
        <span className="section__step">7</span> Observações{" "}
        <span className="field__optional">(opcional)</span>
      </h2>
      <div className="field">
        <Label htmlFor="observacao" className="sr-only">
          Observações
        </Label>
        <Textarea
          id="observacao"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ex.: sem pimenta, tocar a campainha, alergia a camarão..."
          aria-invalid={!!erros.observacao}
        />
        {erros.observacao ? (
          <p className="field__error">{erros.observacao}</p>
        ) : (
          <p className="field__hint">{observacao.length}/500</p>
        )}
      </div>
    </section>
  );
};

export default Observacao;
