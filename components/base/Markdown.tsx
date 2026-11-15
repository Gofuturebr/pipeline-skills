import { Fragment, type ReactNode } from "react";

// Visualização formatada dos arquivos da pasta. Entende títulos, listas,
// listas de conferência e negrito. Não usa HTML do texto: tudo vira elemento React.

function emLinha(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return partes.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="font-mono text-[0.92em]">{p.slice(1, -1)}</code>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function Markdown({ texto, tamanho = "mesa" }: { texto: string; tamanho?: "mesa" | "normal" }) {
  const base = tamanho === "mesa" ? "text-xl" : "text-[15px]";
  const blocos: ReactNode[] = [];
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  let lista: { tipo: "ul" | "ol"; itens: ReactNode[] } | null = null;
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length) {
      // Quebra de linha dentro do parágrafo vale: numa mensagem de WhatsApp, cada linha importa.
      const linhasDoParagrafo = paragrafo;
      blocos.push(
        <p key={blocos.length} className="leading-normal">
          {linhasDoParagrafo.map((l, i) => (
            <Fragment key={i}>
              {i > 0 ? <br /> : null}
              {emLinha(l)}
            </Fragment>
          ))}
        </p>,
      );
      paragrafo = [];
    }
  };
  const fecharLista = () => {
    if (lista) {
      const Tag = lista.tipo;
      blocos.push(
        <Tag key={blocos.length} className={`flex flex-col gap-1 pl-6 ${lista.tipo === "ol" ? "list-decimal" : "list-disc"}`}>
          {lista.itens}
        </Tag>,
      );
      lista = null;
    }
  };

  for (const linha of linhas) {
    const h = linha.match(/^(#{1,3})\s+(.*)$/);
    const conf = linha.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/);
    const ul = linha.match(/^\s*[-*]\s+(.*)$/);
    const ol = linha.match(/^\s*\d+[.)]\s+(.*)$/);
    if (h) {
      fecharParagrafo();
      fecharLista();
      const nivel = h[1].length;
      const cls =
        nivel === 1
          ? "font-titulo text-[1.5em] font-bold leading-tight"
          : nivel === 2
            ? "mt-2 font-titulo text-[1.2em] font-semibold leading-tight"
            : "font-bold";
      blocos.push(<p key={blocos.length} role="heading" aria-level={nivel + 2} className={cls}>{emLinha(h[2])}</p>);
    } else if (conf || ul || ol) {
      fecharParagrafo();
      const tipo = ol ? "ol" : "ul";
      if (!lista || lista.tipo !== tipo) {
        fecharLista();
        lista = { tipo, itens: [] };
      }
      const conteudo = conf ? (
        <span>
          <span aria-hidden className="mr-2 font-mono">{conf[1].trim() ? "☑" : "☐"}</span>
          {emLinha(conf[2])}
        </span>
      ) : (
        emLinha((ol ?? ul)![1])
      );
      lista.itens.push(<li key={lista.itens.length} className="leading-normal">{conteudo}</li>);
    } else if (!linha.trim()) {
      fecharParagrafo();
      fecharLista();
    } else {
      fecharLista();
      paragrafo.push(linha.trim());
    }
  }
  fecharParagrafo();
  fecharLista();
  return <div className={`flex flex-col gap-3 ${base}`}>{blocos}</div>;
}
