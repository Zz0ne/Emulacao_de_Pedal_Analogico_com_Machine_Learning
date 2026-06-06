#pragma once

#include <RTNeural/RTNeural.h>

class NeuralModel
{
public:
  NeuralModel() = default;

  void prepare();
  void reset();
  float processSample(float input) noexcept;

private:
  static constexpr int HIDDENSIZE = 24;

  RTNeural::ModelT<float, 1, 1,
      RTNeural::LSTMLayerT<float, 1, HIDDENSIZE>,\
      RTNeural::DenseT<float, HIDDENSIZE, 1>
  > model_;

  bool isPrepared = false;
};