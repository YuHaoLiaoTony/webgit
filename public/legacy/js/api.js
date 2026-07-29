    // API calls
    async function api(endpoint, options = {}) {
      try {
        const headers = { 'Content-Type': 'application/json' };

        // Add CSRF token for state-changing requests
        if (options.method && options.method !== 'GET' && state.csrfToken) {
          headers['X-CSRF-Token'] = state.csrfToken;
        }

        const response = await fetch(`/api${endpoint}`, {
          headers,
          ...options,
          body: options.body ? JSON.stringify(options.body) : undefined
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'API Error');
        return data;
      } catch (error) {
        showToast(error.message, 'error');
        throw error;
      }
    }
