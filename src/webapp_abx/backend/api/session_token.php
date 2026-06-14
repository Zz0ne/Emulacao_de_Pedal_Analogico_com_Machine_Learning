<?php
declare(strict_types=1);
require __DIR__ . "/../lib/bootstrap.php";

// Emite um token de sessão. Chamado pela aplicação ao iniciar o teste.
api_helper_require_method("GET");

api_helper_ok([
    "token" => session_token_issue(),
    "ttl"   => session_token_ttl(),
]);
