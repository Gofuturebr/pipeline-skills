import type { EstadoMesaApi, PassoApi } from "@/lib/tipos-api";

export interface PropsAtividade {
  passo: PassoApi;
  estado: EstadoMesaApi;
  codigo: string;
  /** Fase concluída aberta para rever: nada pode ser alterado. */
  somenteLeitura: boolean;
  /** Endereço que os celulares abrem (o mesmo do QR). */
  enderecoParticipante: string;
  /** Chama uma rota da mesa e troca o estado da tela pela resposta. */
  aoAgir: (url: string, corpo?: unknown) => Promise<boolean>;
}
