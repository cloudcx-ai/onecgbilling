const API_KEY_STORAGE_KEY = 'cloudcx_api_key';

export function getApiKey(): string {
  let key = localStorage.getItem(API_KEY_STORAGE_KEY);
  
  if (!key) {
    key = prompt('Enter API Key (leave as default for demo: demo-api-key)') || 'demo-api-key';
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  }
  
  return key;
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

// Initialize API key on load
if (typeof window !== 'undefined') {
  getApiKey();
}
