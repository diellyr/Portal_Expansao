# Portal Expansão

**Gestão Regional**

Versão atual: consulte [`version.md`](version.md) (também exibida na interface, logo abaixo do logotipo na barra lateral e na tela de login).

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
- [Futura migração para Supabase](#futura-migração-para-supabase)
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
- **Importação de planilhas** (CSV, XLS, XLSX) com mapeamento manual de colunas, detecção de cabeçalhos alternativos, normalização de datas/booleanos/textos, detecção de duplicados, criação assistida de cidades/congregações novas e prévia detalhada antes de confirmar.
- **Histórico de importações**, **backup/restauração em JSON**, **exportação de jovens em CSV/Excel**, **dados de demonstração** (carregar/remover) e **zona de perigo** com exclusões protegidas por confirmação.
- **Responsivo** (celular, tablet, notebook, desktop) e com cuidados de **acessibilidade** (HTML semântico, navegação por teclado, `aria-label`, `aria-live`, tabelas equivalentes aos gráficos para leitores de tela).
- **Tema claro/escuro** com chave seletora na barra superior (persistido em `localStorage`).
- **Alertas** (sino na barra superior) com aniversariantes do dia, próximos eventos e cadastros incompletos, calculados a partir dos dados reais.
- **Idioma** da interface (Português, Espanhol, Inglês) selecionável na barra superior — a tradução cobre a navegação, a barra superior e a tela de login; o conteúdo específico de cada página permanece em português nesta versão.

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
│   ├── config/constants.js    # Constantes globais (status, faixas etárias, nav...)
│   ├── database/
│   │   ├── db.js              # Wrapper do IndexedDB (abrir, CRUD genérico)
│   │   ├── migrations.js      # Criação das object stores
│   │   └── seed.js            # Gerador de dados de demonstração
│   ├── repositories/          # Único acesso ao IndexedDB
│   ├── services/              # Regras de negócio, filtros, relatórios, import, backup
│   ├── parsers/                # csv-parser.js e excel-parser.js
│   ├── components/            # Sidebar, topbar, cards, modal, toast, tabela, etc.
│   ├── pages/                 # Um controlador JS por página (+ login.js)
│   └── utils/                 # Validadores, formatadores, datas, DOM, arquivos
├── assets/
│   ├── images/
│   └── icons/
└── README.md
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
8. Após confirmar, o dashboard, relatórios e histórico de importações são atualizados automaticamente.

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

## Futura migração para Supabase

A camada de repositories foi desenhada para ser o único ponto de substituição:

```
YouthService
  ↓
IndexedDBYouthRepository   (hoje)
  ↓
SupabaseYouthRepository    (futuro)
```

Para migrar, basta criar `Supabase*Repository` equivalentes (mesmas assinaturas de método: `list`, `getById`, `save`, `remove`, etc.) em `js/repositories/`, e trocar a importação usada pelos services correspondentes. Nenhuma página, componente, gráfico ou formulário precisa ser alterado, pois todos dependem apenas dos services — nunca do banco diretamente. A autenticação demonstrativa (`js/services/auth-service.js`) também será substituída por Supabase Auth nesse momento.

## Aviso sobre dados sensíveis

Este projeto é um MVP local e demonstrativo. **Não cadastre dados pessoais sensíveis reais** (nomes completos, telefones, endereços, **RG e CPF** de jovens e famílias reais) em uma instância publicada publicamente no GitHub Pages, já que qualquer visitante consegue inspecionar o código-fonte e as credenciais de demonstração. O cadastro de Jovens inclui campos de documento (RG, CPF) para espelhar a ficha física de membresia — trate-os com o mesmo cuidado que trataria os documentos físicos. Lembre-se que os dados inseridos por um usuário ficam salvos **somente no navegador dele** (não há vazamento entre usuários), mas o risco está em usar a demonstração pública com dados verídicos. Para uso em produção com dados reais, aguarde a migração para Supabase com autenticação, regras de acesso e, idealmente, criptografia adequadas para os campos de documento.
