workspace "Darkglass ML Emulation" "Emulação de áudio com Machine Learning e validação percetiva ABX" {

    model {

        // ── Actores ──────────────────────────────────────────────────────────
        musico = person "Músico / Produtor" "Utiliza o plugin na DAW para obter o som do Darkglass Alpha Omicron sem o hardware físico."

        participante = person "Participante ABX" "Realiza o teste perceptivo online para validar a qualidade da emulação."

        // ── Sistema central ───────────────────────────────────────────────────
        pluginSystem = softwareSystem "Plugin VST3 / AU" "Emula o comportamento do pedal Darkglass Alpha Omicron em tempo real, utilizando uma rede neuronal treinada com PyTorch e executada via RTNeural." {
            tags "System"
        }

        // ── Sistemas externos ─────────────────────────────────────────────────
        daw = softwareSystem "DAW (ex: Reaper)" "Host do plugin. Gere a audio thread, o grafo de áudio e a interface com o hardware de som." {
            tags "External"
        }

        darkglass = softwareSystem "Darkglass Alpha Omicron" "Hardware analógico de referência. Fornece os ficheiros Wet para treino do modelo via sessão de reamping." {
            tags "External"
        }

        webappABX = softwareSystem "WebApp ABX" "Aplicação web pública que implementa o teste ABX duplo-cego. Regista as respostas dos participantes para análise estatística." {
            tags "External"
        }

        // ── Relações ──────────────────────────────────────────────────────────
        musico -> pluginSystem "Carrega e usa na sessão" "VST3 / AU"
        musico -> daw "Trabalha em" "Interface gráfica"

        pluginSystem -> daw "Instanciado e gerido por" "Plugin API"
        daw -> pluginSystem "Envia blocos de áudio DI" "Audio thread"

        darkglass -> pluginSystem "Fornece pares Dry/Wet para treino" "Reamping / ficheiros de áudio"

        pluginSystem -> webappABX "Fornece amostras A (hardware) e B (emulação)" "Ficheiros de áudio exportados"

        participante -> webappABX "Realiza o teste e submete respostas" "HTTPS / Browser"
    }

    views {

        // ── Nível 1: System Context ───────────────────────────────────────────
        systemContext pluginSystem "SystemContext" {
            include *
            autoLayout lr
            description "Diagrama C4 Nível 1 — Contexto do sistema. Mostra os actores e sistemas externos que interagem com o plugin."
        }

        // ── Estilos ───────────────────────────────────────────────────────────
        styles {
            element "Person" {
                shape Person
                background "#D3D1C7"
                color "#2C2C2A"
                fontSize 14
            }
            element "System" {
                background "#B5D4F4"
                color "#042C53"
                fontSize 14
            }
            element "External" {
                background "#F1EFE8"
                color "#2C2C2A"
                fontSize 14
                border dashed
            }
            relationship "Relationship" {
                fontSize 12
                color "#6B7280"
            }
        }
    }

}
