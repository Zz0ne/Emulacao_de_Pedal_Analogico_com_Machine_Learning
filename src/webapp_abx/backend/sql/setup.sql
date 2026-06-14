-- =============================================================================
-- setup.sql — esquema do WebApp ABX (projeto final)
--
-- Mudou face ao protótipo dos e-fólios:
--   * os estímulos deixaram de ser parametrizados em BD (tabela trial_templates)
--     e passaram a um manifesto estático (stimuli.json + WAVs); a tabela foi
--     removida;
--   * regista-se a experiência do ouvinte e o uso de auscultadores;
--   * a BD começa vazia (sem sessões de exemplo).
--
-- Este ficheiro define apenas o ESQUEMA — não contém credenciais. A base de
-- dados, o utilizador da aplicação e as permissões são criados pelo entrypoint
-- do MariaDB a partir das variáveis de ambiente (MARIADB_DATABASE /
-- MARIADB_USER / MARIADB_PASSWORD). Ver docker-compose.yml e lib/db.php.
-- =============================================================================

-- RESET opcional (DESTRUTIVO) — descomentar só para um wipe manual completo.
-- Em Docker NÃO descomentar: apagaria a base recém-criada pelo entrypoint.
-- Para recomeçar do zero em Docker, remove antes o volume `db_data`.
-- DROP DATABASE IF EXISTS abx_test;


CREATE DATABASE IF NOT EXISTS abx_test
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE abx_test;


-- TABELA: sessions
-- Uma linha por cada sessão ABX submetida. O id é gerado automaticamente
-- (AUTO_INCREMENT). hits/p_value/d_prime são calculados no frontend (stats.js)
-- e validados no servidor contra os trials submetidos. listener_experience e
-- used_headphones caracterizam o ouvinte, relevante para a validade do teste.

CREATE TABLE IF NOT EXISTS sessions (
    id                  INT           NOT NULL AUTO_INCREMENT,
    started_at          DATETIME      NOT NULL,
    finished_at         DATETIME      NOT NULL,
    total_trials        TINYINT       NOT NULL,
    hits                TINYINT       NOT NULL,
    p_value             DECIMAL(8,6)  NULL,
    d_prime             DECIMAL(6,3)  NULL,
    listener_experience TINYINT       NOT NULL,
    used_headphones     BOOLEAN       NOT NULL,
    client_ip           VARCHAR(45)   NULL,
    submitted_at        DATETIME      NOT NULL  DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT chk_hits_range
        CHECK (hits >= 0 AND hits <= total_trials),
    CONSTRAINT chk_total_trials
        CHECK (total_trials > 0 AND total_trials <= 50),
    CONSTRAINT chk_finished_after_started
        CHECK (finished_at >= started_at),
    CONSTRAINT chk_listener_experience
        CHECK (listener_experience BETWEEN 1 AND 5),

    -- Acelera a consulta do rate-limiting (submissões recentes por IP).
    INDEX idx_sessions_ip_time (client_ip, submitted_at)
) ENGINE=InnoDB;


-- TABELA: session_trials
-- Os trials executados em cada sessão. Liga-se a sessions pelo id.
-- trial_index identifica o par no manifesto estático (stimuli.json); já não
-- há FK para uma tabela de templates — a validação do índice faz-se na
-- aplicação. O par (session_id, trial_index) é único: cada par aparece uma vez.

CREATE TABLE IF NOT EXISTS session_trials (
    session_id    INT           NOT NULL,
    trial_index   TINYINT       NOT NULL,
    x_is          CHAR(1)       NOT NULL,
    answer        CHAR(1)       NOT NULL,
    correct       BOOLEAN       NOT NULL,
    answered_at   DATETIME      NOT NULL,

    PRIMARY KEY (session_id, trial_index),

    CONSTRAINT fk_session_trials_session
        FOREIGN KEY (session_id)
        REFERENCES sessions(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_trial_index_range
        CHECK (trial_index BETWEEN 0 AND 49),
    CONSTRAINT chk_x_is_valid
        CHECK (x_is IN ('A', 'B')),
    CONSTRAINT chk_answer_valid
        CHECK (answer IN ('A', 'B'))
) ENGINE=InnoDB;


-- =============================================================================
-- A base de dados começa vazia: sem estímulos em BD (são manifesto estático)
-- e sem sessões de exemplo. As sessões reais entram via POST /api/sessions.php.
-- =============================================================================
