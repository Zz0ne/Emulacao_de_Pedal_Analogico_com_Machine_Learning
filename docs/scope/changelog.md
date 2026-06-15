# Changelog

<!-- Uma entrada por semana, até domingo à noite. -->
<!-- Formato fixo: três linhas por entrada. Não elaborar além do necessário. -->
<!-- O changelog é verificado nas três entregas formais. -->

---

## Sem. 1 · 17–21 mar

**Feito:** 
 - Submissão da Proposta do projeto
 - c4 nível 1
**Bloqueou:** 
 - Nada  
**Próxima semana:**
 - Setup do repositório no github
 - Boilerplate do plugin no JUCE

---

## Sem. 2 · 24–28 mar

**Feito:**
 - Setup do repositório no github
 - Boilerplate do plugin no JUCE
**Bloqueou:**
 - Nada
**Próxima semana:**
 - UI básico no JUCE
 - Captura de pares Dry/Wet com o Darkglass Alpha Omicron

---

## Sem. 3 · 31 mar–4 abr

**Feito:**
 - Pesquisa sobre alguns temas fundamentais sobre redes neurais.
**Bloqueou:**
 - Nada
**Próxima semana:**
 - UI básico no JUCE
 - Captura de pares Dry/Wet com o Darkglass Alpha Omicron

---

## Sem. 4 · 7–11 abr

**Feito:**  
 - Continuação da pesquisa sobre alguns temas fundamentais sobre redes neurais.
 - UI básico no JUCE
**Bloqueou:**
 - Perdi a fonte de alimentação do Darkglass Alpha Omicron, sem isso, não há captura. Terei de adquirir um durante a próxima semana.
**Próxima semana:**
 - Captura de pares Dry/Wet com o Darkglass Alpha Omicron
 - Pipeline de treino PyTorch

---

## Sem. 5 · 14–17 abr

**Feito:**
 - Algumas experiencias com pytorch, ainda nada especifico ao projeto.
 - Frontend da plataforma ABX em html/css/js feita como efolioA para a UC Laboratório de Sistemas e Serviços Web
**Bloqueou:**
 - devido a ter tido 3 efolios na mesma semana, dificultou um pouco o avanço no projeto
**Próxima semana:**
 - Captura de pares Dry/Wet com o Darkglass Alpha Omicron
 - Pipeline de treino PyTorch

---

## Sem. 6 · 22–25 abr

**Feito:**
- Captura de pares Dry/Wet com o Darkglass Alpha Omicron
- Continuar a explorar o pytorch.
**Bloqueou:**  
**Próxima semana:**
- Pipeline de treino PyTorch

---

## Sem. 7 · 28 abr–2 mai · DEMO INTERNA

**Feito:**
- Pipeline de treino PyTorch
- Integração da biblioteca RTNeural no JUCE para carregar o modelo treinado
- MVP
**Bloqueou:**
- No dataset, o dry e o wet estavam desfazados em +/- 5ms, foi necessário resolver esse problema para não comprometer o treino
**Próxima semana:**
- Relatório intermédio
- Captura de pares Dry/Wet para teste ABX
---

## Sem. 8 · 5–6 mai · INTERCALAR

**Feito:** 
- Relatório intermédio
**Bloqueou:**  
**Próxima semana:**
- Captura de pares Dry/Wet para teste ABX

---

## Sem. 9 · 7–9 mai

**Feito:** 
- Captura de pares Dry/Wet para teste ABX
**Bloqueou:**  
**Próxima semana:**
- Pequenas melhorias no código de treino
---

## Sem. 10 · 12–16 mai

**Feito:** 
- Nada, devido a efolios de outras UCs
**Bloqueou:**  
**Próxima semana:**

---

## Sem. 11 · 19–23 mai

**Feito:**  
- Desenvolver novo web based UI para o plugin com html/css/js
**Bloqueou:**  
**Próxima semana:**
- Iniciar desenvolvimento do backend para o teste ABX feito como efolioB para a UC Laboratório de Sistemas e Serviços Web

---

## Sem. 12 · 26–30 mai

**Feito:**  
- Desenvolvimento do backend para o teste ABX até á fase do efolioB da UC Laboratório de Sistemas e Serviços Web
**Bloqueou:**  
**Próxima semana:**
- Testar diferentes hidden values no pipeline de treino

---

## Sem. 13 · 2–6 jun
**Feito:**
- Recaptura do dataset Alpha Omicron com nova metodologia: níveis de captura peak ~−6 dBFS.
- Adição de suporte a CUDA no pipeline de treino para iteração mais rápida em GPU NVIDIA.
- Iterações de hiperparâmetros sobre o novo dataset: lr 5e-3 a 2e-3, hidden 24, até 200 epochs. ESR de validação convergiu a ~0.012 (vs ~0.030 da primeira captura).
- Análise comparativa entre o modelo da primeira captura (níveis moderados) e o modelo da nova captura (níveis boostados): o segundo apresenta mais conteúdo em altas frequências que o pedal de referência percebido.
- Adição de parâmetro **Input Gain** ao plugin C++ (range −12 a +24 dB, aplicado antes do `processSample`) para permitir compensar a discrepância entre nível de captura e nível de uso, expondo ao utilizador um controlo equivalente à variação de drive percebida no pedal real.

**Bloqueou:**
- Top-end perceptualmente exagerado no modelo treinado em dataset boostado, apesar de ESR baixo. 

**Próxima semana:**
- Decisão final sobre qual modelo levar para o teste ABX: opção provável é o modelo da primeira captura (hidden 24, ESR 0.030) combinado com Input Gain configurável, dado que reproduz subjectivamente melhor o pedal de referência.
- Lançamento público do teste ABX e recrutamento de participantes.
---

## Sem. 14 · 9–13 jun

**Feito:**  
- Lançamento público do teste ABX e recrutamento de participantes.
**Bloqueou:**  
**Próxima semana:**
- Analisar resultados do teste ABX
- Finalizar o relatório final

---

## Sem. 15 · 16–20 jun · PREP. DEFESA

**Feito:**  
**Bloqueou:**  
**Próxima semana:**

---

## Sem. 16 · 24 jun · ENTREGA FINAL

**Feito:**  
**Bloqueou:** —  
**Próxima semana:** — Defesa pública.
