<?php
declare(strict_types=1);
require __DIR__ . "/lib/bootstrap.php";

// Este endpoint só aceita POST
api_helper_require_method("POST");

// Lê e valida o corpo do pedido
$data = api_helper_read_json();
$participant = validation_extract_string($data, "participant", min: 3, max: 50);
$trial = validation_extract_int($data, "trial", min: 1, max: 12);
$response = validation_extract_enum($data, "response", ["A", "B"]);
$correct = validation_extract_enum($data, "correct", ["A", "B"]);

// Por agora só devolve eco — quando a BD estiver pronta, fazemos o INSERT aqui
api_helper_ok([
    "status" => "received",
    "participant" => $participant,
    "trial" => $trial,
    "response" => $response,
    "correct_guess" => $response === $correct,
    "timestamp" => time(),
]);
