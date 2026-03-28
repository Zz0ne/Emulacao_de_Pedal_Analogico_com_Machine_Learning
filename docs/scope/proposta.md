# Proposta de Projecto

**Título:** Emulação de Pedal Analógico com Machine Learning  
**Estudante:** Nuno Rodrigues · 2201022  
**Orientador:** Pedro Pestana  
**Data:** 25 de Março de 2025  
**Versão:** 1.0

---

## Sinopse

<!-- Três parágrafos máximo. -->
<!-- §1: O problema que o projecto endereça e quem o tem. -->
<!-- §2: A solução proposta e o que a distingue do que já existe. -->
<!-- §3: O resultado esperado e como se verifica que foi atingido. -->
<!-- A sinopse deve ser legível por alguém sem formação técnica. -->

O projeto consiste no desenvolvimento de um plugin de áudio (VST3/AU) que replica o comportamento do pedal de distorção para baixo elétrico Darkglass Alpha Omicron, utilizando Inteligência Artificial em vez de Processamento Digital de Sinal (DSP) clássico. A abordagem baseia-se em black-box modeling: o equipamento físico é estimulado com sinais de áudio conhecidos e as respostas captadas são usadas para treinar uma rede neuronal que aprende a impressão digital acústica do pedal.

O modelo treinado em Python (PyTorch) é exportado e integrado num plugin C++ construído com o framework JUCE, recorrendo à biblioteca RTNeural para inferência de baixa latência na audio thread. O resultado é um software que opera em qualquer DAW compatível, processando áudio em tempo real sem artefactos audíveis.

A qualidade da emulação é avaliada tecnicamente (ausência de dropouts, cumprimento dos requisitos de latência) e perceptivamente, através de um teste ABX duplo-cego online que determina estatisticamente se ouvintes treinados conseguem distinguir o plugin do hardware analógico original.

---

## MVP — Definição e critérios de aceitação

<!-- Listar as funcionalidades do núcleo mínimo obrigatório na entrega final. -->
<!-- Para cada funcionalidade, definir um critério de aceitação observável. -->
<!-- Exemplo de critério fraco: "o utilizador consegue autenticar-se" -->
<!-- Exemplo de critério forte: "dado email e password válidos, o sistema autentica e redirige para o dashboard -->
<!--   em menos de 2 segundos; dado email inválido, apresenta mensagem de erro sem expor informação de sistema." -->

### Funcionalidade 1 — Carregamento e Interface Base

**Critério de aceitação:**  
O plugin instancia corretamente num host compatível (ex: Reaper) sem erros de carregamento. A interface gráfica expõe, no mínimo, dois controlos funcionais: Bypass (liga/desliga o processamento) e Output Volume (ganho de saída em dB). O sistema opera de forma estável, sem falhas críticas, bloqueios da DAW ou corrupção do áudio.

### Funcionalidade 2 — Inferência de IA em Tempo Real

**Critério de aceitação:**  
Dado um sinal DI (Direct Inject) de baixo elétrico como entrada, o plugin processa cada bloco de amostras através do modelo de rede neuronal carregado, produzindo na saída o timbre de distorção característico do Darkglass Alpha Omicron. O processamento deve respeitar o tamanho de buffer configurado na DAW (tipicamente 64–512 amostras a 44.1 kHz), sem glitches audíveis, interrupções ou sobre-utilização de CPU.

### Funcionalidade 3 — WebApp de Validação ABX

**Critério de aceitação:**  
A aplicação web, acessível via URL público, implementa um teste ABX duplo-cego: o participante ouve as amostras A (hardware original), B (emulação IA) e X (referência aleatória), seleciona se X corresponde a A ou B, e submete a resposta. Cada submissão é registada numa base de dados para análise estatística posterior (teste binomial / d' de teoria da deteção de sinal). A aplicação suporta múltiplos participantes simultâneos e garante a aleatorização das amostras para eliminar viés de ordem.

<!-- Adicionar funcionalidades conforme necessário -->

> **Plano de Contingência:** Se, na demo interna (início de maio), a inferência de ML apresentar latência excessiva ou instabilidade irresolvível, a componente de IA é substituída por um algoritmo de distorção open-source. A infraestrutura do plugin, a interface e a WebApp ABX mantêm-se inalteradas, garantindo a entrega de um produto funcional.

---

## Stack tecnológica

<!-- Para cada tecnologia principal, uma linha de justificação. -->
<!-- Não é necessário ser exaustivo — as decisões menores entram nos ADRs durante o desenvolvimento. -->

| Componente | Tecnologia escolhida | Justificação |
|-----------|---------------------|-------------|
| Plugin de áudio | JUCE (C++) | Framework multiplataforma para desenvolvimento de plugins de áudio. Abstrai a complexidade dos formatos VST3/AU e fornece APIs de alto nível para gestão da audio thread, interface gráfica e comunicação com a DAW. |
| Inferência em tempo real | RTNeural | Biblioteca C++ de inferência de redes neuronais otimizada para processamento de áudio em tempo real. Opera diretamente na audio thread, respeitando restrições de latência e evitando alocações de memória dinâmica. |
| Treino do modelo | PyTorch | Ecossistema padrão da indústria para prototipagem e treino de modelos de redes neuronais. |
| Pipeline de dados | Python | Scripts de pré-processamento dos pares Dry/Wet de áudio: normalização, segmentação, data augmentation e geração dos datasets de treino/validação/teste. |
| WebApp ABX | HTML / CSS / JS | Stack leve para a WebApp do teste ABX. Sem dependências de frameworks pesados, facilitando deploy em serviços estáticos (GitHub Pages, Netlify) com backend mínimo para persistência de respostas. |

---


## Calendário individual detalhado

<!-- Adaptar o template do Guia de Projecto ao projecto específico. -->
<!-- As datas das três entregas formais são fixas. O restante é do estudante gerir. -->
<!-- Ser realista: prever tempo para testes, revisão do relatório e preparação da defesa. -->

| Semanas | Datas | Conteúdo planeado | Marco |
|---------|-------|------------------|-------|
| Sem. 1–2 | 17–28 mar | Configuração JUCE; boilerplate do plugin (I/O, bypass, output gain). | **Proposta (25 mar)** |
| Sem. 3–4 | 31 mar–11 abr | Documento MoSCoW; diagramas C4; setup GitHub; Sessão de reamping: captura de pares Dry/Wet com o Darkglass Alpha Omicron. | |
| Sem. 5–6 | 14–25 abr | Pipeline de treino PyTorch; ADRs documentados; Início da integração RTNeural no JUCE; primeiros testes de inferência offline. | |
| Sem. 7 | 28 abr–2 mai | Demo ao orientador; avaliação de latência e estabilidade; Decisão: manter IA ou ativar fallback DSP. | **Demo interna** |
| Sem. 8 | 5–6 mai | Entrega do Relatório Intercalar. | **Intercalar (6 mai)** |
| Sem. 9–10 | 7–16 mai | Quantização/pruning do modelo; profiling de CPU; Desenvolvimento da WebApp ABX. | |
| Sem. 11–12 | 19–30 mai | MVP completo; Lançamento público do teste ABX; recrutamento de participantes. | |
| Sem. 13 | 2–6 jun | Análise estatística ABX (teste binomial; cálculo de d'); Fecho da GUI; validação final dos critérios de aceitação. | |
| Sem. 14 | 9–13 jun | Capítulos 4 (Testes) e 5 (Conclusões); Formatação APA; organização de anexos. | |
| Sem. 15 | 16–20 jun | Reunião síncrona com orientador; revisão final do repositório GitHub e relatório. | **Prep. defesa** |
| Sem. 16 | 24 jun | Entrega do relatório, código-fonte e demo funcional. | **Final (24 jun)** |
