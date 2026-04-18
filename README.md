# Emulação de Pedal Analógico com Machine Learning 

>Emulação digital de hardware analógico de áudio em tempo real, utilizando Machine Learning com Python e C++. 

**Estudante:** Nuno Rodrigues · 2201022
**Orientador:** Pedro Pestana  
**UC:** Projecto de Engenharia Informática · Universidade Aberta · 2025/26  
**Repositório:** https://github.com/Zz0ne/Emulacao_de_Pedal_Analogico_com_Machine_Learning 

---

## Estado actual

<!-- Actualizar a cada entrega. Escolher um estado e apagar os outros. -->

🟢 **Verde** — A correr conforme planeado.  

---

## O que está implementado

<!-- Lista das funcionalidades do MVP que estão funcionais. -->
<!-- Ser específico: não "o login está feito" mas "autenticação por email/password com JWT, sessão persistente em localStorage." -->

- [x] **Setup de Infraestrutura** — Configuração do repositório de acordo com as normas da UC (docs, scope, architecture).
- [x] **Boilerplate JUCE** — Projeto base configurado via CMake; compilação bem-sucedida dos formatos VST3 e Standalone.
- [x] **Interface Gráfica** — Desenvolvimento do front-end do plugin no JUCE, mapeando os controlos visuais aos parâmetros do motor de processamento de áudio.
- [x] **WebApp de Validação (front-end)** — Desenvolvimento de uma interface web simples para testes duplo-cego de avaliação psicoacústica.

---

## O que está pendente

<!-- O que falta do MVP e porquê. Se algo foi descontinuado, explicar a decisão. -->
- [ ] **Aquisição de Dados** — Gravação do dataset de ficheiros Dry/Wet através do pedal físico para posterior treino.
- [ ] **Treino do Modelo de ML** — Implementação e treino da rede neuronal usando PyTorch.
- [ ] **Inferência em Tempo Real** — Integração da biblioteca RTNeural no JUCE para carregar o modelo treinado.
- [ ] **WebApp de Validação (back-end)** — Desenvolvimento de uma interface web simples para testes duplo-cego de avaliação psicoacústica.
---

## Como instalar e correr

<!-- Instruções que funcionam numa máquina limpa. Se não funcionar na demo, não conta como feito. -->

### Pré-requisitos

```
- Compilador C++ (GCC, Clang, MSVC)
- CMake (versão 3.15 ou superior)
- DAW compatível com formato vst3 (ex: Reaper, Ableton Live)
```

### Instalação

```bash
# 1. Clonar o repositório
git clone https://github.com/Zz0ne/Emulacao_de_Pedal_Analogico_com_Machine_Learning 
cd  Emulacao_de_Pedal_Analogico_com_Machine_Learning/alpha_omicron_sim_plugin

# 2. Compilar plugin
cmake -B cmake-build -DCMAKE_BUILD_TYPE=Debug
cmake --build cmake-build --config Debug

```
Após a compilação, o executável Standalone e o ficheiro .vst3 estarão disponíveis na pasta:
```
 # TODO: Completar
   ./cmake-build/[Nome_do_Artefacto]_artefacts/Debug/
```

### Acesso

O ficheiro VST3 pode ser carregado em qualquer DAW compatível (ex: Reaper, Ableton Live).

---

## Decisões de arquitectura principais

<!-- 2 a 4 decisões relevantes com justificação breve. Para o detalhe completo, ver docs/architecture/adr/. -->

| Decisão              | Alternativa considerada | Razão da escolha |
|----------------------|-------------------------|-----------------|
| C++ e Framework JUCE | NA                      | O processamento de áudio em tempo real exige gestão manual de memória para evitar paragens na audio thread. O JUCE foi escolhido por abstrair a complexidade de compilar formatos de plugin VST3/AU multiplataforma. |
| Biblioteca RTNeural  | libtorch                | A API nativa do PyTorch em C++ é demasiado pesada e aloca memória dinamicamente, causando "engasgos" no áudio. A RTNeural foi desenhada especificamente para inferência rápida e leve na audio thread. |
| Treino com PyTorch    | TensorFlow                      | O ecossistema Python é o standard da indústria para prototipagem de IA. Permite utilizar o Google Colab para treinar o modelo na cloud usando GPUs sem exigir hardware local potente. |

---

## Referências e IA utilizada

<!-- Bibliotecas, APIs externas, tutoriais seguidos. -->
<!-- Distinguir o que foi escrito de raiz do que foi adaptado ou gerado. -->

### Referências técnicas

- The Audio Programmer - How to Make Your First VST Plugin

### Ferramentas de IA utilizadas

<!-- Obrigatório declarar. Não é penalizado. -->

| Ferramenta | Para que foi usada                                           |
|-----------|--------------------------------------------------------------|
| Gemini | Brainstorming inicial de ideias de projeto, troubleshooting. |

---
