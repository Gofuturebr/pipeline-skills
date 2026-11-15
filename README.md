# Mesa de Skills

Aplicação web da Oficina de Criação de Skills (InovaPB, 03/12/2026). Conduz cada mesa,
passo a passo, da leitura de um processo até uma skill do Claude testada e exportada.

- Contexto e regras do projeto: [`CLAUDE.md`](CLAUDE.md)
- Especificação funcional (fonte da verdade): [`docs/especificacao.md`](docs/especificacao.md)
- Especificação de frontend: [`docs/frontend.md`](docs/frontend.md)
- Decisões tomadas fora da especificação: [`docs/decisoes.md`](docs/decisoes.md)
- Guia da mesa (para o grupo e o Piloto): [`docs/guia-da-mesa.md`](docs/guia-da-mesa.md)
- Manual do gestor e do facilitador: [`docs/manual-gestor.md`](docs/manual-gestor.md)
- Critérios de aceite e onde cada um é conferido: [`docs/aceite.md`](docs/aceite.md)

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

O `next.config.ts` libera, só em desenvolvimento, os endereços de rede deste computador e as
faixas de rede local. Sem isso, o Next bloqueia o celular que abre o servidor pelo IP do Wi-Fi e
a tela fica parada em "Abrindo a mesa". Se o computador mudar de rede, reinicie o `npm run dev`.

Para o dia do evento rodando num computador da sala, prefira o modo de produção, mais rápido:

```bash
npm run build
```

```bash
npm start
```

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

Os testes de navegador usam a IA simulada (`IA_SIMULADA=1`), sem custo e sem chave.

### Teste de carga

Com o servidor rodando (de preferência `npm run build && npm start`) e um banco de teste:

```bash
npm run carga -- --url http://localhost:3000 --senha SENHA_DO_GESTOR --mesas 20 --celulares 100 --segundos 60
```

O script cria as mesas que faltarem, conecta os celulares, muda fases pelo admin e mostra o
tempo de resposta de cada rota, os erros e quanto uma mudança de fase leva para chegar à mesa.
O resultado mais recente está em [`docs/aceite.md`](docs/aceite.md).

## Publicar para o evento (Vercel e Supabase)

1. **Supabase:** crie um projeto. Em Project Settings, Database, copie duas strings de conexão:
   a do pooler em modo transação (porta 6543), para o servidor, e a conexão direta (porta 5432),
   para as migrações. Em Project Settings, API, copie a URL do projeto, a chave `anon` e a chave
   `service_role`.
2. **Banco:** no seu computador, com `DATABASE_URL` apontando para a conexão direta do Supabase,
   rode as migrações e, se quiser o evento de demonstração, o seed:

   ```bash
   npm run db:migrar
   ```

   ```bash
   npm run db:seed
   ```

   Depois, ajuste o evento, os processos e as mesas pela página de Preparo do admin.
3. **Vercel:** importe o repositório e preencha as variáveis de ambiente:

   | Variável | Valor |
   | --- | --- |
   | `DATABASE_URL` | Conexão do pooler do Supabase (porta 6543) |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Do passo 1. **Obrigatórias na Vercel:** sem elas, cada instância do servidor teria o próprio canal de tempo real e as telas deixariam de receber as mudanças |
   | `ANTHROPIC_API_KEY` | Chave da API. Fica só no servidor |
   | `ANTHROPIC_MODEL` | Opcional. Sem valor, vale o modelo padrão do `.env.example` |
   | `ADMIN_PASSWORD`, `FACILITADOR_PASSWORD` | Senhas do painel |
   | `SESSION_SECRET` | Texto longo e aleatório |
   | `URL_PUBLICA` | O endereço final, por exemplo `https://oficina.vercel.app`, para os QR codes |

   Não preencha `IA_SIMULADA` nem `DATABASE_URL_TESTE` na Vercel.
4. **Conferir antes do dia:** os itens da seção "Antes do evento" em [`docs/aceite.md`](docs/aceite.md),
   principalmente o tempo real pelo Supabase, que não é exercitado pelos testes automáticos.

Para recomeçar um banco remoto do zero, `npm run db:migrar -- --reset --forcar` apaga tudo.
Use com cuidado.

## Estrutura

```
app/                 rotas: mesa, p (celular), admin, api
components/base/     Botao, Campo, Selo, Cronometro, Faixa, Dialogo, Icone
components/mesa/     TelaMesa, Trilha, FolhaDeTrabalho, PastaViva
components/participante/  tela do celular
components/admin/    PainelAdmin, CartaoDaMesa, GavetaDaMesa, DetalheDaMesa, PreparoAdmin
components/atividades/  um componente por tipo de atividade
lib/jornada/         fases, passos, papéis, temas e critérios (dados)
lib/maquina.ts       máquina de estados da mesa
lib/ia/              cliente da API, IA simulada para testes e prompts de cada fase
lib/exportacao/      montagem da pasta, LEIA-ME e .zip
lib/servidor/        banco, ações, entrevista, rodadas, teste, conserto, entrega, preparo
supabase/migrations/ esquema do banco
supabase/seed/       evento de demonstração
scripts/             migrações, seed e teste de carga
tests/               testes unitários, de integração e de ponta a ponta
```
