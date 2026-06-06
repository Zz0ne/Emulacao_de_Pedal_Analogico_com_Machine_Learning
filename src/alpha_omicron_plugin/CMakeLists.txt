cmake_minimum_required(VERSION 3.24)
project(AlphaOmicronPlugin VERSION 0.0.1)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_XCODE_GENERATE_SCHEME OFF)
set_property(GLOBAL PROPERTY USE_FOLDERS ON)

# ── CPM ──────────────────────────────────────────────────────────────────────

set(CPM_DOWNLOAD_VERSION 0.34.0)
set(CPM_DOWNLOAD_LOCATION "${CMAKE_BINARY_DIR}/cmake/CPM_${CPM_DOWNLOAD_VERSION}.cmake")
if(NOT EXISTS ${CPM_DOWNLOAD_LOCATION})
    file(DOWNLOAD
        "https://github.com/cpm-cmake/CPM.cmake/releases/download/v${CPM_DOWNLOAD_VERSION}/CPM.cmake"
        ${CPM_DOWNLOAD_LOCATION})
endif()
include(${CPM_DOWNLOAD_LOCATION})

# ── JUCE ─────────────────────────────────────────────────────────────────────

CPMAddPackage(
    NAME juce
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG 8.0.4
)
CPMAddPackage(
        NAME RTNeural
        GIT_REPOSITORY https://github.com/jatinchowdhury18/RTNeural.git
        GIT_TAG main
        OPTIONS
        "RTNEURAL_EIGEN ON"
)

# ── WebKit (Linux only) ───────────────────────────────────────────────────────
# JUCE_WEBVIEW2_PACKAGE_NAME is injected by build.sh; falls back to 4.1 here.

if(LINUX)
    if(NOT DEFINED JUCE_WEBVIEW2_PACKAGE_NAME)
        set(JUCE_WEBVIEW2_PACKAGE_NAME "webkit2gtk-4.1")
    endif()
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(WEBKIT REQUIRED ${JUCE_WEBVIEW2_PACKAGE_NAME})
endif()

# ── Plugin target ─────────────────────────────────────────────────────────────
# Silenciar warnings de código de terceiros
if (TARGET RTNeural)
    target_compile_options(RTNeural PRIVATE
            $<$<CXX_COMPILER_ID:GNU,Clang>:-w>
    )
endif()

juce_add_binary_data(${PROJECT_NAME}_BinaryData
        SOURCES
        resources/model.json
)
# Make sure you include any new source files here
set(SourceFiles
        src/AlphaOmicronEditor.cpp
        src/AlphaOmicronEditor.h
        src/AlphaOmicronProcessor.cpp
        src/AlphaOmicronProcessor.h
        src/dsp/NeuralModel.cpp
        src/dsp/NeuralModel.h
)

juce_add_plugin(${PROJECT_NAME}
    COMPANY_NAME            Totally_Legit_Company
    IS_SYNTH                FALSE
    NEEDS_MIDI_INPUT        FALSE
    NEEDS_MIDI_OUTPUT       FALSE
    IS_MIDI_EFFECT          FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD TRUE
    PLUGIN_MANUFACTURER_CODE Tap1
    PLUGIN_CODE             Reg0
    FORMATS                 VST3 Standalone
    PRODUCT_NAME            "AlphaOmicronSIM"
    NEEDS_WEBVIEW2          TRUE
)

# ── Sources ───────────────────────────────────────────────────────────────────

target_sources(${PROJECT_NAME} PRIVATE
    src/AlphaOmicronEditor.cpp
    src/AlphaOmicronEditor.h
    src/AlphaOmicronProcessor.cpp
    src/AlphaOmicronProcessor.h
)

source_group(TREE ${CMAKE_CURRENT_SOURCE_DIR} FILES ${SourceFiles})

# ── Web UI binary data ────────────────────────────────────────────────────────

set(WebUiResourceDir "${CMAKE_CURRENT_BINARY_DIR}/web_ui_resources")
file(MAKE_DIRECTORY "${WebUiResourceDir}")
configure_file("${juce_SOURCE_DIR}/modules/juce_gui_extra/native/javascript/index.js"
               "${WebUiResourceDir}/juce_index.js" COPYONLY)
configure_file("${juce_SOURCE_DIR}/modules/juce_gui_extra/native/javascript/check_native_interop.js"
               "${WebUiResourceDir}/check_native_interop.js" COPYONLY)

juce_add_binary_data(${PROJECT_NAME}_WebUiData
    HEADER_NAME BinaryData.h
    NAMESPACE   BinaryData
    SOURCES
        src/ui/index.html
        src/ui/style.css
        src/ui/main.js
        "${WebUiResourceDir}/juce_index.js"
        "${WebUiResourceDir}/check_native_interop.js"
)
set_target_properties(${PROJECT_NAME}_WebUiData PROPERTIES POSITION_INDEPENDENT_CODE TRUE)

# ── Compile definitions ───────────────────────────────────────────────────────

target_compile_definitions(${PROJECT_NAME} PUBLIC
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1
)

# ── Link libraries ────────────────────────────────────────────────────────────

target_link_libraries(${PROJECT_NAME}
    PRIVATE
        ${PROJECT_NAME}_WebUiData
        $<$<BOOL:${LINUX}>:${WEBKIT_LIBRARIES}>
    PUBLIC
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_utils
        juce::juce_core
        juce::juce_data_structures
        juce::juce_dsp
        juce::juce_graphics
        juce::juce_gui_basics
        juce::juce_gui_extra
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags
        RTNeural
        ${PROJECT_NAME}_BinaryData
)

if(LINUX)
    target_include_directories(${PROJECT_NAME} PRIVATE ${WEBKIT_INCLUDE_DIRS})
endif()