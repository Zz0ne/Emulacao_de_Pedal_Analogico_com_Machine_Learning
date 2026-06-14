<?php
declare(strict_types=1);

/**
 * Lê uma variável de ambiente, devolvendo o fallback se estiver ausente.
 * As credenciais da BD vêm do ambiente (essencial para Docker/Coolify);
 * os fallbacks servem o desenvolvimento local e coincidem com o setup.sql.
 */
function db_env(string $key, string $fallback): string {
    $value = getenv($key);
    return ($value === false || $value === '') ? $fallback : $value;
}

/**
 * Devolve a ligação PDO, criando-a na primeira chamada e reutilizando-a
 * nas seguintes (dentro do mesmo request). A variável estática mantém-se
 * entre chamadas à função.
 */
function db_connection(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $host = db_env('DB_HOST', 'localhost');
        $name = db_env('DB_NAME', 'abx_test');
        $user = db_env('DB_USER', 'abx_app');
        $pass = db_env('DB_PASS', 'abx_dev_pw');

        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=utf8mb4',
            $host,
            $name
        );

        try {
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            // Re-lança sem expor credenciais. A mensagem original (que pode
            // conter detalhes da ligação) vai para o log via encadeamento;
            // o cliente recebe apenas "erro interno" através do handler global.
            throw new RuntimeException('Falha ao ligar à base de dados.', 0, $e);
        }
    }

    return $pdo;
}

/**
 * Executa uma query de leitura e devolve todas as linhas.
 */
function db_query(string $sql, array $params = []): array {
    $stmt = db_connection()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

/**
 * Executa uma query de leitura e devolve apenas a primeira linha,
 * ou null se não houver resultados.
 */
function db_query_one(string $sql, array $params = []): ?array {
    $stmt = db_connection()->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

/**
 * Executa uma query de escrita (INSERT, UPDATE, DELETE).
 * Devolve o número de linhas afectadas.
 */
function db_execute(string $sql, array $params = []): int {
    $stmt = db_connection()->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount();
}

/**
 * Executa uma função dentro de uma transação. Se a função lançar uma
 * excepção, faz rollback; caso contrário, commit. Devolve o que a função
 * devolver.
 */
function db_transaction(callable $fn): mixed {
    $pdo = db_connection();
    $pdo->beginTransaction();

    try {
        $result = $fn();
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e; // re-lança para o handler global tratar
    }
}
