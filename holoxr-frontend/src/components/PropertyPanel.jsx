export default function PropertyPanel({ model, updateModelTransform, updateTextProperty }) {
  if (!model) {
    return <div className="p-4 text-gray-500">No model selected</div>;
  }

  const handleChange = (field, value) => {
    updateModelTransform(model.id, {
      ...model.transform,
      [field]: parseFloat(value) || 0,
    });
  };

  const fields = [
    { label: 'Position', keys: ['x', 'y', 'z'] },
    { label: 'Rotation', keys: ['rx', 'ry', 'rz'] },
    { label: 'Scale', keys: ['sx', 'sy', 'sz'] },
  ];

  return (
    <div className="h-full w-full p-4 bg-gray-100 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Properties: {model.name}</h2>

      {fields.map(({ label, keys }) => (
        <div className="mb-4" key={label}>
          <h3 className="font-semibold mb-2">{label}</h3>
          <div className="flex space-x-2">
            {keys.map((key) => (
              <div key={key} className="flex flex-col">
                <label className="text-sm uppercase">{key}</label>
                <input
                  type="number"
                  value={model.transform[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="border rounded px-2 py-1 w-16"
                  step={key.startsWith('s') ? 0.1 : 0.01}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {model.type === 'text' && (
        <>
          <hr className="my-4 border-t border-gray-300" />
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Text Properties</h3>

            <label className="text-sm block mb-1">Content</label>
            <input
              type="text"
              value={model.content}
              onChange={(e) => updateTextProperty(model.id, { content: e.target.value })}
              className="border rounded px-2 py-1 w-full mb-3"
            />

            <label className="text-sm block mb-1">Font Size</label>
            <input
              type="number"
              value={model.fontSize || 1}
              onChange={(e) => updateTextProperty(model.id, { fontSize: parseFloat(e.target.value) || 1 })}
              className="border rounded px-2 py-1 w-full mb-3"
              step="0.1"
            />

            <label className="text-sm block mb-1">Color</label>
            <input
              type="color"
              value={model.color || '#ffffff'}
              onChange={(e) => updateTextProperty(model.id, { color: e.target.value })}
              className="w-16 h-8 p-0 border rounded"
            />
          </div>
        </>
      )}
    </div>
  );
}