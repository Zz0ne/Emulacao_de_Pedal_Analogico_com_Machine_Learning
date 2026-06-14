<?php
declare(strict_types=1);

// Resposta sempre em JSON com UTF-8
header("Content-Type: application/json; charset=utf-8");
mb_internal_encoding("UTF-8");

/**
 * Ambiente da aplicação ('dev' | 'prod'). Vem do ambiente (Docker/Coolify),
 * com fallback para $_SERVER e, por fim, 'dev'.
 */
function app_env(): string {
    $env = getenv("APP_ENV");
    if ($env === false || $env === "") {
        $env = $_SERVER["APP_ENV"] ?? "dev";
    }
    return $env;
}

/**
 * Segredo usado para assinar os tokens de sessão (HMAC). DEVE ser definido
 * via APP_SECRET em produção; o fallback é previsível e só serve dev local.
 */
function app_secret(): string {
    $secret = getenv("APP_SECRET");
    if ($secret === false || $secret === "") {
        return "dev-insecure-secret-change-me";
    }
    return $secret;
}

/**
 * Rate-limiting de submissões: [máximo de submissões, janela em segundos]
 * por IP. Configurável por ambiente. (db_env vem de db.php, carregado abaixo.)
 */
function app_rate_limit(): array {
    $max = (int) db_env("RATE_LIMIT_MAX", "60");
    $window = (int) db_env("RATE_LIMIT_WINDOW", "3600");
    return [max(1, $max), max(1, $window)];
}

/**
 * Tamanho máximo aceite para o corpo de um pedido (bytes). Rejeita payloads
 * absurdos antes de os processar.
 */
function app_max_payload_bytes(): int {
    return (int) db_env("MAX_PAYLOAD_BYTES", "65536");
}

// Ambiente actual — controla o quanto se expõe ao cliente
$env = app_env();

if ($env === "dev") {
    // Em desenvolvimento mostramos tudo
    error_reporting(E_ALL);
    ini_set("display_errors", "1");
} else {
    // Em produção registamos mas nunca expomos
    error_reporting(E_ALL);
    ini_set("display_errors", "0");
    ini_set("log_errors", "1");
}

require __DIR__ . "/api_helper.php";
require __DIR__ . "/validation.php";
require __DIR__ . "/log.php";
require __DIR__ . "/db.php";
require __DIR__ . "/token.php";

// Handler global de excepções: apanha tudo o que escape de qualquer endpoint
set_exception_handler(function (Throwable $e) use ($env): void {
    log_error($e);

    if ($env === "dev") {
        // Em dev devolvemos detalhe completo para debugar
        http_response_code(500);
        echo json_encode([
            "error" => "Erro interno",
            "exception" => get_class($e),
            "message" => $e->getMessage(),
            "file" => $e->getFile(),
            "line" => $e->getLine(),
            "trace" => explode("\n", $e->getTraceAsString()),
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    } else {
        // Em produção nunca expor detalhes — atacantes adoram stack traces
        http_response_code(500);
        echo json_encode([
            "error" => "Erro interno do servidor.",
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
});

// Converte warnings/notices restantes em excepções para caírem no handler acima
set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
    // Respeita o operador @ de supressão
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});
