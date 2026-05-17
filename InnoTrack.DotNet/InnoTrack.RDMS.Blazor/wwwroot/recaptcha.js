window.innoTrackRecaptcha = (() => {
  let loadPromise = null;

  function load() {
    if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
      return Promise.resolve(window.grecaptcha);
    }

    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-innotrack-recaptcha="true"]');

      const finalize = () => {
        if (!window.grecaptcha || typeof window.grecaptcha.render !== 'function') {
          reject(new Error('reCAPTCHA failed to initialize.'));
          return;
        }

        resolve(window.grecaptcha);
      };

      if (existingScript) {
        if (existingScript.dataset.loaded === 'true') {
          finalize();
          return;
        }

        existingScript.addEventListener('load', finalize, { once: true });
        existingScript.addEventListener('error', () => reject(new Error('reCAPTCHA failed to load.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.innotrackRecaptcha = 'true';
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        finalize();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('reCAPTCHA failed to load.')), { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      loadPromise = null;
      throw error;
    });

    return loadPromise;
  }

  async function render(containerId, siteKey) {
    if (!siteKey || !siteKey.trim()) {
      throw new Error('reCAPTCHA is not configured. Please contact support.');
    }

    const grecaptcha = await load();
    const container = document.getElementById(containerId);

    if (!container) {
      throw new Error('reCAPTCHA container was not found.');
    }

    const existingWidgetId = container.dataset.widgetId;
    if (existingWidgetId) {
      grecaptcha.reset(Number(existingWidgetId));
      return Number(existingWidgetId);
    }

    const widgetId = grecaptcha.render(container, {
      sitekey: siteKey.trim(),
      theme: 'light',
    });

    container.dataset.widgetId = String(widgetId);
    return widgetId;
  }

  async function getResponse(widgetId) {
    const grecaptcha = await load();
    const token = grecaptcha.getResponse(widgetId);
    return token || '';
  }

  async function reset(widgetId) {
    if (widgetId == null) {
      return;
    }

    const grecaptcha = await load();
    grecaptcha.reset(widgetId);
  }

  return { render, getResponse, reset };
})();