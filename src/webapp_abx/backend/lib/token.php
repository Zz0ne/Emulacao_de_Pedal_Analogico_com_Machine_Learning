<?php
declare(strict_types=1);

/**
 * token.php — tokens de sessão (anti-abuso).
 *
 * Token stateless assinado com HMAC-SHA256: a aplicação pede um token ao
 * iniciar o teste e devolve-o na submissão. Sem um token válido e dentro da
 * validade, a submissão é recusada — o que dificulta POSTs diretos contra a
 * API sem ter passado pela aplicação. Não há armazenamento server-side: a
 * validade é verificável só pela assinatura e pelo timestamp embebido.
 */

/**
 * TTL do token em segundos. Tem de cobrir folgadamente a duração de um teste.
 */
function session_token_ttl(): int {
    return (int) db_env("TOKEN_TTL", "7200"); // 2 horas
}

/**
 * Emite um token assinado. Formato: "<issued_at>.<assinatura>".
 */
function session_token_issue(): string {
    $issuedAt = (string) time();
    $sig = hash_hmac("sha256", $issuedAt, app_secret());
    return $issuedAt . "." . $sig;
}

/**
 * Valida um token: estrutura, assinatura (hash_equals, à prova de timing) e
 * validade temporal (rejeita expirados e do futuro, com folga de skew).
 */
function session_token_valid(?string $token): bool {
    if (!is_string($token) || $token === "") {
        return false;
    }

    $parts = explode(".", $token, 2);
    if (count($parts) !== 2) {
        return false;
    }

    [$issuedAt, $sig] = $parts;
    if (!ctype_digit($issuedAt)) {
        return false;
    }

    $expected = hash_hmac("sha256", $issuedAt, app_secret());
    if (!hash_equals($expected, $sig)) {
        return false;
    }

    $age = time() - (int) $issuedAt;
    return $age >= -60 && $age <= session_token_ttl();
}
