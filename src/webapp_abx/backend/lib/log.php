<?php
declare(strict_types=1);

/**
 * Caminho absoluto do ficheiro de log da aplicação.
 */
function log_path(): string {
    return __DIR__ . "/../logs/app.log";
}

/**
 * Garante que a pasta de logs existe antes de qualquer escrita.
 */
function ensure_log_dir(): void {
    $dir = dirname(log_path());
    if (!is_dir($dir)) {
        // 0750 — dono lê/escreve/lista, grupo lê/lista, outros nada.
        // Logs podem conter dados sensíveis, não devem ser world-readable.
        mkdir($dir, 0750, true);
    }
}

/**
 * Regista uma excepção no log com timestamp e stack trace completo.
 */
function log_error(Throwable $e): void {
    $line = sprintf(
        "[%s] %s: %s in %s:%d\n%s\n\n",
        date("Y-m-d H:i:s"),
        get_class($e),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine(),
        $e->getTraceAsString()
    );

    ensure_log_dir();
    // LOCK_EX impede que dois requests em paralelo entrelacem o output
    file_put_contents(log_path(), $line, FILE_APPEND | LOCK_EX);
}

/**
 * Regista uma mensagem informativa (auditoria, debug).
 */
function log_info(string $message): void {
    $line = sprintf("[%s] INFO: %s\n", date("Y-m-d H:i:s"), $message);
    ensure_log_dir();
    file_put_contents(log_path(), $line, FILE_APPEND | LOCK_EX);
}
