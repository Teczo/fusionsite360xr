import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Settings, ArrowLeft, Key, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiApi } from '../services/api';

const PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure-openai', label: 'Azure OpenAI' },
];

const MODELS_BY_PROVIDER = {
  claude: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recommended)' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Faster)' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommended)' },
    { value: 'gpt-4o', label: 'GPT-4o (More capable)' },
  ],
  'azure-openai': [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
  ],
};

export default function AiSettingsPage() {
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('id');

  const [provider, setProvider] = useState('claude');
  const [model, setModel] = useState(MODELS_BY_PROVIDER.claude[0].value);
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [azureEndpoint, setAzureEndpoint] = useState('');
  const [azureDeploymentName, setAzureDeploymentName] = useState('');
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingKey, setRemovingKey] = useState(false);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await aiApi.getSettings();
        setProvider(data.provider || 'claude');
        setModel(data.model || MODELS_BY_PROVIDER[data.provider || 'claude'][0].value);
        setUseOwnKey(data.useOwnKey || false);
        setHasApiKey(data.hasApiKey || false);
      } catch (err) {
        console.error('Failed to load AI settings:', err);
      } finally {
        setLoading(false);
      }
    }

    async function loadHistory() {
      try {
        const data = await aiApi.getHistory(5, projectId);
        setHistory(Array.isArray(data) ? data : (data.history || []));
      } catch {
        // History is optional; silently ignore errors
      }
    }

    loadSettings();
    loadHistory();
  }, [projectId]);

  function handleProviderChange(newProvider) {
    setProvider(newProvider);
    setModel(MODELS_BY_PROVIDER[newProvider][0].value);
    setNewApiKey('');
    setHasApiKey(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await aiApi.updateSettings({
        provider,
        model,
        useOwnKey,
        apiKey: newApiKey || undefined,
        azureEndpoint: provider === 'azure-openai' ? azureEndpoint : undefined,
        azureDeploymentName: provider === 'azure-openai' ? azureDeploymentName : undefined,
      });
      if (newApiKey) {
        setHasApiKey(true);
        setNewApiKey('');
      }
      toast.success('AI settings saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveKey() {
    setRemovingKey(true);
    try {
      await aiApi.removeKey();
      setHasApiKey(false);
      setNewApiKey('');
      toast.success('API key removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove key');
    } finally {
      setRemovingKey(false);
    }
  }

  const backPath = projectId ? `/ai?id=${projectId}` : '/ai';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={backPath}
          className="p-2 rounded-lg text-textsec hover:text-textpri hover:bg-gray-100 transition-all"
          title="Back to AI Assistant"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-brand/10 grid place-items-center shrink-0">
          <Settings className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-textpri leading-tight">AI Settings</h1>
          <p className="text-sm text-textsec">Configure your AI provider and preferences</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-textsec text-sm">
          Loading settings…
        </div>
      ) : (
        <>
          {/* Settings card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <h2 className="text-sm font-semibold text-textpri mb-4">Provider & Model</h2>

            {/* Provider */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-textpri mb-1.5">
                AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-textpri focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-textpri mb-1.5">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-textpri focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
              >
                {MODELS_BY_PROVIDER[provider].map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Azure-specific fields */}
            {provider === 'azure-openai' && (
              <div className="mb-5 space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-sm font-medium text-textpri mb-1.5">
                    Azure Endpoint
                  </label>
                  <input
                    type="text"
                    value={azureEndpoint}
                    onChange={(e) => setAzureEndpoint(e.target.value)}
                    placeholder="https://your-resource.openai.azure.com"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-textpri placeholder:text-textsec focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textpri mb-1.5">
                    Azure Deployment Name
                  </label>
                  <input
                    type="text"
                    value={azureDeploymentName}
                    onChange={(e) => setAzureDeploymentName(e.target.value)}
                    placeholder="gpt-4o-mini"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-textpri placeholder:text-textsec focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
                  />
                </div>
              </div>
            )}

            <hr className="border-gray-100 mb-5" />
            <h2 className="text-sm font-semibold text-textpri mb-4">API Key</h2>

            {/* BYOK toggle */}
            <div className="flex items-center gap-3 mb-4">
              <button
                role="switch"
                aria-checked={useOwnKey}
                onClick={() => {
                  setUseOwnKey((v) => !v);
                  setNewApiKey('');
                }}
                className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${
                  useOwnKey ? 'bg-brand' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    useOwnKey ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm text-textpri">Use my own API key</span>
            </div>

            {useOwnKey && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-textpri mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-textsec" />
                  API Key
                </label>
                {hasApiKey ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-textsec font-mono">
                      ••••••••••••••••••••••••
                    </div>
                    <button
                      onClick={handleRemoveKey}
                      disabled={removingKey}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {removingKey ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="password"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="Enter your API key…"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-textpri placeholder:text-textsec focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
                  />
                )}
                <p className="mt-1.5 text-xs text-textsec">
                  Your key is stored securely and never logged or shared.
                </p>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl btn-gradient-primary text-sm font-semibold disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>

          {/* Recent queries */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-textpri">Recent Queries</h2>
                {projectId && (
                  <Link
                    to={`/ai?id=${projectId}`}
                    className="text-xs text-brand hover:underline"
                  >
                    Open AI Assistant
                  </Link>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {history.map((item, i) => (
                  <div
                    key={item.id || i}
                    className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-textpri truncate">{item.question}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.provider && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-textsec rounded-full">
                            {item.provider}
                          </span>
                        )}
                        {item.createdAt && (
                          <span className="text-[11px] text-textsec">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
