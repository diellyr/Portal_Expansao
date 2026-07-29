# Versão

**1.3.1**

Exibida na interface logo abaixo do logotipo (barra lateral e tela de login).
Mantenha este arquivo sincronizado com `APP_VERSION` em `js/config/constants.js`.

## Histórico

- **1.3.1** — Console de importação (abaixo do botão "Confirmar importação")
  mostra em tempo real cada etapa da importação — criação de cidade/
  congregação/jovem, e principalmente cada tentativa de espelhamento para o
  Supabase com sucesso ou erro — para diagnosticar por que uma migração para
  o Supabase não está funcionando sem precisar abrir o console do navegador.
- **1.3.0** — Barra de progresso durante a importação de planilhas (útil
  principalmente com o Supabase ativo, mais lento que o IndexedDB por
  depender de rede), com percentual e contagem de registros processados.
  Ao final, mensagem de sucesso com o resumo; em caso de falha, mensagem
  clara com o motivo do erro e botão para tentar novamente sem perder o
  mapeamento já feito.
- **1.2.1** — Formulário em Administração → Fonte de dados para configurar a
  URL e a chave anon do Supabase direto pela tela (salvo no navegador),
  sem precisar editar `js/config/supabase-config.js`.
- **1.2.0** — Integração opcional com Supabase: chave seletora em
  Administração para alternar entre IndexedDB e Supabase, e importação de
  planilhas passando a gravar em ambos os bancos simultaneamente (modo
  desenvolvimento, enquanto o Supabase está em teste).
- **1.1.0** — Tema claro/escuro (chave seletora na barra superior), alertas
  reais no sino de notificações (aniversariantes do dia, próximos eventos,
  cadastros incompletos) e seletor de idioma (Português/Espanhol/Inglês)
  para a navegação, barra superior e tela de login.
- **1.0.0** — MVP completo: dashboard com filtros globais, demografia (sexo,
  igreja, aniversariantes) e indicadores anuais; cadastro de cidades,
  congregações, jovens (com foto e ficha digital) e eventos; relatórios;
  importação CSV/Excel com mapeamento de colunas; backup/restauração; dados
  de demonstração; zona de perigo.
