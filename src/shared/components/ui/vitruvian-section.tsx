import { useEffect } from 'react';

export function VitruvianSection() {
  useEffect(() => {
    // Load Unicorn Studio embed script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = `
      !function(){
        if(!window.UnicornStudio){
          window.UnicornStudio={isInitialized:!1};
          var i=document.createElement("script");
          i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.33/dist/unicornStudio.umd.js";
          i.onload=function(){
            window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)
          };
          (document.head || document.body).appendChild(i)
        }
      }();
    `;
    document.head.appendChild(script);

    // Hide branding watermark
    const style = document.createElement('style');
    style.id = 'unicorn-hide-brand';
    style.textContent = `
      [data-us-project] { position: relative !important; overflow: hidden !important; }
      [data-us-project] canvas { clip-path: inset(0 0 8% 0) !important; }
      [data-us-project] * { pointer-events: none !important; }
      [data-us-project] a[href*="unicorn"],
      [data-us-project] button[title*="unicorn"],
      [data-us-project] div[title*="Made with"],
      [data-us-project] .unicorn-brand,
      [data-us-project] [class*="brand"],
      [data-us-project] [class*="credit"],
      [data-us-project] [class*="watermark"] {
        display: none !important; visibility: hidden !important;
        opacity: 0 !important; position: absolute !important;
        left: -9999px !important; top: -9999px !important;
      }
    `;
    document.head.appendChild(style);

    // Aggressively remove any branding text nodes
    const removeBranding = () => {
      document.querySelectorAll('[data-us-project] *').forEach(el => {
        const t = (el.textContent || '').toLowerCase();
        if (t.includes('made with') || t.includes('unicorn')) el.remove();
      });
    };
    removeBranding();
    const interval = setInterval(removeBranding, 100);
    setTimeout(removeBranding, 1000);
    setTimeout(removeBranding, 3000);

    return () => {
      clearInterval(interval);
      if (document.head.contains(script)) document.head.removeChild(script);
      const s = document.getElementById('unicorn-hide-brand');
      if (s) s.remove();
    };
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '75vh', backgroundColor: '#000000' }}
    >
      {/* Gradient fade from white (testimonials) into black */}
      <div
        className="absolute top-0 inset-x-0 z-10 pointer-events-none"
        style={{
          height: '120px',
          background: 'linear-gradient(to bottom, #ffffff 0%, #000000 100%)',
        }}
      />

      {/* Vitruvian Man WebGL animation */}
      <div
        data-us-project="whwOGlfJ5Rz2rHaEUgHl"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Gradient fade from black into violet-50 (pricing) */}
      <div
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none"
        style={{
          height: '140px',
          background: 'linear-gradient(to bottom, transparent 0%, #f5f3ff 100%)',
        }}
      />
    </div>
  );
}
