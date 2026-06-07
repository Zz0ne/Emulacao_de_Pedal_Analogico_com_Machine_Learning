#include "NeuralModel.h"
#include "ModelData.h"

#include <sstream>
#include <string>

void NeuralModel::prepare()
{
  // Construir uma stream a partir do JSON embebido no binário
  const std::string jsonStr(ModelData::model_json, ModelData::model_jsonSize);
  std::stringstream jsonStream(jsonStr);

  // Parse manual: a RTNeural tem helpers para LSTM/Dense PyTorch
  nlohmann::json modelJson;
  jsonStream >> modelJson;

  // Os pesos estão dentro de "state_dict"
  const auto & stateDict = modelJson.at("state_dict");

  // Carregar a LSTM (layer 0) e a Dense (layer 1) usando os helpers
  RTNeural::torch_helpers::loadLSTM<float>(stateDict, "lstm.", model_.get<0>());
  RTNeural::torch_helpers::loadDense<float>(stateDict, "linear.", model_.get<1>());

  model_.reset();
  isPrepared = true;
}

void NeuralModel::reset()
{
  if (isPrepared)
    model_.reset();
}

float NeuralModel::processSample(float input) noexcept
{
  if (!isPrepared)
    return input;  // bypass-safe se algo correr mal

  const float in[1] = { input };
  return model_.forward(in);
}
