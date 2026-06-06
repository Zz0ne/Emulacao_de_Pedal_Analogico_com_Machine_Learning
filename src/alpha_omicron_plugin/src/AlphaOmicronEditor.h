#pragma once

#include "AlphaOmicronProcessor.h"

//==============================================================================
class AlphaOmicronEditor final : public juce::AudioProcessorEditor
{
public:
    explicit AlphaOmicronEditor (AlphaOmicronProcessor&);
    ~AlphaOmicronEditor() override;

    //==============================================================================
    void resized() override;

private:
    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url) const;

    // Restricts navigation so the embedded browser stays on the bundled page.
    struct SinglePageBrowser : juce::WebBrowserComponent
    {
        using juce::WebBrowserComponent::WebBrowserComponent;
        bool pageAboutToLoad (const juce::String& newURL) override;
    };

    AlphaOmicronProcessor& processorRef;

    juce::WebSliderRelay        outputVolumeRelay { "outputVolume" };
    juce::WebToggleButtonRelay  bypassRelay       { "bypass" };

    SinglePageBrowser webView;

    juce::WebSliderParameterAttachment       outputVolumeAttachment;
    juce::WebToggleButtonParameterAttachment bypassAttachment;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AlphaOmicronEditor)
};
