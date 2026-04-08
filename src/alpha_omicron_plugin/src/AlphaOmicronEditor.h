#pragma once

#include "AlphaOmicronProcessor.h"

//==============================================================================
class AlphaOmicronEditor final : public juce::AudioProcessorEditor
{
public:
    explicit AlphaOmicronEditor (AlphaOmicronProcessor&);
    ~AlphaOmicronEditor() override;

    //==============================================================================
    void paint (juce::Graphics&) override;
    void resized() override;

private:
    // This reference is provided as a quick way for your editor to
    // access the processor object that created it.
    AlphaOmicronProcessor& processorRef;

    juce::ToggleButton bypassButton  { "Bypass" };
    juce::Slider       outputSlider;
    juce::Label        outputLabel   { {}, "Output Volume" };

    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> bypassAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> outputAttachment;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AlphaOmicronEditor)
};
