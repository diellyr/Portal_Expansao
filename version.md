# Versão

**1.2.0**

Exibida na interface logo abaixo do logotipo (barra lateral e tela de login).
Mantenha este arquivo sincronizado com `APP_VERSION` em `js/config/constants.js`.

## Histórico

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
