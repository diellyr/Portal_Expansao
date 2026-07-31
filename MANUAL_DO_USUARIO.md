# Manual do Usuário — Portal Expansão

Este manual explica, em linguagem simples, como usar o Portal Expansão no dia a dia. Ele é
separado da documentação técnica (veja [`README.md`](README.md)), que é voltada a quem instala
e configura o sistema — aqui o foco é **o que cada tela faz e como usá-la**.

> Uma versão em PDF deste manual está disponível para download e impressão.

---

## Sumário

1. [Introdução](#1-introdução)
2. [Acessando o sistema](#2-acessando-o-sistema)
3. [Navegando pelo sistema](#3-navegando-pelo-sistema)
4. [Perfis de acesso](#4-perfis-de-acesso)
5. [Dashboard](#5-dashboard)
6. [Cidades](#6-cidades)
7. [Congregações](#7-congregações)
8. [Jovens](#8-jovens)
9. [Eventos](#9-eventos)
10. [Relatórios](#10-relatórios)
11. [Central de Qualidade dos Cadastros](#11-central-de-qualidade-dos-cadastros)
12. [Gerador de Listas para Eventos](#12-gerador-de-listas-para-eventos)
13. [Comparador de Cidades](#13-comparador-de-cidades)
14. [Painel de Cobertura Regional](#14-painel-de-cobertura-regional)
15. [Modo Apresentação](#15-modo-apresentação)
16. [Favoritos e Preferências](#16-favoritos-e-preferências)
17. [Backup & Exportação](#17-backup--exportação)
18. [Usuários (administrador)](#18-usuários-administrador)
19. [Administração (administrador)](#19-administração-administrador)
20. [Perguntas frequentes](#20-perguntas-frequentes)

---

## 1. Introdução

O Portal Expansão organiza o cadastro da juventude das cidades da região: dados pessoais,
situação espiritual (batismo nas águas e no Espírito Santo), talentos (prega, canta, toca
instrumento), vínculo com cidade e congregação, e a agenda de eventos. A partir desses
cadastros, o sistema gera indicadores, relatórios, alertas e ferramentas de apoio à gestão
regional — sem que ninguém precise montar planilhas manualmente.

## 2. Acessando o sistema

### Login

Abra o endereço do sistema no navegador, informe **e-mail** e **senha** e clique em **Entrar**.
Após o login você é levado ao Dashboard.

### Trocar a própria senha

Clique no seu nome/avatar no canto superior direito e escolha **Alterar senha**. Informe a
senha atual e a nova senha duas vezes.

### Esqueci minha senha

Na tela de login, use a opção de recuperação de senha informando seu e-mail cadastrado; você
receberá um link para definir uma nova senha.

## 3. Navegando pelo sistema

- **Barra lateral (menu à esquerda)**: acesso a todas as páginas que o seu perfil pode ver. Pode
  ser recolhida clicando no ícone de seta, útil em telas menores.
- **Pesquisa global** (campo com lupa no topo, disponível em qualquer página): digite o nome de
  um jovem, cidade, congregação, conselheiro, pastor ou instrumento — os resultados aparecem em
  uma lista logo abaixo, e clicar em um deles abre a ficha completa do jovem. A busca ignora
  acentos e maiúsculas/minúsculas.
- **Sino de alertas**: mostra avisos organizados por categoria — **Atenção necessária**
  (cadastros incompletos, sem batismo, sem conselheiro), **Aniversários** (hoje, na semana, no
  mês), **Oportunidade ministerial** (jovens com talentos identificados) e **Informativo**
  (próximos eventos, cidades com poucos jovens cadastrados).
- **Tema claro/escuro**: alternador ao lado do sino, para preferência visual.
- **Idioma**: seletor no canto superior direito (Português, Español, English) — traduz o menu e
  a barra superior.
- **Sair**: botão no canto superior direito encerra a sessão.

## 4. Perfis de acesso

O que você vê e pode editar depende do seu perfil, definido pelo administrador:

| Perfil | Alcance |
|---|---|
| Administrador | Acesso total, incluindo Usuários e Administração |
| Líder Simplifique Regional | Todas as cidades, leitura e edição |
| Conselheiro Regional | Todas as cidades, leitura e edição |
| Líder Simplifique | Apenas a própria cidade, leitura e edição |
| Conselheiro | Apenas a própria cidade, leitura e edição |
| Convidado Regional | Todas as cidades, somente leitura |
| Convidado Local | Apenas a própria cidade, somente leitura |

Todas as telas e ferramentas deste manual respeitam automaticamente esse alcance — um usuário
restrito a uma cidade nunca vê dados de outra, em nenhuma tela (dashboard, relatórios, busca,
alertas, comparador, etc.).

## 5. Dashboard

Visão geral com cards de indicadores (total de jovens, ativos, visitantes, batismos etc.),
gráficos (distribuição por sexo, aniversariantes, indicadores por mês/ano, comparativo de
crescimento) e uma seção de listas/alertas. Use os **filtros no topo da página** (cidade,
congregação, status, faixa etária, batismo, talentos, período) para restringir a visão — os
filtros aplicados aparecem como "chips" removíveis logo abaixo.

O botão **Modo Apresentação**, no canto superior da página, projeta o Dashboard em tela cheia
para reuniões — veja a seção 15.

## 6. Cidades

Cadastro das cidades da região: nome, estado, líder, conselheiro, pastor responsável e
telefones. A tabela mostra quantas congregações e jovens cada cidade tem.

- **Nova cidade**: botão no topo da página.
- **Editar/excluir**: ícones de lápis e lixeira na linha da cidade.
- **Favoritar**: clique na estrela ao lado do nome para marcar cidades de interesse — veja a
  seção 16 (Favoritos e Preferências). Marque **"Somente favoritas"** para filtrar a lista.

## 7. Congregações

Cadastro das congregações vinculadas a cada cidade: bairro, endereço, pastor, conselheiro local
e telefone. Funciona da mesma forma que Cidades (criar, editar, excluir, ver indicadores).

## 8. Jovens

O cadastro central do sistema.

### Cadastro completo

O botão **Novo jovem** abre um formulário com todos os campos: dados pessoais, contato,
endereço, documentos, família, situação espiritual (batismo nas águas e no Espírito Santo),
talentos (instrumento, prega, canta, outros talentos), liderança e observações. Uma foto (JPEG,
até 5 MB) pode ser anexada.

### Filtros e busca

O campo de busca no topo filtra por nome. Os **filtros combináveis** (cidade, congregação,
status, faixa etária, batismo, talentos, período de cadastro) ficam logo abaixo e podem ser
usados em conjunto.

### Segmentação automática

Os **chips de segmento** (Adolescentes, Jovens adultos, Músicos, Pregadores, Cantores, Não
batizados, Aniversariantes do mês, Sem conselheiro, Cadastro incompleto) aplicam um filtro
pronto com um clique — cada chip mostra quantos jovens se encaixam ali, considerando os filtros
já aplicados. Clique novamente no chip ativo para desativá-lo.

### Ficha do jovem

Clicar no nome (ou na foto) de um jovem abre a **ficha completa**, com quatro ações:

- **Imprimir / PDF**: abre a tela de impressão do navegador — escolha "Salvar como PDF" para
  gerar um arquivo.
- **Cartão resumido**: versão enxuta para levar a uma reunião de liderança.
- **Copiar p/ WhatsApp**: copia um resumo de texto (nome, cidade, congregação, conselheiros,
  pastor e talentos — nunca documentos ou endereço) pronto para colar em uma conversa.
- **Fechar**.

### Itens por página

No rodapé da tabela, um seletor define quantos jovens aparecem por página (12/24/50/100) — essa
escolha é lembrada neste navegador (veja a seção 16).

### Exportar

Os botões **Exportar CSV** e **Exportar Excel**, no topo da página, exportam exatamente os
jovens que estão sendo exibidos no momento (respeitando filtros e segmento ativos).

## 9. Eventos

Agenda de cultos, vigílias, congressos, ensaios, evangelismos e outros eventos, com data,
horário, local, cidade/congregação e indicação de evento regional. Funciona como as demais
telas de cadastro (criar, editar, excluir).

## 10. Relatórios

Dez relatórios prontos, acessíveis pelas abas no topo da página: por cidade, por congregação,
por status, faixa etária, batismo nas águas, batismo no Espírito Santo, talentos,
aniversariantes (escolha o mês), dados incompletos e comparativo de cidades. Cada relatório
pode ser exportado em **CSV**, **Excel** ou **impresso**, e respeita os mesmos filtros globais
do Dashboard.

## 11. Central de Qualidade dos Cadastros

Uma auditoria automática dos cadastros já existentes, para ajudar a manter os dados em dia.
**Nada aqui é alterado automaticamente** — cada indicador é um alerta para revisão manual.

Os cards no topo (clicáveis) levam à lista detalhada de cada tipo de problema:

- **Completude média dos cadastros**: percentual médio de preenchimento de 8 campos-chave.
- **Cadastros incompletos**: jovens com algum desses campos vazio, com a lista exata do que
  falta.
- **Possíveis duplicados (nome/telefone)**: grupos de cadastros que parecem ser a mesma pessoa
  — é apenas uma sugestão, confira manualmente antes de qualquer ação.
- **Datas incoerentes**: batismo registrado antes do nascimento, ou datas no futuro.
- **Cidades/congregações com grafia semelhante**: podem estar cadastradas duas vezes com nomes
  ligeiramente diferentes.

Cada linha da tabela tem duas ações: **Ver ficha** (abre a ficha completa) e **Abrir cadastro**
(leva direto ao formulário de edição em Jovens, para corrigir manualmente).

## 12. Gerador de Listas para Eventos

Monta uma lista sob medida para um evento (retiro, congresso, encontro de músicos etc.),
reaproveitando os mesmos filtros e segmentos de Jovens.

1. Dê um nome à lista no campo no topo (usado nas exportações).
2. Ajuste os filtros e/ou clique em um chip de segmento.
3. Use os botões de ação: **Exportar Excel**, **Imprimir / PDF**, **Copiar nomes** (lista simples
   de nomes, um por linha) ou **Copiar p/ WhatsApp** (texto formatado com nome, cidade e
   telefone de cada jovem).

## 13. Comparador de Cidades

Compare duas ou mais cidades lado a lado. Clique nos chips com o nome de cada cidade para
selecioná-las (mínimo de duas) e o sistema mostra:

- uma tabela-resumo (total, ativos, congregações, batismos, talentos, % com conselheiro,
  completude média);
- gráficos de barras comparando total, completude e % com conselheiro por cidade;
- uma tabela de distribuição por faixa etária;
- uma tabela com as congregações de cada cidade selecionada.

## 14. Painel de Cobertura Regional

Visão de todas as cidades da região ao mesmo tempo, pensada para apoiar o acompanhamento
regional — **nunca para comparar desempenho** entre líderes ou cidades. Por isso a linguagem é
sempre neutra ("maior/menor quantidade registrada", "região que pode precisar de apoio",
"oportunidade de acompanhamento"), nunca "melhor/pior cidade".

Um aviso fixo no topo lembra que os números refletem **apenas o que está cadastrado no
sistema**, não a quantidade real de jovens em cada cidade. Além do resumo regional, a página
mostra destaques (maior/menor quantidade registrada, cidade com maior completude, região que
pode precisar de apoio, cidades com poucos jovens cadastrados), um gráfico, e tabelas por
cidade, por faixa etária e por congregação.

## 15. Modo Apresentação

No Dashboard, o botão **Modo Apresentação** oculta o menu e a barra superior, aumenta os
gráficos e indicadores, e tenta abrir em tela cheia — útil para projetar em uma reunião. Só
mostra dados agregados (nunca telefone, data de nascimento completa ou nomes dos pais). Para
sair, use o botão **"Sair da apresentação"** (sempre visível no canto superior direito) ou a
tecla **Esc**.

## 16. Favoritos e Preferências

Atalhos e preferências pessoais, salvos **somente neste navegador** (não na sua conta — não
acompanham você para outro computador ou celular):

- **Cidades favoritas**: marcadas com a estrela em Cidades.
- **Jovens vistos recentemente**: os últimos jovens cuja ficha você abriu, com um botão para
  reabri-la rapidamente. Só guarda nome, nunca telefone/data/endereço.
- **Itens por página em Jovens**: sua preferência de paginação.
- **Limpar preferências locais**: apaga tudo isso de uma vez neste navegador (não afeta nenhum
  dado do sistema).

## 17. Backup & Exportação

Disponível para Administrador, Líder/Conselheiro Regional, Líder Simplifique e Conselheiro.
Gera um backup completo (JSON) ou uma planilha Excel com todas as tabelas — sempre respeitando
o alcance do seu perfil (um usuário restrito a uma cidade só exporta os dados dessa cidade).

## 18. Usuários (administrador)

Somente o Administrador vê este módulo. Permite criar novos usuários, definir o perfil de
acesso de cada um e, quando aplicável, a cidade à qual ficam restritos.

## 19. Administração (administrador)

Somente o Administrador vê este módulo: importação de planilhas (CSV/Excel) com mapeamento de
colunas, histórico de importações, dados de demonstração e a **Zona de Perigo** (exclusões em
massa, protegidas por confirmação).

## 20. Perguntas frequentes

**Um jovem não aparece na Pesquisa Global. Por quê?**
Confira se ele está na cidade/congregação a que seu perfil tem acesso — a busca só retorna o
que seu perfil pode ver.

**A Central de Qualidade apontou um "possível duplicado" — o sistema já mescla ou apaga
automaticamente?**
Não. É apenas um alerta para você conferir; nenhuma mescla ou exclusão é feita sozinha.

**Minhas preferências (favoritos, itens vistos) sumiram.**
Elas ficam salvas no navegador. Trocar de computador, usar outro navegador, ou limpar os dados
de navegação removem essas preferências (mas não afetam nenhum cadastro).

**Por que o Painel de Cobertura Regional não indica uma "melhor cidade"?**
É intencional: o painel existe para apoiar o acompanhamento, não para comparar ou avaliar
desempenho entre cidades ou líderes.

**Como volto de uma exportação para conferir se um jovem está lá?**
Todas as exportações (CSV, Excel, listas, backups) refletem exatamente os filtros aplicados no
momento do clique — confira os filtros/segmentos ativos na tela antes de exportar.
