<?php
declare(strict_types=1);
require __DIR__ . "/../lib/bootstrap.php";

$method = $_SERVER["REQUEST_METHOD"];

switch ($method) {
    case "GET":
        sessions_handle_get();
        break;

    case "POST":
        sessions_handle_post();
        break;

    default:
        header("Allow: GET, POST");
        api_helper_error(405, "Método não permitido neste recurso.");
}


// =============================================================================
// GET
// =============================================================================

function sessions_handle_get(): void {
    $id = $_GET["id"] ?? null;

    if ($id !== null) {
        if (!ctype_digit($id)) {
            api_helper_error(400, "O id tem de ser um inteiro.");
        }
        sessions_get_one((int) $id);
    } else {
        sessions_get_all();
    }
}

/**
 * Lista todas as sessões, da mais recente para a mais antiga.
 */
function sessions_get_all(): void {
    $rows = db_query(
        "SELECT id, started_at, finished_at, total_trials, hits,
                p_value, d_prime, listener_experience, used_headphones,
                submitted_at
         FROM sessions
         ORDER BY started_at DESC"
    );

    $sessions = array_map("sessions_normalize_row", $rows);

    api_helper_ok([
        "count" => count($sessions),
        "sessions" => $sessions,
    ]);
}

/**
 * Devolve uma sessão específica com os seus trials. 404 se não existir.
 */
function sessions_get_one(int $id): void {
    $session = db_query_one(
        "SELECT id, started_at, finished_at, total_trials, hits,
                p_value, d_prime, listener_experience, used_headphones,
                submitted_at
         FROM sessions
         WHERE id = ?",
        [$id]
    );

    if ($session === null) {
        api_helper_error(404, "Sessão não encontrada.");
    }

    $trials = db_query(
        "SELECT trial_index, x_is, answer, correct, answered_at
         FROM session_trials
         WHERE session_id = ?
         ORDER BY trial_index",
        [$id]
    );

    $session = sessions_normalize_row($session);
    $session["trials"] = array_map("sessions_normalize_trial", $trials);

    api_helper_ok(["session" => $session]);
}


// =============================================================================
// POST
// =============================================================================

/**
 * Cria uma sessão nova a partir do payload JSON.
 */
function sessions_handle_post(): void {
    $data = api_helper_read_json();

    // Token de sessão: prova que o teste foi iniciado pela aplicação.
    if (!session_token_valid($data["token"] ?? null)) {
        api_helper_error(403, "Sessão inválida ou expirada. Reinicie o teste.");
    }

    // Rate-limiting por IP, antes de qualquer processamento pesado.
    $client_ip = $_SERVER["REMOTE_ADDR"] ?? null;
    sessions_enforce_rate_limit($client_ip);

    // Campos da sessão
    $total_trials        = validation_extract_int($data, "total_trials", min: 1, max: 50);
    $hits                = validation_extract_int($data, "hits", min: 0, max: $total_trials);
    $listener_experience = validation_extract_int($data, "listener_experience", min: 1, max: 5);
    $used_headphones     = validation_extract_bool($data, "used_headphones");
    $started_at          = sessions_extract_datetime($data, "started_at");
    $finished_at         = sessions_extract_datetime($data, "finished_at");
    $p_value             = sessions_extract_nullable_float($data, "p_value");
    $d_prime             = sessions_extract_nullable_float($data, "d_prime");

    // Trials
    if (!isset($data["trials"]) || !is_array($data["trials"])) {
        api_helper_error(400, "Campo 'trials' em falta ou inválido.");
    }

    $trials = $data["trials"];

    if (count($trials) !== $total_trials) {
        api_helper_error(400, sprintf(
            "Número de trials (%d) não corresponde a total_trials (%d).",
            count($trials),
            $total_trials
        ));
    }

    $validated_trials = [];
    $counted_hits = 0;

    foreach ($trials as $i => $trial) {
        if (!is_array($trial)) {
            api_helper_error(400, "Trial #$i tem de ser um objecto.");
        }

        $trial_index = validation_extract_int($trial, "trial_index", min: 0, max: $total_trials - 1);
        $x_is        = validation_extract_enum($trial, "x_is", ["A", "B"]);
        $answer      = validation_extract_enum($trial, "answer", ["A", "B"]);
        $answered_at = sessions_extract_datetime($trial, "answered_at");

        $correct = ($answer === $x_is);
        if ($correct) {
            $counted_hits++;
        }

        $validated_trials[] = [
            "trial_index" => $trial_index,
            "x_is"        => $x_is,
            "answer"      => $answer,
            "correct"     => $correct,
            "answered_at" => $answered_at,
        ];
    }

    // Verificação cruzada dos hits
    if ($counted_hits !== $hits) {
        api_helper_error(400, sprintf(
            "Inconsistência: hits reportados (%d) não correspondem aos trials (%d).",
            $hits,
            $counted_hits
        ));
    }

    // trial_index únicos
    $indices = array_column($validated_trials, "trial_index");
    if (count(array_unique($indices)) !== count($indices)) {
        api_helper_error(400, "Há trial_index repetidos.");
    }

    // Grava tudo numa transação ($client_ip já foi obtido acima)
    $new_id = db_transaction(function () use (
        $started_at, $finished_at, $total_trials, $hits,
        $p_value, $d_prime, $listener_experience, $used_headphones,
        $client_ip, $validated_trials
    ): int {
        db_execute(
            "INSERT INTO sessions
                (started_at, finished_at, total_trials, hits,
                 p_value, d_prime, listener_experience, used_headphones,
                 client_ip, submitted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            [$started_at, $finished_at, $total_trials, $hits,
             $p_value, $d_prime, $listener_experience, $used_headphones ? 1 : 0,
             $client_ip]
        );

        // lastInsertId reflecte o último INSERT
        $id = (int) db_connection()->lastInsertId();

        foreach ($validated_trials as $t) {
            db_execute(
                "INSERT INTO session_trials
                    (session_id, trial_index, x_is, answer, correct, answered_at)
                 VALUES (?, ?, ?, ?, ?, ?)",
                [$id, $t["trial_index"], $t["x_is"], $t["answer"],
                 $t["correct"] ? 1 : 0, $t["answered_at"]]
            );
        }

        return $id;
    });

    http_response_code(201);
    api_helper_ok([
        "status" => "created",
        "id" => $new_id,
        "hits" => $hits,
        "total_trials" => $total_trials,
    ]);
}


// =============================================================================
// Helpers internos
// =============================================================================

function sessions_normalize_row(array $row): array {
    $row["id"] = (int) $row["id"];
    $row["total_trials"] = (int) $row["total_trials"];
    $row["hits"] = (int) $row["hits"];
    $row["p_value"] = $row["p_value"] !== null ? (float) $row["p_value"] : null;
    $row["d_prime"] = $row["d_prime"] !== null ? (float) $row["d_prime"] : null;
    if (array_key_exists("listener_experience", $row)) {
        $row["listener_experience"] = (int) $row["listener_experience"];
    }
    if (array_key_exists("used_headphones", $row)) {
        $row["used_headphones"] = (bool) $row["used_headphones"];
    }
    return $row;
}

/**
 * Aplica rate-limiting por IP: rejeita (429) se o nº de submissões recentes
 * do mesmo IP exceder o limite configurado. Sem IP (ex.: CLI), não limita.
 */
function sessions_enforce_rate_limit(?string $client_ip): void {
    if ($client_ip === null || $client_ip === "") {
        return;
    }

    [$max, $window] = app_rate_limit();
    $threshold = date("Y-m-d H:i:s", time() - $window);

    $row = db_query_one(
        "SELECT COUNT(*) AS c
         FROM sessions
         WHERE client_ip = ? AND submitted_at > ?",
        [$client_ip, $threshold]
    );

    if ($row !== null && (int) $row["c"] >= $max) {
        api_helper_error(
            429,
            "Demasiadas submissões deste dispositivo. Tente novamente mais tarde."
        );
    }
}

function sessions_normalize_trial(array $row): array {
    $row["trial_index"] = (int) $row["trial_index"];
    $row["correct"] = (bool) $row["correct"];
    return $row;
}

/**
 * Extrai um timestamp ISO 8601 e converte para o formato DATETIME do MySQL.
 */
function sessions_extract_datetime(array $data, string $key): string {
    if (!isset($data[$key]) || !is_string($data[$key])) {
        api_helper_error(400, "Campo '$key' em falta ou inválido.");
    }

    $timestamp = strtotime($data[$key]);
    if ($timestamp === false) {
        api_helper_error(400, "Campo '$key' não é uma data válida.");
    }

    return date("Y-m-d H:i:s", $timestamp);
}

/**
 * Extrai um float opcional. Devolve null se ausente ou null no JSON.
 */
function sessions_extract_nullable_float(array $data, string $key): ?float {
    if (!isset($data[$key]) || $data[$key] === null) {
        return null;
    }
    if (!is_numeric($data[$key])) {
        api_helper_error(400, "Campo '$key' tem de ser numérico.");
    }
    return (float) $data[$key];
}
