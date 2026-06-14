# Estímulos de áudio (WAV)

Esta pasta contém os ficheiros de áudio do teste ABX, referenciados pelo
manifesto [`stimuli.json`](../../stimuli.json).

## Convenção de nomes

Cada par (um por excerto) tem dois ficheiros, distinguidos pelo prefixo:

```
dry_<excerto>.wav   →  A (url_a)
wet_<excerto>.wav   →  B (url_b)
```

`<excerto>` é o identificador do excerto (ex.: `tom_sawyer`, `kingdom_1`). Os
dois ficheiros de um par têm de existir; o manifesto liga-os por entrada.

## Formato atual

Os ficheiros presentes são **48 kHz · 24 bits PCM · mono**. Os dois lados de
cada par têm a mesma duração/nível, como deve ser para um ABX válido.

> O par A/B deve diferir **apenas** no que se quer comparar. Tudo o resto —
> fonte, corte, duração, nível — tem de ser idêntico, ou o teste deixa de medir
> o que se pretende.

## Substituir / adicionar pares

1. Coloca `dry_<excerto>.wav` e `wet_<excerto>.wav` aqui.
2. Regenera o manifesto (ou acrescenta a entrada à mão em
   [`stimuli.json`](../../stimuli.json) com `url_a`/`url_b`).

O número de trials é **dinâmico**: o teste usa tantos pares quantos os que
existirem no manifesto (até ao tecto `MAX_TRIALS` em
[`js/abx-engine.js`](../../js/abx-engine.js)). Não há contagem fixa a manter.
