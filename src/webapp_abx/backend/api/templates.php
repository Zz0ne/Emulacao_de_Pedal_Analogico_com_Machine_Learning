<?php
declare(strict_types=1);
require __DIR__ . "/../lib/bootstrap.php";

$method = $_SERVER["REQUEST_METHOD"];

switch ($method) {
    case "GET":
        templates_handle_get();
        break;

    case "PUT":
        templates_handle_put();
        break;

    default:
        header("Allow: GET, PUT");
        api_helper_error(405, "Método não permitido neste recurso.");
}


// =============================================================================
// GET
// =============================================================================

function templates_handle_get(): void {
    $index = $_GET["index"] ?? null;

    if ($index !== null) {
        if (!ctype_digit($index)) {
            api_helper_error(400, "O index tem de ser um inteiro.");
        }
        templates_get_one((int) $index);
    } else {
        templates_get_all();
    }
}

/**
 * Devolve os 12 templates, ordenados por trial_index.
 */
function templates_get_all(): void {
    $rows = db_query(
        "SELECT trial_index, label, waveform, frequency_hz, duration_ms, drive, updated_at
         FROM trial_templates
         ORDER BY trial_index"
    );

    $templates = array_map("templates_normalize_row", $rows);

    api_helper_ok([
        "count" => count($templates),
        "templates" => $templates,
    ]);
}

/**
 * Devolve um template específico. 404 se não existir.
 */
function templates_get_one(int $index): void {
    $row = db_query_one(
        "SELECT trial_index, label, waveform, frequency_hz, duration_ms, drive, updated_at
         FROM trial_templates
         WHERE trial_index = ?",
        [$index]
    );

    if ($row === null) {
        api_helper_error(404, "Template não encontrado.");
    }

    api_helper_ok(["template" => templates_normalize_row($row)]);
}


// =============================================================================
// PUT
// =============================================================================

/**
 * PUT /api/templates.php?index=N
 * Substitui a configuração de um template existente.
 * O trial_index não é alterável — é a identidade do slot.
 */
function templates_handle_put(): void {
    $index = $_GET["index"] ?? null;

    if ($index === null || !ctype_digit($index)) {
        api_helper_error(400, "PUT requer um index inteiro no parâmetro 'index'.");
    }

    $index = (int) $index;

    // O template tem de existir
    $exists = db_query_one(
        "SELECT trial_index FROM trial_templates WHERE trial_index = ?",
        [$index]
    );
    if ($exists === null) {
        api_helper_error(404, "Template não encontrado.");
    }

    // Validar o payload
    $data = api_helper_read_json();

    $label        = validation_extract_string($data, "label", min: 1, max: 80);
    $waveform     = validation_extract_enum($data, "waveform", ["sine", "square", "sawtooth", "triangle"]);
    $frequency_hz = validation_extract_float($data, "frequency_hz", min: 0.01, max: 9999.99);
    $duration_ms  = validation_extract_int($data, "duration_ms", min: 1, max: 10000);
    $drive        = validation_extract_float($data, "drive", min: 0.01, max: 50.0);

    // updated_at é actualizado automaticamente pela BD (ON UPDATE CURRENT_TIMESTAMP)
    db_execute(
        "UPDATE trial_templates
         SET label = ?, waveform = ?, frequency_hz = ?, duration_ms = ?, drive = ?
         WHERE trial_index = ?",
        [$label, $waveform, $frequency_hz, $duration_ms, $drive, $index]
    );

    api_helper_ok([
        "status" => "updated",
        "trial_index" => $index,
        "label" => $label,
    ]);
}


function templates_normalize_row(array $row): array {
    $row["trial_index"] = (int) $row["trial_index"];
    $row["frequency_hz"] = (float) $row["frequency_hz"];
    $row["duration_ms"] = (int) $row["duration_ms"];
    $row["drive"] = (float) $row["drive"];
    return $row;
}
