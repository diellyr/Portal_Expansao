# Portal Expansão

**Gestão Regional**

Versão atual: consulte [`version.md`](version.md) (também exibida na interface, logo abaixo do logotipo na barra lateral e na tela de login). Histórico completo de mudanças em [`CHANGELOG.md`](CHANGELOG.md).

Portal Expansão é um painel administrativo para gestão e análise da juventude de nove cidades de uma região. O sistema centraliza cidades, congregações, jovens, liderança, talentos, batismos, eventos e indicadores regionais, respondendo visualmente a perguntas como "quantos jovens existem em cada cidade?", "quantos são batizados?", "quem prega ou canta?" e "quais são os próximos eventos?".

Este é um **MVP 100% local**, sem backend externo, pensado para ser publicado como site estático no GitHub Pages.

> Capturas de tela: adicione imagens em `assets/images/` e referencie-as aqui (ex.: `assets/images/dashboard.png`) após rodar a aplicação localmente.

---

## Sumário

- [Objetivo](#objetivo)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura de arquivos](#estrutura-de-arquivos)
- [Executar localmente](#executar-localmente)
- [Publicar no GitHub Pages](#publicar-no-github-pages)
- [Login demonstrativo](#login-demonstrativo)
- [Banco de dados local (IndexedDB)](#banco-de-dados-local-indexeddb)
- [Filtros globais](#filtros-globais)
- [Dashboard](#dashboard)
- [Relatórios](#relatórios)
- [Importação (CSV e Excel)](#importação-csv-e-excel)
- [Backup e restauração](#backup-e-restauração)
- [Zona de perigo](#zona-de-perigo)
- [Limitações do MVP](#limitações-do-mvp)
- [Integração com Supabase (modo desenvolvimento)](#integração-com-supabase-modo-desenvolvimento)
- [Aviso sobre dados sensíveis](#aviso-sobre-dados-sensíveis)

---

## Objetivo

Dar ao líder regional uma visão completa da juventude das nove cidades: total de jovens por cidade e congregação, status (ativo, visitante, novo convertido, ausente, transferido, inativo), batismos nas águas e no Espírito Santo, quem prega e quem canta, instrumentos tocados, distribuição por faixa etária, aniversariantes do mês e próximos eventos — tudo filtrável por cidade, congregação e diversos outros critérios combinados.

## Funcionalidades

- **Dashboard** com 11 cards de indicadores, uma seção de **demografia** (total geral/ativos/sem igreja cadastrada por sexo, aniversariantes de hoje e do mês), 12 gráficos (Chart.js — incluindo distribuição por sexo, aniversariantes por dia do mês, e três indicadores anuais por mês filtráveis por ano: cadastros, admissões e batismos), uma tabela de faixa etária cruzada por sexo, e 7 listas/alertas — tudo reativo aos filtros globais.
- **Cidades, Congregações, Jovens e Eventos**: cadastro completo (criar, editar, visualizar, excluir), busca, ordenação, paginação e indicadores por registro. Jovens podem ficar **sem congregação vinculada** ("sem igreja cadastrada"), refletido nos indicadores do dashboard.
- **Foto do jovem** (JPEG, até 5MB) com prévia no formulário, miniatura clicável na lista e uma **ficha digital** (foto + todos os dados) ao clicar no nome ou na foto.
- **Filtros globais combináveis**: cidade, congregação (escopada à cidade), status, faixa etária, batismo nas águas, batismo no Espírito Santo, prega, canta, instrumento e período — com chips removíveis mostrando os filtros ativos.
- **Relatórios**: 10 relatórios (por cidade, por congregação, por status, faixa etária, batismo nas águas, batismo no Espírito Santo, talentos, aniversariantes, dados incompletos e comparativo de cidades), com exportação em CSV, Excel e impressão.
- **Importação de planilhas** (CSV, XLS, XLSX) com mapeamento manual de colunas, detecção de cabeçalhos alternativos, normalização de datas/booleanos/textos, detecção de duplicados, criação assistida de cidades/congregações novas e prévia detalhada antes de confirmar. Durante a confirmação, uma barra de progresso mostra o percentual e a quantidade de registros já processados; ao final, uma mensagem de sucesso com o resumo ou, em caso de falha, uma mensagem com o motivo do erro e a opção de tentar novamente. Abaixo do botão de confirmação, um **console de importação** mostra em tempo real cada etapa (criação de cidade/congregação/jovem e cada tentativa de espelhamento para o Supabase), útil para descobrir por que uma sincronização com o Supabase não está indo.
- **Histórico de importações**, **backup/restauração em JSON**, **exportação de jovens em CSV/Excel**, **dados de demonstração** (carregar/remover) e **zona de perigo** com exclusões protegidas por confirmação.
- **Responsivo** (celular, tablet, notebook, desktop) e com cuidados de **acessibilidade** (HTML semântico, navegação por teclado, `aria-label`, `aria-live`, tabelas equivalentes aos gráficos para leitores de tela).
- **Tema claro/escuro** com chave seletora na barra superior (persistido em `localStorage`).
- **Alertas** (sino na barra superior) com aniversariantes do dia, próximos eventos e cadastros incompletos, calculados a partir dos dados reais.
- **Idioma** da interface (Português, Espanhol, Inglês) selecionável na barra superior — a tradução cobre a navegação, a barra superior e a tela de login; o conteúdo específico de cada página permanece em português nesta versão.
- **Fonte de dados alternável** (IndexedDB ou Supabase) em Administração, para testar a migração para um banco real — veja [Integração com Supabase](#integração-com-supabase-modo-desenvolvimento).

## Tecnologias

- HTML5 semântico, CSS3 (sem frameworks) e JavaScript puro em módulos ES (`type="module"`).
- IndexedDB para persistência local.
- [Chart.js](https://www.chartjs.org/) para gráficos, [Lucide Icons](https://lucide.dev/) para ícones e [SheetJS (xlsx)](https://sheetjs.com/) para leitura/escrita de Excel.
- Parser de CSV próprio (`js/parsers/csv-parser.js`), sem dependências externas.
- Bibliotecas carregadas via CDN (jsDelivr) com versão fixa — nenhum passo de build é necessário.

Não são usados React/Vue/Angular, TypeScript, Node.js como servidor, PHP, Python, SQLite/banco externo, frameworks CSS ou autenticação real.

## Arquitetura

A aplicação segue uma separação estrita de responsabilidades em camadas, para permitir que o IndexedDB seja substituído futuramente (por exemplo, por Supabase) sem reescrever páginas ou componentes:

```
Página (pages/*.html + js/pages/*.js)
  ↓ usa
Componentes visuais (js/components/*.js)  — não conhecem o banco
  ↓
Service (js/services/*.js)                 — regra de negócio, validações, filtros
  ↓
Repository (js/repositories/*.js)          — único ponto de acesso ao banco
  ↓
IndexedDB (js/database/db.js)
```

Nenhuma página ou componente acessa o IndexedDB diretamente — todo acesso passa por um repository, e toda regra de negócio (validação, cálculo de idade, deduplicação, agregações de relatórios) vive em um service. Isso significa que, na migração futura, basta reescrever os repositories (ex.: `SupabaseYouthRepository` no lugar de `IndexedDBYouthRepository`) mantendo a mesma interface pública — services, componentes e páginas permanecem inalterados.

## Estrutura de arquivos

```
portal-expansao/
├── index.html                 # Login demonstrativo
├── .nojekyll                  # Compatibilidade com GitHub Pages
├── pages/                     # HTML de cada página interna
│   ├── dashboard.html
│   ├── cidades.html
│   ├── congregacoes.html
│   ├── jovens.html
│   ├── eventos.html
│   ├── relatorios.html
│   └── administracao.html
├── css/
│   ├── variables.css          # Design tokens (cores, espaçamento, tipografia...)
│   ├── global.css             # Reset e estilos base
│   ├── layout.css             # Sidebar, topbar, grids
│   ├── components.css         # Cards, modal, toast, filtros, dropzone...
│   ├── tables.css             # Tabelas responsivas
│   ├── forms.css              # Formulários
│   ├── dashboard.css          # Estilos específicos do dashboard
│   └── responsive.css         # Ajustes finos de responsividade e impressão
├── js/
│   ├── app.js                 # Bootstrap de página (sidebar/topbar/auth guard)
│   ├── config/
│   │   ├── constants.js        # Constantes globais (status, faixas etárias, nav...)
│   │   └── supabase-config.js  # Credenciais estáticas opcionais do Supabase
│   ├── database/
│   │   ├── db.js               # Wrapper do IndexedDB (abrir, CRUD genérico)
│   │   ├── migrations.js       # Criação das object stores
│   │   ├── seed.js             # Gerador de dados de demonstração
│   │   ├── supabase-client.js  # Carrega o supabase-js via CDN e cria o client
│   │   └── supabase-db.js      # CRUD genérico equivalente ao db.js, via Supabase
│   ├── repositories/           # Único acesso ao banco (IndexedDB ou Supabase)
│   ├── services/               # Regras de negócio, filtros, relatórios, import, backup,
│   │                            #   tema, idioma, fonte de dados, console de importação
│   ├── parsers/                 # csv-parser.js e excel-parser.js
│   ├── components/             # Sidebar, topbar, cards, modal, toast, tabela, etc.
│   ├── pages/                  # Um controlador JS por página (+ login.js)
│   └── utils/                  # Validadores, formatadores, datas, DOM, arquivos, case-utils
├── assets/
│   ├── images/
│   └── icons/
├── README.md
├── CHANGELOG.md               # Histórico de mudanças por versão
└── version.md                  # Número da versão atual
```

## Executar localmente

A aplicação usa módulos ES (`import`/`export`), que os navegadores bloqueiam quando o arquivo é aberto diretamente com `file://`. É necessário servir os arquivos por HTTP. Qualquer servidor estático simples funciona; por exemplo, com Python (apenas para servir arquivos estáticos — a aplicação **não** depende de Python nem de qualquer backend):

```bash
cd portal-expansao
python -m http.server 8000
```

Depois acesse `http://localhost:8000` no navegador.

Alternativas equivalentes: `npx serve`, extensão "Live Server" do VS Code, ou qualquer servidor HTTP estático.

## Publicar no GitHub Pages

1. Faça commit e push de todo o conteúdo da pasta `portal-expansao` para o repositório.
2. Em **Settings → Pages**, selecione a branch e a pasta (`/` ou `/root`) onde está o `index.html`.
3. O arquivo `.nojekyll` já está incluso para evitar que o GitHub Pages ignore pastas/arquivos iniciados com `_`.
4. Todos os caminhos usados no projeto são **relativos** (nunca iniciando com `/`), então a aplicação funciona tanto na raiz de um domínio quanto em um subdiretório de projeto (`usuario.github.io/repositorio/`).

## Login demonstrativo

```
E-mail: admin@portalexpansao.local
Senha:  admin123
```

Este login é **apenas demonstrativo**:

- Não existe autenticação real nem criptografia — as credenciais estão no código-fonte do frontend (`js/config/constants.js`).
- A sessão é guardada em `sessionStorage` apenas para controlar a navegação entre páginas.
- **Não utilize dados reais sensíveis** em uma instância publicada publicamente, já que qualquer pessoa com acesso ao site consegue ver o código-fonte e as credenciais.
- Na versão futura com Supabase, o login será substituído por autenticação real (Supabase Auth).

## Banco de dados local (IndexedDB)

Todos os dados ficam salvos **no navegador do usuário**, no banco IndexedDB `portal_expansao_db`, com as stores `cities`, `congregations`, `youth`, `events`, `import_history` e `settings`. Cada registro possui `id` (gerado com `crypto.randomUUID()`), `createdAt` e `updatedAt`.

Implicações importantes:

- Os dados **persistem** entre recarregamentos da página, mas ficam presos àquele navegador/dispositivo específico.
- **Dispositivos diferentes não compartilham dados** — abrir o Portal Expansão em outro computador, celular ou até em outro navegador do mesmo computador mostra um banco vazio (ou com seus próprios dados locais).
- Limpar o cache/dados do site no navegador apaga o banco. Por isso, use a função de **backup** regularmente.

## Filtros globais

O dashboard, a página de Jovens e a página de Relatórios compartilham a mesma lógica de filtros (`js/services/filter-service.js`): cidade, congregação (as opções se restringem automaticamente à cidade selecionada), status, faixa etária, batismo nas águas, batismo no Espírito Santo, prega, canta, instrumento e período de cadastro. Os filtros são combináveis e refletidos em **chips removíveis**. A opção padrão é sempre "Todas as cidades".

## Dashboard

11 cards de indicadores, 12 gráficos (com paleta de cores estável por cidade/categoria durante a sessão, tooltips com valor absoluto e percentual, e alternância Pizza/Barras para as nove cidades e faixas etárias) e 7 listas: aniversariantes do mês, próximos eventos, jovens cadastrados recentemente, ranking de cidades e congregações, jovens por instrumento e alertas de cadastros incompletos. Clicar em uma cidade no gráfico aplica o filtro daquela cidade em toda a página; o botão "Restaurar visualização" limpa os filtros.

**Demografia**: quatro cards com total geral de membros, total de membros ativos, total sem igreja cadastrada (todos com quebra por Masculino/Feminino) e aniversariantes (hoje / mês atual).

**Gráficos adicionais**: distribuição percentual por sexo, aniversariantes por dia do mês (linha, dias 1 a 31) e uma tabela de faixa etária cruzada com sexo (Total/Masculino/Feminino por faixa).

**Indicadores anuais**: um seletor de Ano filtra três gráficos de barras — cadastros realizados no ano por mês, admissões no ano por mês (baseado na data de entrada) e batizados no ano por mês (baseado na data de batismo nas águas) — todos respeitando os filtros globais já aplicados.

## Relatórios

Página dedicada com 10 relatórios (jovens por cidade, por congregação, por status, faixa etária, batismo nas águas, batismo no Espírito Santo, talentos, aniversariantes por mês, dados incompletos e comparativo entre cidades), filtros próprios (incluindo "dados completos/incompletos" e mês de aniversário) com botões **Aplicar filtros**/**Limpar filtros**, e exportação em **CSV**, **Excel** e **Impressão**.

## Importação (CSV e Excel)

Fluxo completo em `js/services/import-service.js` + página `administracao.html`:

1. Selecionar arquivo (arrastar/soltar ou clique) — aceita `.csv`, `.xls`, `.xlsx`.
2. Se o Excel tiver múltiplas abas, escolher a aba.
3. Mapear manualmente cada coluna do arquivo para os campos esperados (`nome`, `cidade`, `congregacao`, `data_nascimento`, etc.) — cabeçalhos comuns (ex.: "Nome Completo", "Data de Nascimento", "Espírito Santo") são sugeridos automaticamente.
4. Normalização automática de textos, datas (`DD/MM/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY` e datas seriais do Excel) e booleanos (`sim/não/s/n/yes/no/true/false/1/0/batizado`).
5. Detecção de cidades e congregações novas (criadas somente após confirmação) e de duplicados (por nome + data de nascimento + congregação, ou nome + congregação + cidade quando não há data de nascimento).
6. Prévia com contagem de linhas válidas, com aviso, inválidas e duplicadas, além da quantidade de cidades/congregações novas — com opção de baixar um CSV apenas com as linhas problemáticas.
7. Estratégia para duplicados: ignorar (padrão), atualizar existentes ou importar mesmo assim.
8. Ao confirmar, uma barra de progresso mostra o percentual e a quantidade de linhas já processadas, e um console de importação (veja [Integração com Supabase](#integração-com-supabase-modo-desenvolvimento)) exibe cada etapa em tempo real — útil principalmente com o Supabase ativo. Ao final: mensagem de sucesso com o resumo, ou, em caso de falha, o motivo do erro e a opção de tentar novamente.
9. Após confirmar, o dashboard, relatórios e histórico de importações são atualizados automaticamente.

Modelos de planilha (CSV e Excel) podem ser baixados diretamente na página de Administração.

Campos aceitos na importação (nem todos precisam estar na planilha): `codigo`, `nome`, `data_nascimento`, `naturalidade`, `sexo`, `telefone`, `celular`, `endereco`, `numero`, `bairro`, `cep`, `cidade`, `congregacao`, `status`, `rg`, `orgao_emissor`, `cpf`, `escolaridade`, `profissao`, `cargo`, `estado_civil`, `outro_estado_civil`, `conjuge`, `conselheiro_local`, `conselheiro_cidade`, `pastor`, `pai`, `mae`, `data_batismo_aguas`, `batizado_espirito_santo`, `instrumento`, `prega`, `canta`, `outros_talentos`, `qtd`, `lider_expansao`, `se_lider`, `qual_departamento`, `nome_dirigente`, `recebido_por`, `tipo_admissao` e `observacoes`. Apenas `nome` e `cidade` são obrigatórios — `congregacao` é opcional (o jovem fica marcado como "sem igreja cadastrada").

> Atenção: `rg` e `cpf` são dados pessoais sensíveis. Veja o aviso em [Aviso sobre dados sensíveis](#aviso-sobre-dados-sensíveis) antes de usar dados reais em uma instância pública.

A importação é tolerante a variações na planilha:

- **Planilha com menos colunas que o esperado**: a importação continua normalmente — os campos ausentes ficam em branco para as linhas importadas — e a tela de mapeamento mostra um aviso listando quais colunas esperadas não foram encontradas no arquivo.
- **Planilha com colunas diferentes/extras**: as colunas do arquivo que não foram reconhecidas automaticamente por nenhum campo esperado são listadas na tela de mapeamento (podem ser mapeadas manualmente caso correspondam a algum campo).

## Backup e restauração

- **Exportar backup completo** (`portal-expansao-backup-YYYY-MM-DD.json`): inclui cidades, congregações, jovens, eventos, configurações e histórico de importações.
- **Restaurar backup**: mostra data do backup e quantidade de cada entidade antes de substituir os dados atuais (com confirmação explícita).
- **Exportar jovens filtrados** em CSV ou Excel, tanto na página de Jovens quanto em Relatórios. As fotos não são incluídas nesses arquivos (ficariam ilegíveis como texto); elas fazem parte apenas do backup JSON, que preserva o cadastro por completo.

## Zona de perigo

Disponível em Administração, com exclusões granulares (somente jovens, somente eventos, histórico de importações, dados de uma cidade específica, dados de demonstração) e uma exclusão total. A exclusão total exige: leitura do aviso, recomendação de backup, digitação exata de `APAGAR TODOS OS DADOS`, marcação do checkbox de confirmação — o botão de confirmação permanece desabilitado até que ambas as condições sejam satisfeitas. Após excluir, a estrutura do IndexedDB é mantida (apenas os dados são limpos), e a aplicação retorna ao dashboard.

## Limitações do MVP

- Não há sincronização entre dispositivos ou usuários — os dados são exclusivos do navegador local.
- A autenticação é apenas demonstrativa, sem controle de permissões ou papéis de usuário.
- Não há histórico de alterações (auditoria) além de `createdAt`/`updatedAt`.
- A exclusão de uma cidade ou congregação pelo formulário de cadastro **não** remove em cascata os registros vinculados (para isso, use a Zona de Perigo → "Apagar dados de uma cidade").
- Volumes muito grandes de dados podem impactar a performance do IndexedDB no navegador, já que todo o processamento acontece no cliente.

## Integração com Supabase (modo desenvolvimento)

Além do IndexedDB, o sistema já sabe falar com um projeto [Supabase](https://supabase.com) (Postgres) como banco alternativo, útil para testar a migração antes de trocar de vez. Esta seção documenta o processo completo: criar o projeto, criar as tabelas, apontar o sistema para ele e resolver o erro mais comum (RLS).

### 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login (ou crie uma conta).
2. Clique em **New Project**.
3. Escolha a organização, dê um nome (ex.: `portal-expansao`), defina uma senha forte para o banco (guarde-a) e escolha a região mais próxima (ex.: `South America (São Paulo)`).
4. Clique em **Create new project** e aguarde o provisionamento (leva alguns minutos).

### 2. Criar as tabelas (SQL Editor)

No painel do projeto, vá em **SQL Editor → New query**, cole o script abaixo e clique em **Run**. Ele cria as 6 tabelas que o sistema usa (os nomes de coluna são o equivalente em `snake_case` dos campos do app, ex.: `cidadeId` → `cidade_id`):

```sql
-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- CIDADES
create table cities (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  estado text default '',
  lider_cidade text default '',
  conselheiro_cidade text default '',
  telefone_lider text default '',
  pastor_responsavel text default '',
  ativo boolean default true,
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CONGREGAÇÕES
create table congregations (
  id uuid primary key default gen_random_uuid(),
  cidade_id uuid references cities(id) on delete cascade,
  nome text not null,
  bairro text default '',
  endereco text default '',
  pastor text default '',
  conselheiro_local text default '',
  telefone_conselheiro text default '',
  ativo boolean default true,
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- JOVENS
create table youth (
  id uuid primary key default gen_random_uuid(),
  codigo text default '',
  nome text not null,
  data_nascimento date,
  sexo text default '',
  telefone text default '',
  celular text default '',
  bairro text default '',
  endereco text default '',
  numero text default '',
  cep text default '',
  naturalidade text default '',
  rg text default '',
  orgao_emissor text default '',
  cpf text default '',
  cidade_id uuid references cities(id) on delete set null,
  congregacao_id uuid references congregations(id) on delete set null,
  status text default 'ativo',
  estado_civil text default '',
  outro_estado_civil text default '',
  conjuge text default '',
  escolaridade text default '',
  profissao text default '',
  cargo text default '',
  nome_pai text default '',
  nome_mae text default '',
  pastor text default '',
  conselheiro_local text default '',
  conselheiro_cidade text default '',
  data_batismo_aguas date,
  batizado_espirito_santo boolean default false,
  instrumento text default '',
  prega boolean default false,
  canta boolean default false,
  outros_talentos text default '',
  qtd text default '',
  lider_expansao boolean default false,
  se_lider text default '',
  qual_departamento text default '',
  nome_dirigente text default '',
  recebido_por text default '',
  tipo_admissao text default '',
  observacoes text default '',
  foto text,
  data_entrada date,
  ativo boolean default true,
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- EVENTOS
create table events (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text default 'outro',
  data date not null,
  horario text default '',
  cidade_id uuid references cities(id) on delete set null,
  congregacao_id uuid references congregations(id) on delete set null,
  regional boolean default false,
  local text default '',
  descricao text default '',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- HISTÓRICO DE IMPORTAÇÕES
create table import_history (
  id uuid primary key default gen_random_uuid(),
  nome_arquivo text not null,
  formato text default 'csv',
  total_linhas integer default 0,
  criados integer default 0,
  atualizados integer default 0,
  ignorados integer default 0,
  erros integer default 0,
  created_at timestamptz default now()
);

-- CONFIGURAÇÕES DO APP (registro único)
create table settings (
  id text primary key default 'app-settings',
  city_colors jsonb default '{}'::jsonb,
  sidebar_collapsed boolean default false
);
```

### 3. Liberar o acesso via RLS (Row Level Security)

Este é o passo que mais causa dúvida: o Supabase pode criar as tabelas com **RLS ativado por padrão**, e sem uma política explícita, toda escrita feita pela chave `anon` (a única credencial que este app usa, já que ele não tem autenticação real do Supabase) é **bloqueada** com um erro parecido com:

```
new row violates row-level security policy for table "cities"
```

Se você ver esse erro no console de importação (passo 7 abaixo) ou na tela de erro da importação, rode uma das opções abaixo no **SQL Editor**:

**Opção A — Desativar RLS (mais simples, recomendado enquanto está só testando):**

```sql
alter table cities disable row level security;
alter table congregations disable row level security;
alter table youth disable row level security;
alter table events disable row level security;
alter table import_history disable row level security;
alter table settings disable row level security;
```

**Opção B — Manter RLS ativo, com uma política liberando o `anon`:**

```sql
alter table cities enable row level security;
create policy "allow anon all" on cities for all to anon using (true) with check (true);

alter table congregations enable row level security;
create policy "allow anon all" on congregations for all to anon using (true) with check (true);

alter table youth enable row level security;
create policy "allow anon all" on youth for all to anon using (true) with check (true);

alter table events enable row level security;
create policy "allow anon all" on events for all to anon using (true) with check (true);

alter table import_history enable row level security;
create policy "allow anon all" on import_history for all to anon using (true) with check (true);

alter table settings enable row level security;
create policy "allow anon all" on settings for all to anon using (true) with check (true);
```

> **Atenção para quando for usar com dados reais**: como o login deste app é só demonstrativo (sem Supabase Auth), a chave `anon` é a mesma para qualquer visitante do site. Com RLS desligado (ou com a política `using (true)` acima), qualquer pessoa que abrir o site consegue ler e escrever todos os dados direto no Supabase. Isso é aceitável em modo de teste, mas antes de cadastrar dados reais de jovens (CPF, RG, telefone) é necessário implementar autenticação de verdade (Supabase Auth) com políticas de RLS que dependam do usuário logado.

### 4. Apontar o sistema para o Supabase

O app é um site estático (client-side puro, sem servidor próprio) — por isso, ao conectar, a opção correta na tela **"Connect to your project"** do Supabase é **Framework** ("Use a client library"), não "Server", "Direct" ou "ORM" (essas são para quem tem um backend próprio fazendo de intermediário, o que não é o caso aqui).

Na prática, você não precisa mexer em nada nessa tela do Supabase — o app já usa a biblioteca `@supabase/supabase-js` internamente. Basta pegar dois valores em **Project Settings → API** no painel do Supabase:

- **Project URL** (algo como `https://xxxxxxxxxxxx.supabase.co`)
- **anon public key** (uma chave longa começando geralmente com `eyJ...`)

E preenchê-los em **Administração → Fonte de dados**, no formulário abaixo da chave seletora IndexedDB/Supabase. Ao clicar em **Salvar credenciais**, elas ficam gravadas neste navegador (`localStorage`) — não é preciso editar nenhum arquivo nem mexer em variáveis de ambiente.

Se preferir manter as credenciais versionadas no repositório (por exemplo, para não digitá-las de novo em cada navegador), também é possível preenchê-las em `js/config/supabase-config.js` — mas isso é opcional; o formulário na tela sempre tem prioridade sobre o arquivo.

A chave `anon` é pública por natureza (é para ser exposta no navegador) — a segurança real vem das políticas de RLS (passo 3), não do sigilo da chave.

### 5. Alternar entre IndexedDB e Supabase

Em **Administração → Fonte de dados** há uma chave seletora para escolher qual banco o sistema usa no dia a dia (dashboard, cadastros, relatórios). Ela fica salva no navegador (não é uma configuração do projeto) e é bloqueada se você tentar ativar o Supabase antes de preencher e salvar as credenciais.

### 6. Importação alimenta os dois bancos

Independentemente da chave seletora, toda vez que uma planilha é importada (Administração → Importação de dados), cada cidade, congregação e jovem criado ou atualizado é gravado **nos dois bancos** — IndexedDB e Supabase — para que fiquem sincronizados enquanto o Supabase ainda está em teste. Se o Supabase não estiver configurado, a importação continua funcionando normalmente só no IndexedDB (o espelhamento é ignorado silenciosamente); se estiver configurado mas alguma gravação falhar, um aviso aparece ao final da importação.

Fora da importação (cadastro manual, backup/restauração, dados de demonstração, zona de perigo), cada operação afeta **apenas** o banco ativo no momento — não há espelhamento automático nesses fluxos.

### 7. Diagnosticar problemas (console de importação)

Abaixo do botão "Confirmar importação", em Administração, há um **console de importação** (painel estilo terminal) que mostra em tempo real cada etapa: qual banco está ativo, criação de cidade/congregação/jovem e, principalmente, cada tentativa de espelhamento para o Supabase com sucesso ou com o erro exato retornado pelo banco (ex.: o erro de RLS do passo 3). Use-o sempre que uma importação ou sincronização "não estiver indo" — ele evita ter que abrir o console de desenvolvedor do navegador.

### Arquitetura da troca

A camada de repositories permanece o único ponto de acesso ao banco — cada `*Repository` decide, a cada chamada, se fala com IndexedDB (`js/database/db.js`) ou Supabase (`js/database/supabase-db.js`) consultando `js/services/data-mode-service.js`. Nenhuma página, componente ou gráfico precisa saber qual banco está ativo.

```
YouthService
  ↓
YouthRepository → getDataMode() → IndexedDB  ou  Supabase
```

A autenticação continua demonstrativa (`js/services/auth-service.js`) — a troca por Supabase Auth fica para uma etapa futura, fora do escopo desta integração.

## Aviso sobre dados sensíveis

Este projeto é um MVP local e demonstrativo. **Não cadastre dados pessoais sensíveis reais** (nomes completos, telefones, endereços, **RG e CPF** de jovens e famílias reais) em uma instância publicada publicamente no GitHub Pages, já que qualquer visitante consegue inspecionar o código-fonte e as credenciais de demonstração. O cadastro de Jovens inclui campos de documento (RG, CPF) para espelhar a ficha física de membresia — trate-os com o mesmo cuidado que trataria os documentos físicos. Lembre-se que os dados inseridos por um usuário ficam salvos **somente no navegador dele** (não há vazamento entre usuários), mas o risco está em usar a demonstração pública com dados verídicos. Para uso em produção com dados reais, aguarde a migração para Supabase com autenticação, regras de acesso e, idealmente, criptografia adequadas para os campos de documento.
