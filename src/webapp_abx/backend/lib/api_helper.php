<?php
declare(strict_types=1);

/**
 * Envia JSON com HTTP 200 e termina a execução.
 */
function api_helper_ok(array $data): never {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Envia JSON de erro com o estado HTTP indicado e termina a execução.
 * A mensagem é visível ao utilizador, por isso vai em português.
 */
function api_helper_error(int $status, string $message, array $extra = []): never {
    http_response_code($status);
    echo json_encode(
        array_merge(["error" => $message], $extra),
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

/**
 * Garante que o método HTTP do pedido é o esperado.
 * Caso contrário devolve 405 e termina.
 */
function api_helper_require_method(string $method): void {
    if ($_SERVER["REQUEST_METHOD"] !== $method) {
        header("Allow: $method");
        api_helper_error(405, "Método não permitido. Usa $method.");
    }
}

/**
 * Lê o corpo do pedido como JSON e devolve-o como array associativo.
 * Falha com 400 se o JSON for inválido ou estiver vazio.
 */
function api_helper_read_json(): array {
    $raw = file_get_contents("php://input");

    if ($raw === "" || $raw === false) {
        api_helper_error(400, "Corpo do pedido vazio.");
    }

    $data = json_decode($raw, true);

    // json_decode devolve null tanto para JSON inválido como para o literal "null".
    // Para distinguir, consultamos o último erro do parser.
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        api_helper_error(400, "JSON inválido: " . json_last_error_msg());
    }

    if (!is_array($data)) {
        api_helper_error(400, "Esperado objecto JSON.");
    }

    return $data;
}
