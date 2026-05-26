#include "AlphaOmicronEditor.h"
#include "AlphaOmicronProcessor.h"

#include <BinaryData.h>

namespace
{
    juce::String mimeTypeFor (const juce::String& path)
    {
        const auto ext = path.fromLastOccurrenceOf (".", false, false).toLowerCase();

        if (ext == "html" || ext == "htm") return "text/html";
        if (ext == "js")                   return "text/javascript";
        if (ext == "css")                  return "text/css";
        if (ext == "json")                 return "application/json";
        if (ext == "svg")                  return "image/svg+xml";
        if (ext == "png")                  return "image/png";
        if (ext == "jpg" || ext == "jpeg") return "image/jpeg";
        if (ext == "woff2")                return "font/woff2";

        return "application/octet-stream";
    }

    // Maps an HTTP request path coming from the embedded browser onto the
    // BinaryData identifier produced by juce_add_binary_data().
    const char* binaryDataNameFor (const juce::String& path)
    {
        if (path == "/" || path == "/index.html")    return "index_html";
        if (path == "/main.js")                      return "main_js";
        if (path == "/style.css")                    return "style_css";
        if (path == "/juce/index.js")                return "juce_index_js";
        if (path == "/juce/check_native_interop.js") return "check_native_interop_js";

        return nullptr;
    }
}

//==============================================================================
bool AlphaOmicronEditor::SinglePageBrowser::pageAboutToLoad (const juce::String& newURL)
{
    return newURL == juce::WebBrowserComponent::getResourceProviderRoot();
}

//==============================================================================
AlphaOmicronEditor::AlphaOmicronEditor (AlphaOmicronProcessor& p)
    : AudioProcessorEditor (&p),
      processorRef (p),
      webView (juce::WebBrowserComponent::Options{}
                   .withBackend (juce::WebBrowserComponent::Options::Backend::webview2)
                   .withWinWebView2Options (juce::WebBrowserComponent::Options::WinWebView2{}
                                                .withUserDataFolder (juce::File::getSpecialLocation (juce::File::SpecialLocationType::tempDirectory)))
                   .withNativeIntegrationEnabled()
                   .withOptionsFrom (outputVolumeRelay)
                   .withOptionsFrom (bypassRelay)
                   .withResourceProvider ([this] (const auto& url) { return getResource (url); })),
      outputVolumeAttachment (*processorRef.apvts.getParameter ("outputVolume"),
                              outputVolumeRelay,
                              processorRef.apvts.undoManager),
      bypassAttachment (*processorRef.apvts.getParameter ("bypass"),
                        bypassRelay,
                        processorRef.apvts.undoManager)
{
    addAndMakeVisible (webView);
    webView.goToURL (juce::WebBrowserComponent::getResourceProviderRoot());

    setSize (360, 540);
}

AlphaOmicronEditor::~AlphaOmicronEditor() = default;

//==============================================================================
void AlphaOmicronEditor::resized()
{
    webView.setBounds (getLocalBounds());
}

//==============================================================================
std::optional<juce::WebBrowserComponent::Resource>
AlphaOmicronEditor::getResource (const juce::String& url) const
{
    const auto path = url.upToFirstOccurrenceOf ("?", false, false);

    if (const auto* name = binaryDataNameFor (path))
    {
        int size = 0;
        if (const auto* data = BinaryData::getNamedResource (name, size))
        {
            const auto* bytes = reinterpret_cast<const std::byte*> (data);
            return juce::WebBrowserComponent::Resource {
                std::vector<std::byte> (bytes, bytes + size),
                mimeTypeFor (path)
            };
        }
    }

    return std::nullopt;
}
