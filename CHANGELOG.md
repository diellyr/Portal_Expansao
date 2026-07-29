# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue as convenções de [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e o versionamento segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

A versão atual também é exibida na interface (abaixo do logotipo, na barra
lateral e na tela de login) e fica sincronizada com `APP_VERSION` em
`js/config/constants.js` e com `version.md`.

## [1.3.1] — 2026-07-29

### Adicionado
- Console de importação (painel estilo terminal, abaixo do botão "Confirmar
  importação" em Administração) que mostra em tempo real cada etapa da
  importação: fonte de dados ativa, criação de cidade/congregação/jovem e,
  principalmente, cada tentativa de espelhamento para o Supabase com
  sucesso ou com o erro exato retornado pelo banco.
- Logs também para os eventos de configuração do Supabase (salvar/limpar
  credenciais, trocar a fonte de dados), para diagnosticar problemas sem
  precisar abrir o console de desenvolvedor do navegador.

## [1.3.0] — 2026-07-29

### Adicionado
- Barra de progresso durante a confirmação da importação de planilhas, com
  percentual e contagem de linhas processadas — importante principalmente
  com o Supabase ativo, já que cada linha pode envolver uma chamada de
  rede e a importação deixa de ser instantânea como no IndexedDB.
- Mensagem de sucesso com o resumo (criados/atualizados/ignorados/erros)
  ao final da importação.
- Mensagem de erro clara com o motivo (ex.: falha de rede, erro retornado
  pelo Supabase) quando a importação falha, com botão "Tentar novamente"
  que volta à prévia sem precisar refazer o mapeamento de colunas.

## [1.2.1] — 2026-07-29

### Adicionado
- Formulário em **Administração → Fonte de dados** para configurar a URL
  do projeto e a chave anon/public do Supabase diretamente pela interface,
  salvas no navegador (`localStorage`).

### Alterado
- `js/config/supabase-config.js` deixou de ser obrigatório — agora é
  apenas um valor padrão opcional; o formulário na tela sempre tem
  prioridade.
- Limpar as credenciais enquanto o Supabase está ativo agora volta
  automaticamente para o IndexedDB, evitando deixar o sistema preso em um
  modo sem credenciais válidas.

### Corrigido
- Erro não tratado (unhandled rejection) no carregamento de alertas do
  sino de notificações quando o banco ativo falha.

## [1.2.0] — 2026-07-29

### Adicionado
- Integração opcional com [Supabase](https://supabase.com) (Postgres) como
  banco alternativo ao IndexedDB.
- Chave seletora em **Administração → Fonte de dados** para alternar entre
  IndexedDB e Supabase, com bloqueio caso o Supabase não esteja configurado.
- Importação de planilhas passa a gravar em **ambos os bancos**
  simultaneamente (IndexedDB e Supabase), independentemente de qual está
  ativo, para mantê-los sincronizados enquanto o Supabase está em teste.

### Corrigido
- Bug em que, se o banco ativo falhasse, a própria chave seletora de fonte
  de dados podia não ser carregada, deixando o usuário sem forma de voltar
  para o IndexedDB pela tela.

## [1.1.0] — 2026-07-29

### Adicionado
- Tema claro/escuro com chave seletora na barra superior (persistido em
  `localStorage`), aplicado via atributo `data-theme` com script inline
  para evitar o "flash" da cor errada ao carregar a página.
- Sino de alertas na barra superior com notificações reais: aniversariantes
  do dia, próximos eventos e cadastros incompletos.
- Seletor de idioma (Português — padrão, Espanhol, Inglês) na barra
  superior, cobrindo a navegação lateral, a barra superior e a tela de
  login.

### Alterado
- Texto "Gestão Regional da Juventude" no menu superior esquerdo e na tela
  de login simplificado para "Gestão Regional".

## [1.0.0] — 2026-07-29

### Adicionado
- MVP completo do Portal Expansão: dashboard com filtros globais, seção de
  demografia (sexo, sem igreja cadastrada, aniversariantes) e indicadores
  anuais (cadastros, admissões e batismos por mês, filtráveis por ano).
- Cadastro completo de cidades, congregações, jovens e eventos (criar,
  editar, visualizar, excluir), com busca, ordenação e paginação.
- Foto do jovem (JPEG, até 5MB) com prévia, miniatura clicável na lista e
  ficha digital (foto + todos os dados).
- 10 relatórios com exportação em CSV, Excel e impressão.
- Importação de planilhas (CSV, XLS, XLSX) com mapeamento manual de
  colunas, detecção de cabeçalhos alternativos, normalização de dados,
  detecção de duplicados e prévia antes de confirmar.
- Backup e restauração em JSON, exportação de jovens em CSV/Excel, dados
  de demonstração (carregar/remover) e zona de perigo com exclusões
  protegidas por confirmação.
- Aplicação responsiva (celular, tablet, notebook, desktop) e com cuidados
  de acessibilidade (HTML semântico, navegação por teclado, `aria-label`,
  `aria-live`, tabelas equivalentes aos gráficos para leitores de tela).
