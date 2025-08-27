import React from 'react';
import { upsertObjectAnimation } from '../../Studio/studioLogic';
import TransformSection from './TransformSection';
import TextPropertiesPanel from './TextPropertiesPanel';
import ButtonPropertiesPanel from './ButtonPropertiesPanel.jsx';
import LabelPropertiesPanel from './LabelPropertiesPanel.jsx';
import QuizPropertiesPanel from './QuizPropertiesPanel';
import ModelAnimationControls from './ModelAnimationControls';
import BehaviorEditor from './BehaviorEditor';

export default function PropertyPanel({
  model,
  models,
  updateModelTransform,
  updateTextProperty,
  onPlayAnimation,
  updateModelProps,
  onStartAnchorPick,
  projectId,                  // NEW: needed to save behaviors
  objectBehaviors = [],       // NEW: current behaviors for this model (from animByObject[model.id]?.behaviors)
  onBehaviorsSaved,
}) {

  const handleSaveBehaviors = async (modelId, behaviors) => {
    if (!projectId || !modelId) return null;
    return await upsertObjectAnimation(projectId, modelId, {
      enabled: true,
      version: Date.now(), // simple bump; server can coerce
      behaviors,
    });

  };

  const handleChange = (field, value) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      updateModelTransform(model.id, { [field]: parsed });
    }
  };

  // Only used for plain text items
  const handleTextPropertyChange = (field, value) => {
    updateTextProperty(model.id, { [field]: value });
  };

  // Generic helpers for 'label' / 'quiz' / other items using updateModelProps
  const setProp = (key, value) => updateModelProps(model.id, { [key]: value });
  const setAppearance = (key, value) =>
    updateModelProps(model.id, { appearance: { ...(model.appearance || {}), [key]: value } });

  const transform = model?.transform || {};

  if (!model) {
    return (
      <div className="absolute top-20 bottom-4 right-4 w-72 bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl rounded-3xl p-5 z-10 overflow-y-auto text-white space-y-4">
        <h2 className="text-m font-semibold">Properties</h2>
      </div>
    );
  }

  return (
    <div className="absolute top-20 bottom-4 right-4 w-72 bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl rounded-3xl p-5 z-10 overflow-y-auto text-white space-y-4">
      <h2 className="text-m font-semibold">Properties</h2>

      {/* Transform Section */}
      <TransformSection transform={transform} onChange={handleChange} />

      {/* Text Properties (3D Text item) */}
      {model.type === 'text' && (
        <TextPropertiesPanel model={model} onChange={handleTextPropertyChange} />
      )}

      {/* Button Properties */}
      {model.type === 'button' && (
        <ButtonPropertiesPanel
          model={model}
          models={models}
          updateModelProps={updateModelProps}
        />
      )}

      {/* Label Properties (UILabel3D) */}
      {model.type === 'label' && (
        <LabelPropertiesPanel
          model={model}
          models={models}
          updateModelProps={updateModelProps}
          onStartAnchorPick={onStartAnchorPick}
        />
      )}

      {/* Quiz Properties */}
      {model.type === 'quiz' && (
        <QuizPropertiesPanel
          model={model}
          setProp={setProp}
          setAppearance={setAppearance}
        />
      )}

      {/* Animation Controls */}
      <ModelAnimationControls
        model={model}
        updateModelTransform={updateModelTransform}
        onPlayAnimation={onPlayAnimation}
      />

      {/* Backend Behaviors (rotateSelf / orbit / translatePath) */}
      {model.type === 'model' && (
        <BehaviorEditor
          modelId={model.id}
          behaviors={objectBehaviors}
          models={models}
          onSave={handleSaveBehaviors}
          onBehaviorsSaved={onBehaviorsSaved}
        />
      )}
    </div>
  );
}



