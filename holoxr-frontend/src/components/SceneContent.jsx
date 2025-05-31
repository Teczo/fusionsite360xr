import GLBModel from './GLBModel';
import ImagePlane from './ImagePlane';
import TextItem from './TextItem';

export default function SceneContent({
    items,
    selectedModelId,
    setSelectedModelId,
    transformMode,
    updateModelTransform,
    handleFocusObject,
    onModelLoaded
}) {
    return (
        <>
            {items.map((item) => {
                if (item.type === 'model') {
                    return (
                        <GLBModel
                            key={item.id}
                            {...item}
                            selectedModelId={selectedModelId}
                            setSelectedModelId={setSelectedModelId}
                            transformMode={transformMode}
                            updateModelTransform={updateModelTransform}
                            handleFocusObject={handleFocusObject}
                            selectedAnimationIndex={item.selectedAnimationIndex || 0}
                            playAnimationKey={item.playAnimationKey || 0}
                            onLoaded={onModelLoaded}
                        />
                    );
                }
                if (item.type === 'image') {
                    return (
                        <ImagePlane
                            key={item.id}
                            {...item}
                            selectedModelId={selectedModelId}
                            setSelectedModelId={setSelectedModelId}
                            transformMode={transformMode}
                            updateModelTransform={updateModelTransform}
                            handleFocusObject={handleFocusObject}
                        />
                    );
                }
                if (item.type === 'text') {
                    return (
                        <TextItem
                            key={item.id}
                            {...item}
                            selectedModelId={selectedModelId}
                            setSelectedModelId={setSelectedModelId}
                            transformMode={transformMode}
                            updateModelTransform={updateModelTransform}
                            handleFocusObject={handleFocusObject}
                        />
                    );
                }
                return null;
            })}
        </>
    );
}
