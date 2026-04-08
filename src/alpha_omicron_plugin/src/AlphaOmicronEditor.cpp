#include "AlphaOmicronEditor.h"
#include "AlphaOmicronProcessor.h"

//==============================================================================
AlphaOmicronEditor::AlphaOmicronEditor (AlphaOmicronProcessor& p)
    : AudioProcessorEditor (&p), processorRef (p)
{
    outputSlider.setSliderStyle(juce::Slider::RotaryVerticalDrag);
    outputSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 60, 20);

    bypassAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(
        processorRef.apvts, "bypass", bypassButton);

    outputAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        processorRef.apvts, "outputVolume", outputSlider);

    addAndMakeVisible(bypassButton);
    addAndMakeVisible(outputSlider);
    addAndMakeVisible(outputLabel);

    setSize(400, 300);
}

AlphaOmicronEditor::~AlphaOmicronEditor()
{
}

//==============================================================================
void AlphaOmicronEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colour(0xff1a1a2e)); // dark background
    g.setColour(juce::Colours::white);
    g.setFont(16.0f);
    g.drawFittedText("Alpha Omicron", getLocalBounds().removeFromTop(40),
                     juce::Justification::centred, 1);
}

void AlphaOmicronEditor::resized()
{
    auto area = getLocalBounds().reduced(20);

    auto topBar = area.removeFromTop(40);

    bypassButton.setBounds(area.removeFromLeft(120).reduced(10));
    outputSlider.setBounds(area.removeFromLeft(140).reduced(10));
}