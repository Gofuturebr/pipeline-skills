import { prepararBanco, encerrarSql } from "../ajuda/banco";

export default async function preparar() {
  await prepararBanco();
  await encerrarSql();
}
