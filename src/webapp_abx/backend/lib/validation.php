<?php
declare(strict_types=1);

/**
 * Extrai uma string obrigatória do input. Aplica trim e valida os limites
 * de comprimento (em caracteres, não em bytes).
 */
function validation_extract_string(array $data, string $key, int $min = 1, int $max = 255): string {
    if (!isset($data[$key])) {
        api_helper_error(400, "Campo '$key' em falta.");
    }

    if (!is_string($data[$key])) {
        api_helper_error(400, "Campo '$key' tem de ser texto.");
    }

    $value = trim($data[$key]);
    // mb_strlen conta caracteres Unicode; strlen contaria bytes
    $length = mb_strlen($value);

    if ($length < $min) {
        api_helper_error(400, "Campo '$key' tem de ter pelo menos $min caracteres.");
    }

    if ($length > $max) {
        api_helper_error(400, "Campo '$key' excede o máximo de $max caracteres.");
    }

    return $value;
}

/**
 * Extrai um inteiro obrigatório, com limites opcionais.
 * Aceita int nativo ou string composta apenas de dígitos.
 */
function validation_extract_int(array $data, string $key, ?int $min = null, ?int $max = null): int {
    if (!isset($data[$key])) {
        api_helper_error(400, "Campo '$key' em falta.");
    }

    // O JSON pode trazer "42" ou 42 consoante o cliente — aceitamos ambos
    if (!is_int($data[$key]) && !(is_string($data[$key]) && ctype_digit($data[$key]))) {
        api_helper_error(400, "Campo '$key' tem de ser um inteiro.");
    }

    $value = (int) $data[$key];

    if ($min !== null && $value < $min) {
        api_helper_error(400, "Campo '$key' tem de ser >= $min.");
    }

    if ($max !== null && $value > $max) {
        api_helper_error(400, "Campo '$key' tem de ser <= $max.");
    }

    return $value;
}

/**
 * Extrai uma string que tem de pertencer a um conjunto fechado de valores.
 * A flag `true` no in_array força comparação estrita — sem ela,
 * `in_array(0, ["A", "B"])` devolveria true.
 */
function validation_extract_enum(array $data, string $key, array $allowed): string {
    $value = validation_extract_string($data, $key);

    if (!in_array($value, $allowed, true)) {
        $list = implode(", ", $allowed);
        api_helper_error(400, "Campo '$key' tem de ser um de: $list.");
    }

    return $value;
}

/**
 * Extrai um número decimal obrigatório, com limites opcionais.
 * Aceita int ou float nativo, ou string numérica.
 */
function validation_extract_float(array $data, string $key, ?float $min = null, ?float $max = null): float {
    if (!isset($data[$key])) {
        api_helper_error(400, "Campo '$key' em falta.");
    }

    if (!is_numeric($data[$key])) {
        api_helper_error(400, "Campo '$key' tem de ser numérico.");
    }

    $value = (float) $data[$key];

    if ($min !== null && $value < $min) {
        api_helper_error(400, "Campo '$key' tem de ser >= $min.");
    }

    if ($max !== null && $value > $max) {
        api_helper_error(400, "Campo '$key' tem de ser <= $max.");
    }

    return $value;
}
