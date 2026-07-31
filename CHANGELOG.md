# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue as convenções de [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e o versionamento segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

A versão atual também é exibida na interface (abaixo do logotipo, na barra
lateral e na tela de login) e fica sincronizada com `APP_VERSION` em
`js/config/constants.js` e com `version.md`.

## [1.11.0] — 2026-07-31

### Adicionado
Dez novos módulos de análise e produtividade, todos calculados no front-end sobre
dados já lidos pelos serviços existentes — **nenhuma tabela, coluna, view, function,
trigger, policy de RLS, bucket, edge function, índice ou migração foi criada ou
alterada no Supabase**.

- **Central de Qualidade dos Cadastros** (`pages/qualidade.html`): cadastros
  incompletos, possíveis duplicados por nome/telefone (comparação sem acento/
  maiúsculas/apóstrofo), datas incoerentes (batismo antes do nascimento, datas no
  futuro) e cidades/congregações com grafia semelhante. Cada item linka para
  `jovens.html?edit=<id>` (novo deep-link) para correção manual — nada é alterado
  automaticamente.
- **Pesquisa Global Inteligente**: campo de busca na barra superior (`topbar.js`),
  disponível em toda a aplicação, indexando nome/cidade/congregação/conselheiro/
  pastor/instrumento/telefone dos jovens já carregados.
- **Alertas Automáticos** ampliados e agora categorizados (Atenção necessária /
  Aniversários / Oportunidade ministerial / Informativo): aniversariantes da
  semana e do mês, sem batismo, sem conselheiro, congregações com completude
  abaixo de 50%, jovens com talentos identificáveis, cidades com poucos jovens
  cadastrados (limite ≤ 3, sempre citado no texto do alerta).
- **Relatório Individual do Jovem**: a ficha do jovem (extraída para
  `js/components/youth-ficha-modal.js` e reaproveitada em Jovens, Qualidade,
  Pesquisa Global, Listas e Favoritos) ganhou Imprimir/PDF (via impressão do
  navegador), Cartão resumido e Copiar para WhatsApp.
- **Segmentação Automática**: chips de filtro rápido em Jovens (Adolescentes,
  Jovens adultos, Músicos, Pregadores, Cantores, Não batizados, Aniversariantes
  do mês, Sem conselheiro, Cadastro incompleto), combináveis com os filtros e a
  busca existentes.
- **Gerador de Listas para Eventos** (`pages/listas.html`): lista sob medida
  reaproveitando filtros/segmentos/tabela de Jovens, com exportação em Excel,
  impressão/PDF, cópia de nomes e texto pronto para WhatsApp.
- **Comparador de Cidades** (`pages/comparador.html`): seleção de 2+ cidades com
  gráficos de barras e tabelas (totais, faixa etária, músicos/pregadores/
  cantores, batismos, % com conselheiro, completude média).
- **Painel de Cobertura Regional** (`pages/cobertura-regional.html`): visão de
  todas as cidades com linguagem deliberadamente neutra — nunca "melhor/pior
  cidade" ou "cidade vencedora" — e um aviso fixo de que os números refletem
  apenas o que está cadastrado no sistema.
- **Modo Apresentação** (Dashboard): oculta menu/topo, amplia gráficos e
  indicadores, solicita tela cheia quando suportado, com saída sempre visível
  (botão, Esc ou saída manual da tela cheia).
- **Favoritos e Preferências** (`pages/favoritos.html`): cidades favoritas
  (estrela em Cidades), jovens vistos recentemente (guarda apenas id+nome),
  itens por página em Jovens e opção de limpar tudo — tudo em `localStorage`,
  nunca acompanha o usuário para outro dispositivo.

### Corrigido
- `normalizeText()` (usado pela busca global e pela detecção de duplicados) não
  removia apóstrofos, então nomes como "D'Ávila" não eram encontrados buscando
  "davila". Apóstrofos retos e tipográficos agora são removidos junto com os
  acentos.

## [1.10.0] — 2026-07-31

### Adicionado
- Botão **"Exportar tudo (Excel)"** no módulo de backup, ao lado do "Backup
  total": gera um `.xlsx` com uma aba por tabela (Cidades, Congregações,
  Jovens, Eventos), seguindo o mesmo alcance por perfil do "Backup total"
  (`BackupService.exportBackupTotalExcel()`).
- Regra de alcance por perfil agora explicada por escrito na própria tela,
  logo abaixo dos botões (ex.: "Seu perfil (Líder Simplifique) tem acesso
  apenas à cidade Cidade Um...").

### Alterado
- Módulo **"Backup"** renomeado para **"Backup & Exportação"** (menu,
  título da página e título da aba do navegador).

### Corrigido
- Exportações de Jovens em CSV e Excel (Jovens, Relatórios e o novo
  "Exportar tudo") não incluíam **Nome do pai** e **Nome da mãe**, mesmo
  esses campos existindo no cadastro e sendo aceitos na importação — uma
  planilha exportada e depois reimportada perdia essa informação
  silenciosamente. Corrigido nos três lugares.

## [1.9.0] — 2026-07-31

### Adicionado
- Novo módulo **Backup** (`pages/backup.html`), com um único botão
  "Backup total", disponível para Líder Simplifique Regional, Conselheiro
  Regional, Líder Simplifique e Conselheiro (além do Administrador) — os
  perfis "Convidado" continuam sem acesso. Sempre lê do Supabase,
  independentemente da fonte de dados ativa.
- Alcance do backup por papel: Líder Simplifique Regional/Conselheiro
  Regional levam todas as cidades; Líder Simplifique/Conselheiro levam
  apenas a própria cidade (cidades/congregações/jovens já filtrados pelo
  RLS; eventos filtrados no app, já que o RLS deliberadamente deixa esses
  papéis lerem eventos de todas as cidades).
- `BackupService.exportBackupTotal(profile)` reaproveita a mesma leitura de
  tabelas do backup do Supabase já existente em Administração.
- Barra lateral e `bootstrapPage()` agora suportam itens de menu
  restritos por **lista de papéis** (`roles: [...]`), além do já existente
  `adminOnly`.

## [1.8.0] — 2026-07-31

### Adicionado
- Botão **"Baixar backup do Supabase"** em Administração → Backup e
  restauração: lê diretamente do Supabase (cidades, congregações, jovens,
  eventos, configurações, histórico de importações e perfis de usuário),
  independentemente de qual fonte de dados estiver ativa no momento no
  navegador. Exige Supabase configurado; mostra um erro claro caso
  contrário. Complementa o "Exportar backup completo" já existente, que
  segue a fonte ativa.
- README documenta a diferença entre os dois botões de backup e explica
  por que o backup **automático** (agendado) não é possível só pelo app —
  requer os backups nativos do Supabase (dependem do plano) ou uma
  automação externa.

## [1.7.3] — 2026-07-30

### Alterado
- O gráfico "Crescimento de jovens por cidade" agora abre com o intervalo
  **De 2021 até o ano atual** por padrão, em vez do menor/maior ano com
  dados reais. Os seletores **De**/**Até** sempre listam 2021 até o ano
  atual (mesmo sem dados em algum desses anos), além de qualquer outro ano
  com dados reais fora desse intervalo — a pessoa continua livre para
  escolher outro período.

## [1.7.2] — 2026-07-30

### Adicionado
- Nova faixa etária **"Menores de 12 anos"** (0 a 11 anos), adicionada como
  primeira opção em `AGE_RANGES` — cobre a lacuna deixada pela reorganização
  anterior das faixas, em que ninguém abaixo de 12 anos era contabilizado
  em nenhuma categoria.

## [1.7.1] — 2026-07-30

### Alterado
- Faixas etárias reorganizadas: as três primeiras faixas ("Até 12 anos",
  "13 a 15 anos", "16 a 18 anos") viraram duas ("12 a 14 anos" e "15 a 18
  anos"). As faixas de 19 anos para cima não mudaram. Afeta todos os
  lugares que usam `AGE_RANGES` (`js/config/constants.js`): filtro de
  faixa etária, gráfico "Distribuição por faixa etária" e tabela "Faixa
  etária por sexo" no Dashboard, e o relatório "Faixa etária" em
  Relatórios.

## [1.7.0] — 2026-07-30

### Adicionado
- Novo gráfico no Dashboard, **"Crescimento de jovens por cidade"**: linha
  de crescimento acumulado (uma linha por cidade) com dois seletores, **De**
  e **Até**, para escolher o intervalo de anos comparado — complementa o
  "Comparativo de jovens por cidade" existente, que só mostra uma foto do
  momento atual. Suporte para gráficos de múltiplas linhas adicionado em
  `chart-service.js`/`chart-card.js` (`createMultiLineChart`/
  `createMultiLineChartCard`), reaproveitando as mesmas cores estáveis por
  cidade usadas nos demais gráficos.

### Removido
- Mensagem "Login demonstrativo — sem autenticação real..." na tela de
  login, que ainda citava a antiga credencial de demonstração
  (`admin123`) mesmo depois da troca para autenticação real via Supabase
  Auth.

## [1.6.2] — 2026-07-30

### Corrigido
- O seletor de idioma, em alguns navegadores (principalmente no celular),
  continuava mostrando visualmente o idioma antigo depois de escolher um
  novo — mesmo com a troca já salva e aplicada internamente — porque o
  navegador restaura o valor anterior de campos `<select>` após um recarregamento
  de página (`location.reload()`), sobrepondo o valor que o app tentou marcar
  como selecionado. Corrigido com `autocomplete="off"` no campo.
- O título da página (ex.: "Congregações"/"Dashboard") na barra superior
  não acompanhava a troca de idioma, ficando sempre em português — agora
  usa a mesma tradução do item de menu correspondente.

## [1.6.1] — 2026-07-30

### Corrigido
- Em telas de celular (≤480px), o botão de avatar/e-mail que abre o menu
  "Alterar senha" ficava totalmente escondido por uma regra de CSS antiga
  que datava de quando esse elemento era só decorativo — agora que ele
  também é o gatilho do menu, essa regra foi removida.
- Corrigido um "estouro" de layout (grid não encolhendo) que fazia a barra
  superior ficar mais larga que a tela em aparelhos estreitos, empurrando
  ícones (tema, notificações, idioma, sair) para fora da área visível sem
  aviso de rolagem.
- O menu "Alterar senha", ao abrir, aparecia cortado/fora da tela em
  celulares porque a caixa (larga, feita para a lista de notificações) era
  ancorada pelo lado errado para a posição do avatar; agora tem largura e
  posição próprias.
- Item "Usuários" no menu lateral aparecia como o texto cru `nav.usuarios`
  por falta de tradução — adicionado nos três idiomas (PT/ES/EN).

## [1.6.0] — 2026-07-30

### Adicionado
- **Alterar senha**: novo item no menu do usuário (topbar) para qualquer
  pessoa logada trocar a própria senha, com revalidação da senha atual antes
  de aplicar a nova (`js/components/change-password-modal.js`).
- **Esqueci minha senha**: link na tela de login que envia um e-mail de
  redefinição via `auth.resetPasswordForEmail()`
  (`js/components/forgot-password-modal.js`) e uma página nova,
  `redefinir-senha.html` (`js/pages/redefinir-senha.js`), para definir a
  nova senha a partir do link recebido.
- Documentação no README sobre os dois fluxos, incluindo a exigência de
  cadastrar a URL de `redefinir-senha.html` em Authentication → URL
  Configuration → Redirect URLs no painel do Supabase.

### Corrigido
- `.form-group[hidden]` estava sendo sobrescrito visualmente pela regra
  `.form-group { display: flex }`, fazendo o campo de cidade no formulário
  de usuários não esconder de verdade para perfis regionais (mesma classe
  de bug já corrigida antes para os controles de foto).

## [1.5.0] — 2026-07-30

### Adicionado
- Controle de acesso por papel (RBAC), disponível apenas com o Supabase
  ativo: sete perfis (Administrador, Líder Simplifique Regional,
  Conselheiro Regional, Líder Simplifique, Conselheiro, Convidado Regional
  e Convidado Local), cada um com um recorte diferente de leitura/escrita
  por cidade — veja a seção "Perfis e permissões (RBAC)" no README.
- Módulo **Usuários** (`pages/usuarios.html`), um item de menu próprio
  (visível só para o Administrador) para cadastrar novos logins, definir o
  perfil e a cidade de cada um, editar esse vínculo depois ou remover o
  acesso de alguém.
- SQL da tabela `user_profiles`, funções auxiliares (`current_user_role`,
  `current_user_cidade_id`, `is_admin`, `is_regional`, `is_city_editor`) e
  políticas de RLS por papel para `cities`, `congregations`, `youth` e
  `events` (com a exceção de eventos: Líder Simplifique/Conselheiro veem
  eventos de todas as cidades, mas só criam/editam/excluem os da própria).
- Acesso às páginas **Administração** e **Usuários** agora é restrito ao
  perfil Administrador tanto no menu lateral (item some para os demais
  perfis) quanto na própria página (redirecionamento para o dashboard).

## [1.4.0] — 2026-07-30

### Adicionado
- Autenticação real via Supabase Auth, substituindo o login demonstrativo.
  A conta de administrador passa a ser criada e gerenciada diretamente no
  painel do Supabase (Authentication → Users), não mais no código-fonte.
- Documentação (README) do fluxo completo de autenticação: exigência de
  Supabase configurado para conseguir entrar, dependência de
  `js/config/supabase-config.js` para login funcionar em qualquer
  dispositivo, e a política de RLS restrita ao papel `authenticated`
  (Opção C) recomendada para uso com dados reais.

### Removido
- Credenciais de login fixas (`DEMO_CREDENTIALS`) removidas de
  `js/config/constants.js`. O sistema não guarda mais nenhuma senha no
  código-fonte.

### Alterado
- `logout()` agora também encerra a sessão no Supabase, além de limpar o
  estado local.

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
