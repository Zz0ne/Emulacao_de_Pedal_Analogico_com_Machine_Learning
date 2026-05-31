-- RESET (destrutivo) — descomentar para limpar tudo antes de criar
DROP DATABASE IF EXISTS efolioB_21182_2201022;
DROP USER IF EXISTS 'lei'@'localhost';


CREATE DATABASE IF NOT EXISTS efolioB_21182_2201022
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE efolioB_21182_2201022;

CREATE USER IF NOT EXISTS 'lei'@'localhost' IDENTIFIED BY 'lssweb#26';

GRANT ALL PRIVILEGES ON efolioB_21182_2201022.* TO 'lei'@'localhost';

FLUSH PRIVILEGES;


-- TABELA: trial_templates
-- Os 12 "slots" configuráveis no back-office. Cada slot define os parâmetros
-- do sinal A (a forma de onda base). O sinal B é derivado deterministicamente
-- de A no frontend (audio-synth.js), com uma variação subtil na não-linearidade.
-- Esta tabela tem SEMPRE exactamente 12 linhas (trial_index de 0 a 11).
-- O back-office permite editar, nunca criar ou apagar.

CREATE TABLE IF NOT EXISTS trial_templates (
    trial_index   TINYINT       NOT NULL,
    label         VARCHAR(80)   NOT NULL,
    waveform      VARCHAR(20)   NOT NULL,
    frequency_hz  DECIMAL(6,2)  NOT NULL,
    duration_ms   INT           NOT NULL,
    drive         DECIMAL(4,2)  NOT NULL,
    updated_at    DATETIME      NOT NULL  DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (trial_index),

    CONSTRAINT chk_trial_index_range
        CHECK (trial_index BETWEEN 0 AND 11),
    CONSTRAINT chk_waveform_allowed
        CHECK (waveform IN ('sine', 'square', 'sawtooth', 'triangle')),
    CONSTRAINT chk_frequency_positive
        CHECK (frequency_hz > 0 AND frequency_hz < 10000),
    CONSTRAINT chk_duration_positive
        CHECK (duration_ms > 0 AND duration_ms <= 10000),
    CONSTRAINT chk_drive_positive
        CHECK (drive > 0 AND drive <= 50)
) ENGINE=InnoDB;


-- TABELA: sessions
-- Uma linha por cada sessão ABX submetida. O id é gerado automaticamente
-- pela base de dados (AUTO_INCREMENT). Os campos hits/p_value/d_prime são
-- calculados pelo frontend (stats.js) e validados no servidor contra os
-- trials submetidos.

CREATE TABLE IF NOT EXISTS sessions (
    id            INT           NOT NULL AUTO_INCREMENT,
    started_at    DATETIME      NOT NULL,
    finished_at   DATETIME      NOT NULL,
    total_trials  TINYINT       NOT NULL,
    hits          TINYINT       NOT NULL,
    p_value       DECIMAL(8,6)  NULL,
    d_prime       DECIMAL(6,3)  NULL,
    client_ip     VARCHAR(45)   NULL,
    submitted_at  DATETIME      NOT NULL  DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT chk_hits_range
        CHECK (hits >= 0 AND hits <= total_trials),
    CONSTRAINT chk_total_trials
        CHECK (total_trials > 0 AND total_trials <= 50),
    CONSTRAINT chk_finished_after_started
        CHECK (finished_at >= started_at)
) ENGINE=InnoDB;


-- TABELA: session_trials
-- Os 12 trials executados em cada sessão. Liga-se a sessions pelo id e a
-- trial_templates pelo trial_index.

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

    CONSTRAINT fk_session_trials_template
        FOREIGN KEY (trial_index)
        REFERENCES trial_templates(trial_index)
        ON DELETE RESTRICT,

    CONSTRAINT chk_x_is_valid
        CHECK (x_is IN ('A', 'B')),
    CONSTRAINT chk_answer_valid
        CHECK (answer IN ('A', 'B'))
) ENGINE=InnoDB;


-- DADOS INICIAIS — TRIAL TEMPLATES
-- 12 slots pré-configurados, cobrindo as 4 cordas soltas do baixo em
-- afinação standard (EADG: 41.20, 55.00, 73.42, 98.00 Hz).

INSERT INTO trial_templates (trial_index, label, waveform, frequency_hz, duration_ms, drive) VALUES
    (0,  'Mi (E1) — sine',       'sine',     41.20, 2000, 6.0),
    (1,  'Lá (A1) — sine',       'sine',     55.00, 2000, 6.0),
    (2,  'Ré (D2) — sawtooth',   'sawtooth', 73.42, 2000, 7.0),
    (3,  'Sol (G2) — sawtooth',  'sawtooth', 98.00, 2000, 7.0),
    (4,  'Mi (E1) — square',     'square',   41.20, 2000, 5.0),
    (5,  'Lá (A1) — square',     'square',   55.00, 2000, 5.0),
    (6,  'Ré (D2) — triangle',   'triangle', 73.42, 2000, 8.0),
    (7,  'Sol (G2) — triangle',  'triangle', 98.00, 2000, 8.0),
    (8,  'Mi (E1) — sawtooth',   'sawtooth', 41.20, 2500, 4.0),
    (9,  'Lá (A1) — sawtooth',   'sawtooth', 55.00, 2500, 4.0),
    (10, 'Ré (D2) — sine',       'sine',     73.42, 2500, 9.0),
    (11, 'Sol (G2) — square',    'square',   98.00, 2500, 6.0)
ON DUPLICATE KEY UPDATE
    trial_index = trial_index;


-- -----------------------------------------------------------------------------
-- DADOS INICIAIS — SESSÕES DE EXEMPLO
--
-- Três sessões já submetidas, com ids explícitos 1, 2, 3. O AUTO_INCREMENT
-- continua a partir de 4 para as sessões criadas via API.
-- -----------------------------------------------------------------------------

INSERT INTO sessions (id, started_at, finished_at, total_trials, hits, p_value, d_prime, client_ip, submitted_at) VALUES
    (1, '2026-05-20 14:30:00', '2026-05-20 14:38:42', 12,  9, 0.073000, 1.276, '127.0.0.1', '2026-05-20 14:38:43'),
    (2, '2026-05-22 10:15:00', '2026-05-22 10:22:18', 12, 11, 0.003000, 2.354, '127.0.0.1', '2026-05-22 10:22:19'),
    (3, '2026-05-25 19:02:00', '2026-05-25 19:09:55', 12,  6, 0.612000, 0.000, '127.0.0.1', '2026-05-25 19:09:56')
ON DUPLICATE KEY UPDATE id = id;


-- -----------------------------------------------------------------------------
-- DADOS INICIAIS — TRIALS DAS SESSÕES DE EXEMPLO
-- -----------------------------------------------------------------------------

-- Sessão 1: 9 acertos em 12
INSERT INTO session_trials (session_id, trial_index, x_is, answer, correct, answered_at) VALUES
    (1,  0, 'A', 'A', TRUE,  '2026-05-20 14:30:42'),
    (1,  1, 'B', 'B', TRUE,  '2026-05-20 14:31:25'),
    (1,  2, 'A', 'B', FALSE, '2026-05-20 14:32:11'),
    (1,  3, 'B', 'B', TRUE,  '2026-05-20 14:32:55'),
    (1,  4, 'A', 'A', TRUE,  '2026-05-20 14:33:38'),
    (1,  5, 'B', 'B', TRUE,  '2026-05-20 14:34:20'),
    (1,  6, 'A', 'A', TRUE,  '2026-05-20 14:35:02'),
    (1,  7, 'B', 'A', FALSE, '2026-05-20 14:35:48'),
    (1,  8, 'A', 'A', TRUE,  '2026-05-20 14:36:30'),
    (1,  9, 'B', 'B', TRUE,  '2026-05-20 14:37:12'),
    (1, 10, 'A', 'B', FALSE, '2026-05-20 14:37:55'),
    (1, 11, 'B', 'B', TRUE,  '2026-05-20 14:38:42')
ON DUPLICATE KEY UPDATE session_id = session_id;

-- Sessão 2: 11 acertos em 12
INSERT INTO session_trials (session_id, trial_index, x_is, answer, correct, answered_at) VALUES
    (2,  0, 'B', 'B', TRUE,  '2026-05-22 10:15:38'),
    (2,  1, 'A', 'A', TRUE,  '2026-05-22 10:16:20'),
    (2,  2, 'B', 'B', TRUE,  '2026-05-22 10:17:01'),
    (2,  3, 'A', 'A', TRUE,  '2026-05-22 10:17:44'),
    (2,  4, 'B', 'B', TRUE,  '2026-05-22 10:18:28'),
    (2,  5, 'A', 'B', FALSE, '2026-05-22 10:19:09'),
    (2,  6, 'B', 'B', TRUE,  '2026-05-22 10:19:50'),
    (2,  7, 'A', 'A', TRUE,  '2026-05-22 10:20:31'),
    (2,  8, 'B', 'B', TRUE,  '2026-05-22 10:21:12'),
    (2,  9, 'A', 'A', TRUE,  '2026-05-22 10:21:33'),
    (2, 10, 'B', 'B', TRUE,  '2026-05-22 10:21:55'),
    (2, 11, 'A', 'A', TRUE,  '2026-05-22 10:22:18')
ON DUPLICATE KEY UPDATE session_id = session_id;

-- Sessão 3: 6 acertos em 12 (estatisticamente igual ao acaso)
INSERT INTO session_trials (session_id, trial_index, x_is, answer, correct, answered_at) VALUES
    (3,  0, 'A', 'B', FALSE, '2026-05-25 19:02:42'),
    (3,  1, 'B', 'A', FALSE, '2026-05-25 19:03:24'),
    (3,  2, 'A', 'A', TRUE,  '2026-05-25 19:04:08'),
    (3,  3, 'B', 'B', TRUE,  '2026-05-25 19:04:51'),
    (3,  4, 'A', 'A', TRUE,  '2026-05-25 19:05:34'),
    (3,  5, 'B', 'A', FALSE, '2026-05-25 19:06:14'),
    (3,  6, 'A', 'B', FALSE, '2026-05-25 19:06:55'),
    (3,  7, 'B', 'B', TRUE,  '2026-05-25 19:07:36'),
    (3,  8, 'A', 'A', TRUE,  '2026-05-25 19:08:17'),
    (3,  9, 'B', 'A', FALSE, '2026-05-25 19:08:48'),
    (3, 10, 'A', 'B', FALSE, '2026-05-25 19:09:20'),
    (3, 11, 'B', 'B', TRUE,  '2026-05-25 19:09:55')
ON DUPLICATE KEY UPDATE session_id = session_id;


-- =============================================================================
-- Fim do setup.sql
-- =============================================================================
