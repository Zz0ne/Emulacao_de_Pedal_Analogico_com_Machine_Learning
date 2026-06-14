# Plano de migração — WebApp ABX para o projeto final

Migração do protótipo (e-fólios A+B) para o teste ABX real do projeto final.
Sai a síntese de áudio e tudo o que existia só para satisfazer enunciados;
entra reprodução de ficheiros WAV reais, identificação de ouvinte, e deploy
em Docker/Coolify.

**Pressupostos desta lista** (confirmar antes de executar):
- Escala de experiência do ouvinte: inteiro 1–5.
- Os pares A/B são um conjunto **fixo**, definido por manifesto estático
  (`stimuli.json` + pasta de WAVs), não geridos por base de dados.
- Número de trials: 20.
- Balanceamento A/B: a confirmar (ver tarefa 3.2).

---

## 1. Remoção de componentes obsoletos

### 1.1 Back-office (existia só para a alínea c do e-fólio B)
- [ ] Apagar `backoffice.html`
- [ ] Apagar `js/backoffice-page.js`
- [ ] Remover as regras CSS `.bo-*` (grelha, células, formulário, status) do
      `components.css`
- [ ] Remover qualquer link para o back-office na navegação ou no `about.html`

### 1.2 Página "sobre" / relatório de e-fólio
- [ ] Decidir: eliminar `about.html` por completo, OU reduzir a um "sobre"
      mínimo e público (sem a moldura de relatório de e-fólio nem a secção
      "Server-side info")
- [ ] Se eliminada, remover o link "sobre" da navegação de todas as páginas

### 1.3 Síntese de áudio
- [ ] Apagar `js/audio-synth.js`
- [ ] Remover a referência `<script src="js/audio-synth.js">` de todas as
      páginas que a carregavam (`test.html`, e qualquer outra)

### 1.4 Endpoint de templates (substituído por manifesto estático)
- [ ] Apagar `backend/api/templates.php`
- [ ] Confirmar que mais nada chama `GET/PUT /api/templates.php`

---

## 2. Estímulos — de síntese para ficheiros WAV

### 2.1 Ficheiros de áudio
- [ ] Criar pasta `audio/` (ou `assets/audio/`) para os WAVs
- [ ] Colocar os 20 pares (40 ficheiros: A = pedal real, B = emulação ML)
      com nomes consistentes, ex: `trial_00_a.wav`, `trial_00_b.wav`, …
- [ ] Normalizar níveis e duração dos clips (5–10 s); decidir sample rate e
      bit depth alvo
- [ ] Verificar o peso total — clips longos/muitos ficheiros podem ser pesados;
      considerar compressão sem perdas ou trim

### 2.2 Manifesto dos estímulos
- [ ] Criar `stimuli.json` (servido estaticamente) com os 20 pares:
      por entrada — `trial_index`, `label`, `url_a`, `url_b`
- [ ] Documentar o formato do manifesto num comentário ou README

### 2.3 Reprodução no cliente
- [ ] Reescrever a parte de áudio do `abx-engine.js`: em vez de
      `AudioSynth.generateBuffer`, carregar os WAVs do manifesto
- [ ] Decidir mecanismo: **Web Audio API** (`fetch` + `decodeAudioData`,
      reaproveitando um `play()` com handle `.stop()`) — recomendado para
      latência zero — ou elemento `<audio>` (mais simples, com gap no play)
- [ ] Implementar **pré-carregamento** dos buffers do trial atual (e idealmente
      do seguinte) para a reprodução A/B/X ser instantânea
- [ ] Tratar erros de carregamento (ficheiro em falta, rede) com mensagem ao
      utilizador, sem partir o teste
- [ ] Confirmar que A, B e X continuam a mapear corretamente (X = A ou B
      conforme `xIs`)

---

## 3. Metodologia do teste

### 3.1 Número de trials
- [ ] Mudar de 12 para 20 (`N_TRIALS` no `abx-engine.js`)
- [ ] Confirmar que o manifesto tem 20 pares
- [ ] Atualizar qualquer texto/instruções que mencione "12 trials"

### 3.2 Balanceamento A/B  *(decisão a confirmar)*
- [ ] Decidir: forçar 10 A + 10 B (balanceado) OU manter aleatório 50/50 por
      trial. **Nota:** balancear permite teoricamente "jogar por eliminação"
      nos últimos trials; com 20 é improvável mas é ponto metodológico
- [ ] Se balanceado: gerar a sequência de `xIs` com exatamente 10/10 e depois
      baralhar (Fisher–Yates), em vez de sortear cada trial independentemente
- [ ] Decidir se a **ordem dos pares** é fixa ou aleatorizada por participante
      (aleatorizar reduz efeitos de ordem/fadiga — recomendado)

### 3.3 Revisão estatística
- [ ] Confirmar que `stats.js` (binomial, d-prime) continua correto para n=20
- [ ] Rever os limiares de interpretação (o texto em `results-page.js` assume
      certos valores) à luz de n=20

---

## 4. Base de dados

### 4.1 Identificação do ouvinte
- [ ] Adicionar coluna `listener_experience` (TINYINT 1–5) à tabela `sessions`
- [ ] Adicionar o `CHECK (listener_experience BETWEEN 1 AND 5)`
- [ ] Decidir se há mais metadados úteis (ex: usou auscultadores? sim/não —
      relevante para validade de um teste de áudio)

### 4.2 Limpeza do esquema
- [ ] Eliminar a tabela `trial_templates` (estímulos passam a manifesto estático)
- [ ] Ajustar `session_trials`: remover a FK para `trial_templates`;
      `trial_index` passa a referenciar o manifesto (validação na aplicação,
      não FK)
- [ ] Rever `session_trials` — manter `x_is`, `answer`, `correct`, `answered_at`;
      confirmar se `trial_index` 0–19 agora
- [ ] Rever campos de `sessions`: `total_trials` passa a 20; decidir sobre
      `client_ip` (manter para deteção de duplicados? ver tarefa 6)
- [ ] Atualizar os `CHECK` constraints (ex: `total_trials`, ranges)

### 4.3 Dados de exemplo
- [ ] Remover as 3 sessões de exemplo do `setup.sql` (BD começa vazia no real)
- [ ] Remover os `INSERT` de `trial_templates` (tabela deixa de existir)
- [ ] Renomear a BD se fizer sentido (já não é `efolioB_...`); ajustar
      credenciais — o `lei`/`lssweb#26` era exigência do enunciado, rever para
      o projeto final

### 4.4 Migração do nome/credenciais no `db.php`
- [ ] Atualizar `DB_NAME`, `DB_USER`, `DB_PASS` em `lib/db.php` (ver tarefa 5
      sobre tirar credenciais do código)

---

## 5. Backend — adaptações

### 5.1 Endpoint de submissão
- [ ] Atualizar `POST /api/sessions.php` para aceitar e validar
      `listener_experience`
- [ ] Atualizar a validação: `total_trials` = 20, `trial_index` 0–19
- [ ] Confirmar que a verificação cruzada de `hits` continua a funcionar
- [ ] Manter a escrita transacional (sessão + trials)

### 5.2 Endpoint de leitura
- [ ] Decidir o que `GET /api/sessions.php` expõe no teste real (resultados
      agregados públicos? só contagem? acesso restrito?)
- [ ] Se os resultados forem públicos, confirmar que não expõem dados sensíveis

### 5.3 Credenciais e configuração
- [ ] Tirar credenciais hardcoded do `db.php`; passar a variáveis de ambiente
      (essencial para Docker/Coolify — ver tarefa 7)
- [ ] Configurar `APP_ENV` via ambiente (já suportado no `bootstrap.php`),
      garantir `prod` em produção (esconde stack traces)

---

## 6. Proteção contra submissões abusivas

- [ ] Implementar rate-limiting básico por IP (ex: máximo N submissões por
      janela de tempo)
- [ ] Considerar um token de sessão emitido no início e validado na submissão
      (impede POSTs diretos sem ter feito o teste)
- [ ] Decidir política de duplicados (mesmo IP, várias submissões — permitir,
      limitar, ou marcar)
- [ ] Validar/sanitizar tamanho do payload (rejeitar bodies absurdamente
      grandes antes de processar)
- [ ] Documentar as limitações que ficarem por resolver (para o relatório)

---

## 7. Deploy — Docker + Coolify

### 7.1 Containerização
- [ ] `Dockerfile` para o serviço PHP (PHP 8 + extensão `pdo_mysql` + servidor;
      decidir entre PHP-FPM+Nginx ou Apache+mod_php)
- [ ] Servir os ficheiros estáticos (HTML, CSS, JS, WAVs, `stimuli.json`) —
      pelo mesmo container ou por um Nginx à frente
- [ ] `docker-compose` (ou config Coolify) com dois serviços: app PHP +
      MariaDB
- [ ] Volume persistente para os dados do MariaDB (não perder sessões em
      redeploys)
- [ ] Correr o `setup.sql` na inicialização da BD (init script do container
      MariaDB)

### 7.2 Configuração de ambiente
- [ ] Variáveis de ambiente para credenciais da BD e `APP_ENV=prod`
- [ ] Garantir que os WAVs são servidos com os headers corretos
      (`Content-Type: audio/wav`, cache)
- [ ] HTTPS (Coolify trata via reverse proxy; confirmar)

### 7.3 CORS
- [ ] Se frontend e backend ficarem na mesma origem (recomendado), não há
      problema de CORS
- [ ] Se ficarem em domínios/portas diferentes, adicionar headers CORS no
      `bootstrap.php` (apenas a origem do frontend, não `*`)

### 7.4 Caminhos
- [ ] Confirmar que todos os `fetch` no frontend usam caminhos relativos
      (já era assim no e-fólio; reconfirmar depois de mexer na estrutura)

---

## 8. Frontend — limpeza final

- [ ] Atualizar a navegação (remover links de páginas eliminadas)
- [ ] Rever `results-page.js` — continua a ler do servidor via
      `abx:lastSubmittedId`; confirmar que bate certo com o esquema novo
- [ ] Rever `storage.js` e a lógica de retomar sessão — continua válida com
      WAVs (a sessão guardada referencia `trial_index`, não buffers)
- [ ] Adicionar ao fluxo do teste o ecrã/campo de **experiência do ouvinte**
      (1–5) antes de começar, e incluí-lo no payload de submissão
- [ ] Revisão de textos (instruções, etc.) para o público real, não para um
      avaliador

---

## 9. Validação end-to-end

- [ ] Testar o ciclo completo no ambiente Docker local antes do deploy:
      iniciar → 20 trials com WAVs reais → submeter → ver resultados da BD
- [ ] Testar em mais do que um browser
- [ ] Testar com rede lenta (pré-carregamento dos WAVs aguenta?)
- [ ] Confirmar que o rate-limiting não bloqueia uso legítimo
- [ ] Testar a partir de um dispositivo externo (não localhost) após deploy

---

## Notas para o relatório do projeto final

Itens que dão texto e que vale a pena documentar à medida que executas:
- A transição de síntese paramétrica para estímulos reais gravados
- A decisão de manifesto estático vs base de dados para os estímulos
- A metodologia ABX: nº de trials, balanceamento, aleatorização de ordem
- O registo de experiência do ouvinte e o que permite analisar
- A arquitetura de deploy (Docker, Coolify, persistência)
- As limitações de segurança conhecidas e como foram (ou não) mitigadas

---

## Estado da implementação (executado)

Decisões tomadas nesta iteração:
- **Estímulos:** criada só a estrutura — manifesto `stimuli.json` + pasta
  `assets/audio/` (vazia) + convenção de nomes documentada
  (`assets/audio/README.md`). Os 40 WAVs reais são colocados depois, sem mexer
  em código.
- **about.html:** eliminada por completo; link "sobre" removido da navegação de
  todas as páginas.
- **Metodologia:** X balanceado (metade A / metade B, Fisher–Yates) e ordem dos
  pares aleatorizada por participante.
- **Nº de trials:** passou a **dinâmico** — é o nº de pares no `stimuli.json`
  (tecto `MAX_TRIALS=50`). Acrescentar pares ao manifesto cresce o teste; não há
  contagem fixa para manter sincronizada.
- **Metadados do ouvinte:** `listener_experience` (1–5) **e** `used_headphones`.
- **Estímulos reais:** colocados em `assets/audio/` (20 pares `dry`/`wet`);
  manifesto regenerado a partir dos ficheiros (`dry` = emulação/plugin,
  `wet` = pedal real).
- **Deploy Docker/Coolify (tarefa 7):** implementado — Apache+mod_php num
  container + MariaDB, para correr local e depois no Coolify.

Feito:
- Removidos back-office, síntese (`audio-synth.js`), `synth-test.html` e o
  endpoint `templates.php`; CSS morto (`.bo-*`, `schema-table`, `report-meta`).
- Novo `js/audio-player.js` (Web Audio: `fetch`+`decodeAudioData`, cache,
  pré-carregamento do trial seguinte, tratamento de erro com retry na UI).
- `abx-engine.js` reescrito (manifesto, token, balanceamento, ordem aleatória).
- Esquema: `trial_templates` removida; `sessions` ganha `listener_experience`
  e `used_headphones`; `session_trials` sem FK para templates; sem dados de
  exemplo; BD renomeada para `abx_test` / utilizador `abx_app`.
- Credenciais e configuração movidas para variáveis de ambiente
  (`lib/db.php`, `lib/bootstrap.php`); ver `.env.example`.
- Anti-abuso: token de sessão HMAC stateless (`lib/token.php` +
  `api/session_token.php`), rate-limiting por IP, cap de tamanho de payload.
- Frontend: ecrã de experiência + auscultadores antes de iniciar; áudio WAV
  assíncrono; textos revistos (instruções, índice).
- Docker: `Dockerfile` (PHP 8.3 Apache + pdo_mysql), `docker-compose.yml`
  (app + MariaDB 11, volume persistente, `setup.sql` no init), config Apache
  com bloqueios de segurança (`docker/abx.conf`); ver `DEPLOY.md`.

Pendente / limitações conhecidas (para o relatório):
- **Validação E2E:** falta correr o ciclo completo na stack Docker
  (`docker compose up`) e confirmar o teste de ponta a ponta.
- **Token de sessão:** é uma barreira *soft* — qualquer cliente pode pedir um
  token em `GET /api/session_token.php`. Combinado com rate-limiting eleva a
  fasquia, mas não impede um atacante determinado; um CAPTCHA ou autenticação
  seriam o passo seguinte.
- **Validação E2E (tarefa 9):** falta o ciclo completo em ambiente real (a
  máquina de desenvolvimento atual não tem PHP/MariaDB instalados); validado
  por revisão estática + lint de JSON/JS.
