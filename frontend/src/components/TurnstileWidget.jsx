import { useEffect, useRef } from 'react';

// Cloudflare Turnstile CAPTCHA widget.
// Test site key (always passes): 1x00000000000000000000AA
// Replace with a real site key from https://dash.cloudflare.com before going to production.
const SITE_KEY = '1x00000000000000000000AA';

export default function TurnstileWidget({ onVerify }) {
  const containerRef = useRef(null);
  const widgetIdRef  = useRef(null);

  useEffect(() => {
    let mounted = true;

    function renderWidget() {
      if (!mounted || !containerRef.current || widgetIdRef.current !== null) return;
      if (!window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback:          (token) => { if (mounted) onVerify(token); },
        'expired-callback': ()      => { if (mounted) onVerify(''); },
        'error-callback':   ()      => { if (mounted) onVerify(''); },
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else if (!document.getElementById('cf-turnstile-script')) {
      const script    = document.createElement('script');
      script.id       = 'cf-turnstile-script';
      script.src      = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async    = true;
      script.defer    = true;
      script.onload   = renderWidget;
      document.head.appendChild(script);
    } else {
      // Script tag already exists but may still be loading
      document.getElementById('cf-turnstile-script').addEventListener('load', renderWidget);
    }

    return () => {
      mounted = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="my-2" />;
}
