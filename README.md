# Portal Expansão

**Gestão Regional**

Versão atual: consulte [`version.md`](version.md) (também exibida na interface, logo abaixo do logotipo na barra lateral e na tela de login). Histórico completo de mudanças em [`CHANGELOG.md`](CHANGELOG.md).

> **Procurando o manual para usar o sistema no dia a dia (não para instalar/configurar)?**
> Veja o [`MANUAL_DO_USUARIO.md`](MANUAL_DO_USUARIO.md). Uma versão pronta para impressão/PDF
> está em [`docs/manual-usuario.html`](docs/manual-usuario.html) — basta abrir no navegador e
> usar Imprimir → Salvar como PDF (o mesmo recurso usado nas fichas de jovens do sistema).

Portal Expansão é um painel administrativo para gestão e análise da juventude de nove cidades de uma região. O sistema centraliza cidades, congregações, jovens, liderança, talentos, batismos, eventos e indicadores regionais, respondendo visualmente a perguntas como "quantos jovens existem em cada cidade?", "quantos são batizados?", "quem prega ou canta?" e "quais são os próximos eventos?".

Este é um **MVP 100% local**, sem backend externo, pensado para ser publicado como site estático no GitHub Pages.

> Capturas de tela: adicione imagens em `assets/images/` e referencie-as aqui (ex.: `assets/images/dashboard.png`) após rodar a aplicação localmente.

---

## Sumário

- [Objetivo](#objetivo)
- [Funcionalidades](#funcionalidades)
- [Módulos de análise e produtividade (v1.11.0)](#módulos-de-análise-e-produtividade-v1110)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura de arquivos](#estrutura-de-arquivos)
- [Executar localmente](#executar-localmente)
- [Publicar no GitHub Pages](#publicar-no-github-pages)
- [Autenticação](#autenticação)
- [Perfis e permissões (RBAC)](#perfis-e-permissões-rbac)
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

- **Dashboard** com 11 cards de indicadores, uma seção de **demografia** (total geral/ativos/sem igreja cadastrada por sexo, aniversariantes de hoje e do mês), 13 gráficos (Chart.js — incluindo distribuição por sexo, aniversariantes por dia do mês, três indicadores anuais por mês filtráveis por ano: cadastros, admissões e batismos, e um comparativo de crescimento acumulado por cidade com filtro de intervalo de anos), uma tabela de faixa etária cruzada por sexo, e 7 listas/alertas — tudo reativo aos filtros globais.
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
- **Autenticação real** via Supabase Auth (substitui o login demonstrativo anterior) — veja [Autenticação](#autenticação).

## Módulos de análise e produtividade (v1.11.0)

Dez módulos adicionados sem nenhuma alteração de schema no Supabase — tudo calculado no
front-end a partir dos mesmos dados já lidos por `YouthService`/`CityService`/
`CongregationService`, respeitando o RBAC existente automaticamente (RLS já filtra o que
cada papel pode ler).

- **Central de Qualidade dos Cadastros** (`qualidade.html`) — sinaliza cadastros
  incompletos, possíveis duplicados (nome/telefone, comparados sem acento/maiúsculas),
  datas incoerentes (batismo antes do nascimento, datas no futuro) e cidades/congregações
  com grafia semelhante. Nunca altera nada sozinho: cada item tem um botão "Abrir cadastro"
  que leva à edição manual em Jovens.
- **Pesquisa Global Inteligente** — campo de busca na barra superior (todas as páginas),
  encontra jovens por nome, cidade, congregação, conselheiro, pastor, instrumento ou
  telefone, com busca sem acento/maiúscula e resultados que abrem a ficha direto.
- **Alertas Automáticos** (sino da barra superior) — agora organizados em categorias
  (Atenção necessária, Aniversários, Oportunidade ministerial, Informativo): aniversariantes
  da semana/mês, sem batismo, sem conselheiro, congregações com completude abaixo de 50%,
  jovens com talentos identificáveis e cidades com poucos jovens cadastrados (limite ≤ 3,
  sempre citado explicitamente no texto do alerta).
- **Relatório Individual do Jovem** — a ficha do jovem (usada em Jovens, Qualidade, Pesquisa
  Global, Listas e Favoritos) ganhou "Imprimir/PDF" (via impressão do navegador), "Cartão
  resumido" para reunião de liderança e "Copiar para WhatsApp".
- **Segmentação Automática** — chips de filtro rápido em Jovens (Adolescentes, Jovens
  adultos, Músicos, Pregadores, Cantores, Não batizados, Aniversariantes do mês, Sem
  conselheiro, Cadastro incompleto), combináveis com os filtros e a busca já existentes.
- **Gerador de Listas para Eventos** (`listas.html`) — monta uma lista sob medida (mesmos
  filtros/segmentos de Jovens) e exporta em Excel, imprime/gera PDF, copia só os nomes ou
  um texto pronto para WhatsApp.
- **Comparador de Cidades** (`comparador.html`) — seleção de 2+ cidades, gráficos de barras
  e tabelas comparando totais, faixa etária, músicos/pregadores/cantores, batismos, %
  com conselheiro e completude média.
- **Painel de Cobertura Regional** (`cobertura-regional.html`) — visão de todas as cidades
  com linguagem deliberadamente neutra (nunca "melhor/pior cidade" ou "vencedora"; usa
  "maior/menor quantidade registrada", "região que pode precisar de apoio" etc.) e um aviso
  fixo de que os números refletem só o que está cadastrado no sistema.
- **Modo Apresentação** (Dashboard) — oculta menu/topo, aumenta gráficos/indicadores e
  solicita tela cheia (com um botão sempre visível para sair, além de Esc).
- **Favoritos e Preferências** (`favoritos.html`) — cidades favoritas (estrela em Cidades),
  jovens vistos recentemente (guarda só id+nome, nunca telefone/data/endereço), itens por
  página em Jovens e um botão para limpar tudo. Fica só no navegador local (`localStorage`)
  e nunca acompanha o usuário para outro dispositivo.

## Tecnologias

- HTML5 semântico, CSS3 (sem frameworks) e JavaScript puro em módulos ES (`type="module"`).
- IndexedDB para persistência local.
- [Chart.js](https://www.chartjs.org/) para gráficos, [Lucide Icons](https://lucide.dev/) para ícones e [SheetJS (xlsx)](https://sheetjs.com/) para leitura/escrita de Excel.
- Parser de CSV próprio (`js/parsers/csv-parser.js`), sem dependências externas.
- Bibliotecas carregadas via CDN (jsDelivr) com versão fixa — nenhum passo de build é necessário.

Não são usados React/Vue/Angular, TypeScript, Node.js como servidor, PHP, Python, SQLite/banco externo ou frameworks CSS. A autenticação (login) usa o Supabase Auth — veja [Autenticação](#autenticação).

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
├── index.html                 # Tela de login (Supabase Auth)
├── .nojekyll                  # Compatibilidade com GitHub Pages
├── pages/                     # HTML de cada página interna
│   ├── dashboard.html
│   ├── cidades.html
│   ├── congregacoes.html
│   ├── jovens.html
│   ├── eventos.html
│   ├── relatorios.html
│   ├── qualidade.html          # Central de Qualidade dos Cadastros
│   ├── listas.html              # Gerador de Listas para Eventos
│   ├── comparador.html          # Comparador de Cidades
│   ├── cobertura-regional.html  # Painel de Cobertura Regional
│   ├── favoritos.html           # Favoritos e Preferências
│   ├── backup.html
│   ├── usuarios.html
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

## Autenticação

O login usa **Supabase Auth** de verdade — não há e-mail/senha fixos no código-fonte.

- A conta de administrador é criada diretamente no painel do Supabase (**Authentication → Users → Add user**), não neste repositório.
- Ao entrar, o app chama o Supabase para validar e-mail/senha (`js/services/auth-service.js`); um sinalizador local em `sessionStorage` só controla a navegação entre páginas — a segurança de verdade vem da própria autenticação do Supabase e das políticas de RLS (veja abaixo).
- **Login exige o Supabase configurado**: como a autenticação depende do Supabase, é necessário ter a URL e a chave anon preenchidas (veja [Integração com Supabase](#integração-com-supabase-modo-desenvolvimento)) antes de conseguir entrar — sem isso, a tela mostra um erro claro em vez de travar.
- Como a tela de Administração (onde essas credenciais são configuradas) fica **atrás do login**, um dispositivo novo só consegue entrar se a URL/chave já estiverem em `js/config/supabase-config.js` (ou seja, para acessar de vários dispositivos, esse arquivo precisa estar preenchido — não basta salvar pelo formulário em um navegador só).
- As políticas de RLS das tabelas devem estar liberadas para o papel `authenticated` (não mais para `anon`) — veja o SQL na seção de Supabase.
- Além de autenticar, cada login tem um **perfil** (papel + cidade, quando aplicável) que define o que a pessoa pode ver e editar — veja [Perfis e permissões (RBAC)](#perfis-e-permissões-rbac).

### Trocar a própria senha

Qualquer pessoa logada pode trocar a própria senha em **Menu do usuário (nome/e-mail no canto superior direito) → Alterar senha**. O formulário pede a senha atual (revalidada com um novo login silencioso antes de trocar, para confirmar que é mesmo a pessoa dona da conta) e a nova senha (mínimo 6 caracteres, com confirmação). Usa `auth.updateUser()` do Supabase — só a chave anon, sem depender de e-mail.

### Esqueci minha senha

Na tela de login, o link **"Esqueci minha senha"** abre um formulário para informar o e-mail. O app chama `auth.resetPasswordForEmail()`, que envia (se aquele e-mail tiver conta cadastrada) uma mensagem com um link de redefinição — o mesmo e-mail usado para fazer login, que é também o que fica salvo em `user_profiles.email`; não existe um campo de e-mail "de contato" separado, o e-mail de login **é** o e-mail de recuperação.

Por segurança, o Supabase sempre responde com sucesso nessa chamada, exista ou não uma conta com aquele e-mail (evita que alguém descubra quais e-mails têm cadastro só tentando o "esqueci minha senha").

O link do e-mail leva para `redefinir-senha.html` (`js/pages/redefinir-senha.js`), uma página fora da área logada que:
1. Detecta o token de recuperação que o Supabase anexa à URL (automático, via `detectSessionInUrl` do `supabase-js`) e cria uma sessão temporária só para essa troca.
2. Mostra um formulário de nova senha + confirmação; ao salvar, chama `auth.updateUser({ password })` e depois `auth.signOut()` (encerra a sessão de recuperação — a pessoa faz login normalmente em seguida, com a senha nova).
3. Se o link já expirou ou é inválido, mostra uma mensagem pedindo para solicitar um novo.

**Configuração obrigatória no painel do Supabase** para o link do e-mail funcionar:

1. No painel do seu projeto, clique em **Authentication** no menu lateral.
2. Abra a seção **URL Configuration**.
3. No campo **Redirect URLs**, clique em **Add URL** e cole a URL completa de `redefinir-senha.html` do seu site publicado, por exemplo:
   ```
   https://SEU-USUARIO.github.io/Portal_Expansao/redefinir-senha.html
   ```
4. Clique em **Save**.

Detalhes importantes:
- A URL precisa ser **exata** (protocolo `https://`, caminho e nome do arquivo certinhos) — o Supabase compara literalmente e recusa o redirecionamento para qualquer URL fora dessa lista.
- Adicionar essa URL não remove nenhuma outra que já esteja cadastrada ali — é só mais uma entrada na lista.
- Se o domínio do site mudar no futuro (por exemplo, sair do `github.io` para um domínio próprio), essa URL precisa ser atualizada/adicionada de novo, senão o link de redefinição para de funcionar mesmo com o site certo no ar.

> O envio do e-mail usa o serviço de e-mail do próprio Supabase, que é limitado e pensado para testes (a mesma limitação já vale para o e-mail de confirmação de conta). Para uso real, configure um SMTP próprio em **Authentication → Providers → Email → SMTP Settings** — sem isso, o link de redefinição pode demorar, cair em spam ou não chegar.

## Perfis e permissões (RBAC)

> Só existe controle de permissões por papel (RBAC) **com o Supabase ativo**. No modo IndexedDB (sem Supabase configurado), não há conceito de múltiplos usuários — quem consegue entrar tem acesso total, como sempre funcionou.

### Papéis disponíveis

| Perfil | Abrangência | Cidades/Congregações/Jovens | Eventos |
|---|---|---|---|
| **Administrador** | Tudo | Cria, edita e exclui em todas as cidades | Cria, edita e exclui em todas as cidades |
| **Líder Simplifique Regional** | Todas as cidades | Cria, edita e exclui em todas as cidades | Cria, edita e exclui em todas as cidades |
| **Conselheiro Regional** | Todas as cidades | Mesmo acesso do Líder Simplifique Regional (nome diferente) | Mesmo acesso do Líder Simplifique Regional |
| **Líder Simplifique** | Uma cidade (escolhida ao criar o usuário) | Cria, edita e exclui **apenas na própria cidade** | Cria, edita e exclui **apenas eventos da própria cidade**, mas **vê eventos de todas as cidades** |
| **Conselheiro** | Uma cidade | Mesmo acesso do Líder Simplifique (nome diferente) | Mesmo acesso do Líder Simplifique |
| **Convidado Regional** | Todas as cidades | Somente leitura | Somente leitura, todas as cidades |
| **Convidado Local** | Uma cidade | Somente leitura, apenas da própria cidade | Somente leitura, apenas da própria cidade (sem exceção — diferente do Líder Simplifique/Conselheiro) |

Regras gerais:

- Toda criação de usuário exige escolher um **perfil**; os quatro perfis "de cidade" (Líder Simplifique, Conselheiro, Convidado Local) também exigem escolher a **cidade**. Os três perfis "regionais" (Administrador, Líder Simplifique Regional, Conselheiro Regional, Convidado Regional) não precisam de cidade, pois já acessam tudo.
- **Somente o usuário Administrador** enxerga e acessa as páginas **Administração** e **Usuários** — os outros seis perfis nem veem esses itens no menu, e o próprio banco (RLS) bloqueia o acesso caso alguém tente chamar a API diretamente.
- **Exceção**: o módulo **Backup & Exportação** (veja abaixo) é visível para Líder Simplifique Regional, Conselheiro Regional, Líder Simplifique e Conselheiro, além do Administrador — os dois perfis "Convidado" continuam sem acesso a ele.
- A aplicação aplica essas regras tanto na interface (menu/redirecionamento) quanto no banco (políticas de RLS abaixo) — a proteção real está no banco, já que a interface sozinha pode ser contornada por quem tiver a chave anon.

### Módulo "Usuários"

Página própria (`pages/usuarios.html`), separada de Administração, visível apenas para o Administrador. Nela é possível:

- Listar os usuários cadastrados (e-mail, perfil, cidade e data de criação).
- Criar um novo usuário informando e-mail, uma senha temporária, o perfil e (quando exigido) a cidade.
- Editar o perfil/cidade de um usuário existente.
- Remover o acesso de um usuário (apaga o vínculo de perfil — a pessoa perde acesso aos dados imediatamente — mas **não** apaga a conta de login do Supabase Auth).

**Como funciona a criação de usuário por trás dos panos:** este app é 100% estático (sem servidor próprio), então criar contas de login novas só pode ser feito com a chave **anon** — a mesma que o app já usa para tudo. A chave especial que o Supabase usa para criar/gerenciar contas com privilégios administrativos (`service_role`) **nunca pode** ficar em código que roda no navegador (qualquer visitante do site conseguiria lê-la e teria acesso total ao banco). Por isso, o fluxo de criação é:

1. O botão "Novo usuário" chama `auth.signUp()` — a mesma função que qualquer pessoa usaria para se auto-cadastrar — só que com um **cliente Supabase isolado**, criado só para essa chamada e configurado para **não** guardar sessão (`persistSession: false`). Isso evita um efeito colateral do `signUp()`: por padrão, ele troca a sessão ativa do navegador para a do usuário recém-criado — o que derrubaria o login do Administrador que está cadastrando. Com o cliente isolado, a sessão do Administrador continua intacta.
2. Depois que a conta é criada no Supabase Auth, o app grava uma linha na tabela `user_profiles` (usando o cliente normal, autenticado como Administrador) com o perfil e a cidade escolhidos.
3. No próximo login dessa pessoa, o app lê essa linha para saber o que ela pode fazer.

Limitações herdadas dessa abordagem (inerentes a um app sem backend, não é algo que dá para "consertar" no código):

- Por padrão, o Supabase pode exigir confirmação por e-mail para novas contas — se isso estiver ativo, a pessoa só consegue entrar depois de confirmar o e-mail recebido (ajustável em **Authentication → Providers → Email** no painel do Supabase).
- **Excluir de vez** uma conta do Supabase Auth (não só o acesso ao app) ou **forçar a troca de senha** de outra pessoa só é possível pelo painel do Supabase (**Authentication → Users**), nunca por este app.
- Toda criação de usuário usa a chave anon, então ela é sujeita às mesmas políticas de RLS de qualquer outra operação — é por isso que a tabela `user_profiles` (abaixo) tem suas próprias políticas restringindo quem pode inserir/editar linhas nela.

### SQL: tabela de perfis e políticas de RLS por papel

Rode este script **depois** de já ter as 6 tabelas da seção [Integração com Supabase](#integração-com-supabase-modo-desenvolvimento) e a autenticação configurada. Ele substitui as políticas simples "libera tudo para authenticated" (Opção C) por políticas que checam o papel e a cidade de cada usuário.

```sql
-- ================================
-- TABELA DE PERFIS (papel + cidade de cada login)
-- ================================
create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in (
    'admin',
    'lider_simplifique_regional',
    'conselheiro_regional',
    'lider_simplifique',
    'conselheiro',
    'convidado_regional',
    'convidado_local'
  )),
  cidade_id uuid references cities(id) on delete set null,
  created_at timestamptz default now()
);

alter table user_profiles enable row level security;

-- Funções auxiliares (security definer: leem user_profiles ignorando RLS,
-- o que evita recursão infinita nas políticas que as usam)
create or replace function public.current_user_role() returns text
language sql security definer stable as $$
  select role from public.user_profiles where user_id = auth.uid();
$$;

create or replace function public.current_user_cidade_id() returns uuid
language sql security definer stable as $$
  select cidade_id from public.user_profiles where user_id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
language sql security definer stable as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.is_regional() returns boolean
language sql security definer stable as $$
  select public.current_user_role() in ('admin', 'lider_simplifique_regional', 'conselheiro_regional');
$$;

create or replace function public.is_city_editor() returns boolean
language sql security definer stable as $$
  select public.current_user_role() in ('lider_simplifique', 'conselheiro');
$$;

-- Cada usuário lê o próprio perfil (necessário para o app saber seu papel);
-- só o Administrador lê/cria/edita/remove os perfis de todo mundo.
create policy "user_profiles select" on user_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "user_profiles insert (admin)" on user_profiles for insert to authenticated
  with check (public.is_admin());
create policy "user_profiles update (admin)" on user_profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "user_profiles delete (admin)" on user_profiles for delete to authenticated
  using (public.is_admin());

-- Cria o perfil do Administrador para a conta já existente
-- (troque o e-mail abaixo se a sua conta admin usar outro)
insert into user_profiles (user_id, email, role, cidade_id)
select id, email, 'admin', null from auth.users where email = 'admin@portalexpansao.local'
on conflict (user_id) do update set role = 'admin';

-- ================================
-- CIDADES: leitura por todo mundo dentro do escopo; escrita restrita
-- ================================
drop policy if exists "allow authenticated all" on cities;
drop policy if exists "allow anon all" on cities;

create policy "cities select" on cities for select to authenticated
  using (
    public.is_regional()
    or public.current_user_role() = 'convidado_regional'
    or id = public.current_user_cidade_id()
  );
create policy "cities insert (regional)" on cities for insert to authenticated
  with check (public.is_regional());
create policy "cities update" on cities for update to authenticated
  using (public.is_regional() or (public.is_city_editor() and id = public.current_user_cidade_id()))
  with check (public.is_regional() or (public.is_city_editor() and id = public.current_user_cidade_id()));
create policy "cities delete (regional)" on cities for delete to authenticated
  using (public.is_regional());

-- ================================
-- CONGREGAÇÕES: mesmo padrão de cidades, usando a coluna cidade_id
-- ================================
drop policy if exists "allow authenticated all" on congregations;
drop policy if exists "allow anon all" on congregations;

create policy "congregations select" on congregations for select to authenticated
  using (
    public.is_regional()
    or public.current_user_role() = 'convidado_regional'
    or cidade_id = public.current_user_cidade_id()
  );
create policy "congregations write" on congregations for all to authenticated
  using (public.is_regional() or (public.is_city_editor() and cidade_id = public.current_user_cidade_id()))
  with check (public.is_regional() or (public.is_city_editor() and cidade_id = public.current_user_cidade_id()));

-- ================================
-- JOVENS: mesmo padrão de congregações
-- ================================
drop policy if exists "allow authenticated all" on youth;
drop policy if exists "allow anon all" on youth;

create policy "youth select" on youth for select to authenticated
  using (
    public.is_regional()
    or public.current_user_role() = 'convidado_regional'
    or cidade_id = public.current_user_cidade_id()
  );
create policy "youth write" on youth for all to authenticated
  using (public.is_regional() or (public.is_city_editor() and cidade_id = public.current_user_cidade_id()))
  with check (public.is_regional() or (public.is_city_editor() and cidade_id = public.current_user_cidade_id()));

-- ================================
-- EVENTOS: exceção — Líder Simplifique/Conselheiro veem tudo, mas só
-- criam/editam/excluem eventos da própria cidade
-- ================================
drop policy if exists "allow authenticated all" on events;
drop policy if exists "allow anon all" on events;

create policy "events select" on events for select to authenticated
  using (
    public.is_regional()
    or public.is_city_editor()
    or public.current_user_role() = 'convidado_regional'
    or (public.current_user_role() = 'convidado_local' and cidade_id = public.current_user_cidade_id())
  );
create policy "events insert" on events for insert to authenticated
  with check (public.is_regional() or (public.is_city_editor() and cidade_id = public.current_user_cidade_id()));
create policy "events update" on events for update to authenticated
  using (public.is_regional() or (public.is_city_editor() and cidade_id = public.current_user_cidade_id()))
  with check (public.is_regional() or (public.is_city_editor() and cidade_id = public.current_user_cidade_id()));
create policy "events delete" on events for delete to authenticated
  using (public.is_regional() or (public.is_city_editor() and cidade_id = public.current_user_cidade_id()));

-- ================================
-- IMPORTAÇÃO E CONFIGURAÇÕES: só o Administrador (só ele acessa Administração)
-- ================================
drop policy if exists "allow authenticated all" on import_history;
drop policy if exists "allow anon all" on import_history;
create policy "import_history admin only" on import_history for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "allow authenticated all" on settings;
drop policy if exists "allow anon all" on settings;
create policy "settings admin only" on settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
```

> Depois de rodar esse script, use o módulo **Usuários** (só o Administrador vê) para cadastrar as demais pessoas com o perfil e a cidade corretos — sem uma linha em `user_profiles`, um login autenticado não enxerga nenhum dado (as políticas acima não encontram papel algum para ele).

### Módulo "Backup & Exportação"

Página própria (`pages/backup.html`), visível para Administrador, Líder Simplifique Regional, Conselheiro Regional, Líder Simplifique e Conselheiro (os dois perfis "Convidado" não têm acesso). Sempre lê direto do Supabase, independentemente da chave seletora de fonte de dados. Tem dois botões, ambos sobre os mesmos dados:

- **"Backup total"**: gera um `.json` (`portal-expansao-backup-total-YYYY-MM-DD.json`) — mesma lógica do botão "Baixar backup do Supabase" em Administração (`BackupService.exportBackupTotal()`), reaproveitando o código. Serve para restaurar os dados depois (via "Restaurar backup" em Administração).
- **"Exportar tudo (Excel)"**: gera um `.xlsx` (`portal-expansao-backup-total-YYYY-MM-DD.xlsx`, `BackupService.exportBackupTotalExcel()`) com uma aba por tabela — **Cidades**, **Congregações**, **Jovens** e **Eventos** — pensado para abrir/conferir no Excel, não para restaurar diretamente (não existe hoje uma função de "restaurar a partir do Excel").

O que muda entre os dois é só o **formato**; o **alcance** dos dados é sempre o mesmo, decidido pelo papel de quem está logado, e essa regra fica explícita na tela, escrita logo abaixo dos botões:

- **Líder Simplifique Regional / Conselheiro Regional**: alcance de todas as cidades (mesmo alcance do backup feito pelo Administrador).
- **Líder Simplifique / Conselheiro**: alcance **apenas da própria cidade**. Cidades, congregações e jovens já vêm filtrados pelo próprio banco (as políticas de RLS acima só devolvem os registros da cidade da pessoa para esses papéis). A exceção é a tabela de eventos — como as políticas de RLS deliberadamente deixam esses dois papéis **lerem** eventos de todas as cidades (para saberem o que acontece na região), o app filtra os eventos por cidade no próprio código antes de gerar qualquer um dos dois arquivos, garantindo que o alcance fique realmente restrito à cidade da pessoa nos dois formatos.

O `.json` do "Backup total" também tem um campo `scope` (`"full"` ou `"city"`) indicando o alcance daquele backup específico.

## Banco de dados local (IndexedDB)

Todos os dados ficam salvos **no navegador do usuário**, no banco IndexedDB `portal_expansao_db`, com as stores `cities`, `congregations`, `youth`, `events`, `import_history` e `settings`. Cada registro possui `id` (gerado com `crypto.randomUUID()`), `createdAt` e `updatedAt`.

Implicações importantes:

- Os dados **persistem** entre recarregamentos da página, mas ficam presos àquele navegador/dispositivo específico.
- **Dispositivos diferentes não compartilham dados** — abrir o Portal Expansão em outro computador, celular ou até em outro navegador do mesmo computador mostra um banco vazio (ou com seus próprios dados locais).
- Limpar o cache/dados do site no navegador apaga o banco. Por isso, use a função de **backup** regularmente.

## Filtros globais

O dashboard, a página de Jovens e a página de Relatórios compartilham a mesma lógica de filtros (`js/services/filter-service.js`): cidade, congregação (as opções se restringem automaticamente à cidade selecionada), status, faixa etária, batismo nas águas, batismo no Espírito Santo, prega, canta, instrumento e período de cadastro. Os filtros são combináveis e refletidos em **chips removíveis**. A opção padrão é sempre "Todas as cidades".

## Dashboard

11 cards de indicadores, 13 gráficos (com paleta de cores estável por cidade/categoria durante a sessão, tooltips com valor absoluto e percentual, e alternância Pizza/Barras para as nove cidades e faixas etárias) e 7 listas: aniversariantes do mês, próximos eventos, jovens cadastrados recentemente, ranking de cidades e congregações, jovens por instrumento e alertas de cadastros incompletos. Clicar em uma cidade no gráfico aplica o filtro daquela cidade em toda a página; o botão "Restaurar visualização" limpa os filtros.

**Demografia**: quatro cards com total geral de membros, total de membros ativos, total sem igreja cadastrada (todos com quebra por Masculino/Feminino) e aniversariantes (hoje / mês atual).

**Gráficos adicionais**: distribuição percentual por sexo, aniversariantes por dia do mês (linha, dias 1 a 31) e uma tabela de faixa etária cruzada com sexo (Total/Masculino/Feminino por faixa).

**Indicadores anuais**: um seletor de Ano filtra três gráficos de barras — cadastros realizados no ano por mês, admissões no ano por mês (baseado na data de entrada) e batizados no ano por mês (baseado na data de batismo nas águas) — todos respeitando os filtros globais já aplicados.

**Comparativo de crescimento**: gráfico de linha com uma linha por cidade, mostrando o total acumulado de jovens cadastrados ano a ano (baseado na data de cadastro) — útil para comparar a velocidade de crescimento entre cidades ao longo do tempo. Dois seletores, **De** e **Até**, definem o intervalo de anos exibido — abrem por padrão em **2021 até o ano atual**, mas sempre listam também qualquer outro ano com dados reais (ex.: de uma importação com registros mais antigos), e a pessoa pode escolher outro intervalo livremente; se "De" ficar maior que "Até" — ou vice-versa — o outro seletor se ajusta automaticamente para manter o intervalo válido.

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

- **Exportar backup completo** (`portal-expansao-backup-YYYY-MM-DD.json`): inclui cidades, congregações, jovens, eventos, configurações e histórico de importações — sempre da **fonte de dados ativa no momento** (IndexedDB ou Supabase, conforme a chave seletora em Administração → Fonte de dados).
- **Baixar backup do Supabase** (`portal-expansao-backup-supabase-YYYY-MM-DD.json`): igual ao anterior, mas sempre lê diretamente do Supabase, **mesmo que a fonte ativa no navegador agora seja o IndexedDB** — útil para ter uma cópia do banco na nuvem sem precisar trocar a chave seletora. Também inclui a tabela `user_profiles` (perfis de acesso). Exige o Supabase configurado (URL + chave anon); se não estiver, mostra um erro claro em vez de baixar um arquivo vazio.
- **Restaurar backup**: mostra data do backup e quantidade de cada entidade antes de substituir os dados atuais (com confirmação explícita). Restaura sempre na fonte ativa no momento (não tem uma versão "restaurar no Supabase" separada).
- **Exportar jovens filtrados** em CSV ou Excel, tanto na página de Jovens quanto em Relatórios. As fotos não são incluídas nesses arquivos (ficariam ilegíveis como texto); elas fazem parte apenas do backup JSON, que preserva o cadastro por completo.

**Backup automático (agendado)**: não é possível fazer isso só pelo app — é um site estático, sem nada rodando sozinho quando ninguém está com a página aberta. Para isso, use os backups automáticos do próprio Supabase (**Project Settings → Backups** no painel — a retenção e o self-service de restauração dependem do plano contratado).

## Zona de perigo

Disponível em Administração, com exclusões granulares (somente jovens, somente eventos, histórico de importações, dados de uma cidade específica, dados de demonstração) e uma exclusão total. A exclusão total exige: leitura do aviso, recomendação de backup, digitação exata de `APAGAR TODOS OS DADOS`, marcação do checkbox de confirmação — o botão de confirmação permanece desabilitado até que ambas as condições sejam satisfeitas. Após excluir, a estrutura do IndexedDB é mantida (apenas os dados são limpos), e a aplicação retorna ao dashboard.

## Limitações do MVP

- Não há sincronização entre dispositivos ou usuários — os dados são exclusivos do navegador local.
- Controle de permissões por papel (RBAC) só existe com o Supabase ativo — veja [Perfis e permissões (RBAC)](#perfis-e-permissões-rbac); no modo IndexedDB, quem entra tem acesso total.
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

Este é o passo que mais causa dúvida: o Supabase pode criar as tabelas com **RLS ativado por padrão**, e sem uma política explícita, toda escrita feita pela chave `anon` é **bloqueada** com um erro parecido com:

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

**Opção C — Liberar só para quem fez login de verdade (recomendado depois que a autenticação estiver configurada — veja [Autenticação](#autenticação)):**

```sql
-- Remove as políticas da Opção B, se já tiverem sido criadas
drop policy if exists "allow anon all" on cities;
drop policy if exists "allow anon all" on congregations;
drop policy if exists "allow anon all" on youth;
drop policy if exists "allow anon all" on events;
drop policy if exists "allow anon all" on import_history;
drop policy if exists "allow anon all" on settings;

-- Cria políticas que exigem uma sessão autenticada do Supabase Auth
create policy "allow authenticated all" on cities for all to authenticated using (true) with check (true);
create policy "allow authenticated all" on congregations for all to authenticated using (true) with check (true);
create policy "allow authenticated all" on youth for all to authenticated using (true) with check (true);
create policy "allow authenticated all" on events for all to authenticated using (true) with check (true);
create policy "allow authenticated all" on import_history for all to authenticated using (true) with check (true);
create policy "allow authenticated all" on settings for all to authenticated using (true) with check (true);
```

> Só rode a Opção C **depois** de configurar a autenticação (próxima seção) — se rodar antes, o app para de conseguir ler/escrever qualquer dado, já que nenhuma sessão autenticada existe ainda.

> **Atenção para quando for usar com dados reais**: enquanto a Opção A ou B estiver ativa, a chave `anon` (que qualquer visitante do site tem, só de abrir a página) já é suficiente para ler e escrever todos os dados direto no Supabase — sem precisar nem fazer login no app. Isso é aceitável em modo de teste, mas antes de cadastrar dados reais de jovens (CPF, RG, telefone), use a Opção C, que exige um login de verdade.

### 4. Apontar o sistema para o Supabase

O app é um site estático (client-side puro, sem servidor próprio) — por isso, ao conectar, a opção correta na tela **"Connect to your project"** do Supabase é **Framework** ("Use a client library"), não "Server", "Direct" ou "ORM" (essas são para quem tem um backend próprio fazendo de intermediário, o que não é o caso aqui).

Na prática, você não precisa mexer em nada nessa tela do Supabase — o app já usa a biblioteca `@supabase/supabase-js` internamente. Basta pegar dois valores em **Project Settings → API** no painel do Supabase:

- **Project URL** (algo como `https://xxxxxxxxxxxx.supabase.co`)
- **anon public key** (uma chave longa começando geralmente com `eyJ...`)

Existem dois lugares onde preencher esses valores — **use os dois juntos** (não é "ou um ou outro"):

1. **`js/config/supabase-config.js`** — edite as duas linhas `SUPABASE_URL` e `SUPABASE_ANON_KEY` diretamente nesse arquivo e faça commit. **Este é o passo obrigatório** para reaproveitar este código apontando para outro projeto Supabase: como o login (próxima seção) depende do Supabase estar configurado, e a tela onde dava para digitar as credenciais pelo formulário fica atrás do próprio login, um navegador/dispositivo novo só consegue entrar se esses valores já estiverem gravados aqui no código.
2. **Administração → Fonte de dados** (formulário na tela, abaixo da chave seletora IndexedDB/Supabase) — permite trocar as credenciais depois, sem precisar editar código; ficam salvas só neste navegador (`localStorage`), com prioridade sobre o que estiver no arquivo. Útil para testar outras credenciais temporariamente, mas não substitui o passo 1 para quem for acessar de outros dispositivos.

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

A autenticação usa Supabase Auth de verdade (`js/services/auth-service.js`) — veja [Autenticação](#autenticação).

## Aviso sobre dados sensíveis

Este projeto começou como um MVP local e demonstrativo, e já conta com login real (Supabase Auth). Ainda assim, **não cadastre dados pessoais sensíveis reais** (nomes completos, telefones, endereços, **RG e CPF** de jovens e famílias reais) enquanto: (a) o modo IndexedDB estiver em uso — os dados ficam só no navegador de quem cadastrou, sem sincronizar entre dispositivos; ou (b) as políticas de RLS do Supabase ainda estiverem na Opção A/B (liberadas para `anon`) — veja [Integração com Supabase](#integração-com-supabase-modo-desenvolvimento). O cadastro de Jovens inclui campos de documento (RG, CPF) para espelhar a ficha física de membresia — trate-os com o mesmo cuidado que trataria os documentos físicos. Para uso com dados reais: use o Supabase como fonte de dados, com as políticas de RLS na Opção C (exigindo login) e, idealmente, criptografia adequada para os campos de documento.
