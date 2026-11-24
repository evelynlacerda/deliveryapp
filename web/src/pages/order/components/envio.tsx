import { CalendarClock, Clock, MapPin, Store, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUANDO_PRONTO, formatPrice, toLocalInputValue } from "@/lib/format";
import type {
  Erros,
  Funcionamento,
  Quando,
  TaxasEntrega,
  TempoPreparo,
  TipoEntrega,
} from "@/types/types";

interface EnvioProps {
  taxas: TaxasEntrega;
  tempo: TempoPreparo;
  funcionamento: Funcionamento;
  tipo: TipoEntrega | null;
  escolherTipo: (tipo: TipoEntrega) => void;
  endereco: string;
  setEndereco: (v: string) => void;
  numero: string;
  setNumero: (v: string) => void;
  bairro: string;
  setBairro: (v: string) => void;
  pontoReferencia: string;
  setPontoReferencia: (v: string) => void;
  quando: Quando | null;
  setQuando: (q: Quando) => void;
  horario: string;
  setHorario: (v: string) => void;
  /** Regras de horário calculadas no formulário (também usadas na validação). */
  horarioAtendimento: string | null;
  foraDoHorario: boolean;
  semEntregaHoje: boolean;
  prontoIndisponivel: boolean;
  menorHorario: Date;
  erros: Erros;
}

const Envio = ({
  taxas,
  tempo,
  funcionamento,
  tipo,
  escolherTipo,
  endereco,
  setEndereco,
  numero,
  setNumero,
  bairro,
  setBairro,
  pontoReferencia,
  setPontoReferencia,
  quando,
  setQuando,
  horario,
  setHorario,
  horarioAtendimento,
  foraDoHorario,
  semEntregaHoje,
  prontoIndisponivel,
  menorHorario,
  erros,
}: EnvioProps) => {
  return (
    <section className="section">
      <h2 className="section__title">
        <span className="section__step">4</span> Entrega ou retirada
      </h2>
      <div className="option-grid">
        <button
          type="button"
          className="option"
          aria-pressed={tipo === "ENTREGA"}
          onClick={() => escolherTipo("ENTREGA")}
        >
          <span className="option__title">
            <Truck className="size-4" /> Entrega
          </span>
          <span className="option__desc">
            {taxas.entregaGratisAPartirDe}+ unidades: grátis. Até 49:{" "}
            {formatPrice(taxas.taxaAte49)}. De 50 a{" "}
            {taxas.entregaGratisAPartirDe - 1}:{" "}
            {formatPrice(taxas.taxaDe50a199)}.
            {semEntregaHoje && (
              <strong className="option__aviso">
                {" "}
                Hoje não: só agendando para outro dia.
              </strong>
            )}
          </span>
        </button>
        <button
          type="button"
          className="option"
          aria-pressed={tipo === "RETIRADA"}
          onClick={() => escolherTipo("RETIRADA")}
        >
          <span className="option__title">
            <Store className="size-4" /> Retirada no local
          </span>
          <span className="option__desc">
            Sem taxa. Você busca com a gente.
          </span>
          {funcionamento.enderecoRetirada && (
            <span className="option__desc flex items-start gap-1 font-medium text-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />{" "}
              {funcionamento.enderecoRetirada}
            </span>
          )}
        </button>
      </div>
      {erros.tipoEntrega && (
        <p className="field__error mt-2">{erros.tipoEntrega}</p>
      )}
      {tipo === "ENTREGA" && (
        <div className="field mt-4">
          <Label htmlFor="endereco">Endereço (rua ou avenida)</Label>
          <Input
            id="endereco"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            maxLength={300}
            autoComplete="address-line1"
            placeholder="Ex.: Rua das Flores"
            aria-invalid={!!erros.endereco}
          />
          {erros.endereco && (
            <p className="field__error">{erros.endereco}</p>
          )}
        </div>
      )}
      {tipo === "ENTREGA" && (
        <div className="field-pair mt-3">
          <div className="field">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              maxLength={20}
              autoComplete="off"
              placeholder="Ex.: 123"
              aria-invalid={!!erros.numero}
            />
            {erros.numero && <p className="field__error">{erros.numero}</p>}
          </div>
          <div className="field">
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              maxLength={100}
              autoComplete="address-level3"
              placeholder="Ex.: Centro"
              aria-invalid={!!erros.bairro}
            />
            {erros.bairro && <p className="field__error">{erros.bairro}</p>}
          </div>
        </div>
      )}
      {tipo === "ENTREGA" && (
        <div className="field mt-3">
          <Label htmlFor="referencia">
            Ponto de referência{" "}
            <span className="field__optional">(opcional)</span>
          </Label>
          <Input
            id="referencia"
            value={pontoReferencia}
            onChange={(e) => setPontoReferencia(e.target.value)}
            maxLength={200}
            placeholder="Ex.: portão azul, perto da padaria"
            aria-invalid={!!erros.pontoReferencia}
          />
          <p className="field__hint">
            Se o endereço tiver divisões (casa A, B ou C, bloco, apartamento
            ou fundos), informe aqui qual é a sua. Assim o entregador
            encontra você sem precisar ligar.
          </p>
          {erros.pontoReferencia && (
            <p className="field__error">{erros.pontoReferencia}</p>
          )}
        </div>
      )}

      <h3 className="mt-5 mb-2 text-sm font-medium">
        {tipo === "ENTREGA"
          ? "Entregar"
          : tipo === "RETIRADA"
            ? "Retirar"
            : "Receber"}{" "}
        quando?
      </h3>
      <div className="option-grid">
        <button
          type="button"
          className="option"
          aria-pressed={quando === "pronto"}
          disabled={prontoIndisponivel}
          onClick={() => setQuando("pronto")}
        >
          <span className="option__title">
            <Clock className="size-4" /> {QUANDO_PRONTO}
          </span>
          <span className="option__desc">
            {foraDoHorario
              ? "Indisponível agora: estamos fora do horário de atendimento."
              : prontoIndisponivel
                ? "Indisponível para entrega hoje. Agende para outro dia."
                : `Para quando finalizar o preparo (${tempo.minimoMin} a ${tempo.maximoMin} min).`}
          </span>
        </button>
        <button
          type="button"
          className="option"
          aria-pressed={quando === "agendar"}
          onClick={() => setQuando("agendar")}
        >
          <span className="option__title">
            <CalendarClock className="size-4" /> Data e hora específicas
          </span>
          <span className="option__desc">Escolha o dia e o horário.</span>
        </button>
      </div>
      {erros.quando && <p className="field__error mt-2">{erros.quando}</p>}
      {quando === "agendar" && (
        <div className="field mt-3">
          <Label htmlFor="horario">Data e horário</Label>
          <Input
            id="horario"
            type="datetime-local"
            value={horario}
            min={toLocalInputValue(menorHorario)}
            onChange={(e) => setHorario(e.target.value)}
            aria-invalid={!!erros.horarioAgendado}
          />
          {erros.horarioAgendado ? (
            <p className="field__error">{erros.horarioAgendado}</p>
          ) : (
            (horarioAtendimento ||
              (tipo === "ENTREGA" && semEntregaHoje)) && (
              <p className="field__hint">
                {[
                  horarioAtendimento &&
                    `Atendimento ${horarioAtendimento}.`,
                  tipo === "ENTREGA" &&
                    semEntregaHoje &&
                    "Entregas a partir de amanhã.",
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )
          )}
        </div>
      )}
    </section>
  );
};

export default Envio;
