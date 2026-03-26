# Levantamento de Requisitos

**Projecto:** Clone Neural: Darkglass Alpha Omicron  
**Versão:** 1.0 · 25 de março de 2026  
**Referência MoSCoW:** https://www.productplan.com/glossary/moscow-prioritization/

---

## Método MoSCoW

| Categoria | Significado |
|-----------|------------|
| **Must have** | Obrigatório. Sem isto o projecto não é entregável. |
| **Should have** | Importante mas não crítico. Incluir se o tempo permitir. |
| **Could have** | Desejável. Só se tudo o resto estiver concluído. |
| **Won't have** | Explicitamente fora do âmbito desta versão. |

---

## Requisitos funcionais

### Must have

- RF01 — O sistema tem de compilar o plugin de áudio nativamente nos formatos VST3 e aplicação Standalone.
- RF02 — O plugin tem de carregar com sucesso o ficheiro de pesos do modelo de Machine Learning (pré-treinado).
- RF03 — O plugin tem de dispor de controlos de interface funcional para atuar sobre o *Bypass* (sinal limpo) e o *Output Volume* (ganho de saída).
- RF04 — A WebApp de teste ABX tem de reproduzir de forma cega três fontes de áudio (A, B e X aleatório) e permitir a submissão de uma escolha ("X é A" ou "X é B").
- RF05 — A WebApp tem de registar e persistir os resultados numa base de dados (ex: Firebase ou Google Sheets API) para futura extração e análise estatística.

### Should have

- RF06 — O plugin deve incluir um controlo de *Input Gain / Drive*, processado via algoritmos DSP tradicionais antes do bloco da rede neuronal.
- RF07 — O sistema deve ser capaz de compilar o plugin no formato AU (Audio Unit) para garantir compatibilidade com as DAWs do ecossistema Apple.

### Could have

- RF08 — O plugin pode incluir filtros DSP clássicos de *Tone/EQ* (Low-pass/High-pass) no final da cadeia de sinal.
- RF09 — A WebApp pode fornecer feedback visual imediato ao utilizador sobre o sucesso ou falha da sua resposta após submeter o voto.
- RF10 — O plugin pode suportar a comutação entre múltiplos modelos pré-treinados (*presets*) através de um menu *dropdown* na interface.

### Won't have (nesta versão)

- RF11 — **Treino Dinâmico em Tempo Real:** O modelo não vai "aprender" enquanto o plugin corre (treino é feito previamente *offline*; o plugin apenas faz a inferência).
- RF12 — **Formatos Proprietários/Mobile:** Compilação para AAX (Pro Tools) devido a entraves de licenciamento comercial.

---

## Requisitos não-funcionais

### Must have

- RNF01 — **Performance (Áudio):** O tempo de inferência do modelo na *audio thread* (via RTNeural) tem de ser estritamente inferior ao tempo do *buffer* alocado pela DAW, garantindo total ausência de falhas ou artefactos (*dropouts/glitches*).

### Should have

- RNF02 — **Usabilidade:** A interface gráfica (GUI) no JUCE deve sobrepor-se à interface genérica do sistema operativo, apresentando controlos rotativos (*knobs*) intuitivos para manipulação dos parâmetros de áudio.
- RNF03 — **Performance (Web):** O tempo de carregamento inicial da WebApp e das amostras de áudio `.wav` em cache não deve ultrapassar os 2 segundos.

### Could have

- RNF04 — **Manutenibilidade:** O código de renderização gráfica (*PluginEditor*) deve estar rigorosamente desacoplado do código de processamento DSP (*PluginProcessor*).

---

## Histórico de alterações

| Versão | Data | Alteração | Razão |
|--------|------|-----------|-------|
| 1.0 | 25 de março de 2026 | Versão inicial | Formalização e definição do âmbito e proteção do MVP em concordância com a Proposta de Projeto. |
| | | | |