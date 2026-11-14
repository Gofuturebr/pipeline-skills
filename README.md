# Mesa de Skills

Aplicação web da Oficina de Criação de Skills (InovaPB, 03/12/2026). Conduz cada mesa,
passo a passo, da leitura de um processo até uma skill do Claude testada e exportada.

- Contexto e regras do projeto: [`CLAUDE.md`](CLAUDE.md)
- Especificação funcional (fonte da verdade): [`docs/especificacao.md`](docs/especificacao.md)
- Especificação de frontend: [`docs/frontend.md`](docs/frontend.md)
- Decisões tomadas fora da especificação: [`docs/decisoes.md`](docs/decisoes.md)
- Guia da mesa (para o grupo e o Piloto): [`docs/guia-da-mesa.md`](docs/guia-da-mesa.md)
- Manual do gestor e do facilitador: [`docs/manual-gestor.md`](docs/manual-gestor.md)

## Rodar no seu computador

Precisa de Node.js 22 e de um Postgres (local ou do Supabase).

```bash
npm install
```

```bash
cp .env.example .env.local
```

Edite `.env.local`: preencha `DATABASE_URL`, `ADMIN_PASSWORD`, `FACILITADOR_PASSWORD` e
`SESSION_SECRET`. Sem as variáveis do Supabase, o tempo real usa o canal local, que serve
para um único servidor.

```bash
npm run db:reset
```

Esse comando apaga o banco local, aplica o esquema e cria o evento de demonstração com 3
mesas: códigos `K7PX2M`, `R4TW9H` e `B8NC3F`. Ele se recusa a rodar contra um banco que não
seja local.

```bash
npm run dev
```

Abra `http://localhost:3000` para a mesa e `http://localhost:3000/admin` para o gestor.

### Celulares na mesma rede

O `npm run dev` já aceita conexões da rede (linha `Network` no terminal). Quando a tela da mesa
é aberta por `localhost`, o QR aponta para o endereço do computador na rede Wi-Fi, e os
celulares conectados ao mesmo Wi-Fi conseguem entrar. No Windows, permita o Node.js no firewall
quando ele perguntar. Para fixar outro endereço (por exemplo, o da Vercel), preencha
`URL_PUBLICA` no `.env.local`.

### Depois de baixar uma versão nova

```bash
npm install
```

```bash
npm run db:migrar
```

O `db:migrar` aplica só o que mudou no banco, sem apagar o que já existe. Depois, reinicie o
`npm run dev`.

## Verificações

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

Os testes de integração usam `DATABASE_URL_TESTE`, que é apagado a cada execução. Sem essa
variável, eles são pulados.

```bash
npm run build && npm run test:e2e
```

## Estrutura

```
app/                 rotas: mesa, p (celular), admin, api
components/base/     Botao, Campo, Selo, Cronometro, Faixa, Dialogo, Icone
components/mesa/     TelaMesa, Trilha, FolhaDeTrabalho, PastaViva
components/participante/  tela do celular
components/admin/    PainelAdmin, CartaoDaMesa, GavetaDaMesa
components/atividades/  um componente por tipo de atividade
lib/jornada/         fases, passos, papéis, temas e critérios (dados)
lib/maquina.ts       máquina de estados da mesa
lib/servidor/        banco, ações, sessão do admin e sinais de tempo real
supabase/migrations/ esquema do banco
supabase/seed/       evento de demonstração
tests/               testes unitários, de integração e de ponta a ponta
```
