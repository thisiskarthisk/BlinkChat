import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover exposes safe-area-inset-* CSS env vars (notch/punch-hole support).
            interactive-widget=resizes-content: when the on-screen keyboard opens,
            the browser shrinks the visual viewport (and the CSS 100dvh value) so
            the chat input bar stays pinned at the bottom of the visible area —
            WhatsApp-style keyboard behaviour for PWA / Chrome on Android. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, user-scalable=no, interactive-widget=resizes-content" />

        {/* iOS PWA compatibility tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BlinkChat" />
        <link rel="apple-touch-icon" href="/icon.png" />

        {/* Link to manifest.json */}
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          /* ── CSS custom properties: expose the OS status-bar / notch insets
             so that individual elements (e.g. the chat header) can absorb
             them via var(--sat) without relying on body padding (which causes
             a visible white gap behind the fixed header in standalone mode). */
          :root {
            --sat: env(safe-area-inset-top, 0px);
            --sar: env(safe-area-inset-right, 0px);
            --sab: env(safe-area-inset-bottom, 0px);
            --sal: env(safe-area-inset-left, 0px);
          }

          html, body {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            height: 100dvh !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            /* ❌ Do NOT add padding-top for standalone mode here.
               Body padding creates a coloured gap behind the app header.
               The chat header itself absorbs the safe area via padding-top. */
          }

          /* Support Safe Area padding-top dynamically on web for PWA standalone mode */
          [data-name="app-header"] {
            padding-top: calc(env(safe-area-inset-top, 0px) + 14px) !important;
          }
          [data-name="app-header-home"] {
            padding-top: calc(env(safe-area-inset-top, 0px) + 16px) !important;
          }
          [data-name="app-header-dashboard"] {
            padding-top: env(safe-area-inset-top, 0px) !important;
            height: calc(60px + env(safe-area-inset-top, 0px)) !important;
          }
          [data-name="app-header-profile"] {
            padding-top: env(safe-area-inset-top, 0px) !important;
            height: calc(60px + env(safe-area-inset-top, 0px)) !important;
          }
          [data-name="app-safe-area-container"] {
            padding-top: env(safe-area-inset-top, 0px) !important;
          }

          /* ── WhatsApp-style keyboard: when keyboard appears the
             viewport height (100dvh) shrinks so the message list
             collapses above the input bar, which stays anchored at the
             bottom. No JS involvement needed on Android Chrome.
             On iOS Safari / iOS PWA, "interactive-widget" is not
             supported; the JS in the chat component applies an
             explicit height from visualViewport instead. */
          #root, [data-expo-root-component] {
            height: 100%;
            height: 100dvh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }



          /* Smooth height transitions when keyboard opens/closes.
             The JS sets an explicit height on the chat container via
             visualViewport — this CSS transition makes that change
             animate over 280ms instead of snapping instantly. */
          [data-testid="chat-container"] {
            transition: height 0.28s ease-out, max-height 0.28s ease-out !important;
          }

          /* Remove browser blue focus outline on all elements */
          *, *::before, *::after {
            outline: none !important;
            -webkit-tap-highlight-color: transparent !important;
            -webkit-touch-callout: none !important;
            box-shadow: none !important;
          }

          /* Remove focus ring on interactive elements */
          input:focus,
          textarea:focus,
          select:focus,
          button:focus,
          [role="button"]:focus,
          a:focus {
            outline: none !important;
            box-shadow: none !important;
            border-color: inherit !important;
          }

          /* Remove blue flash on tap for iOS/Android Chrome */
          input, textarea, button, a, div, span {
            -webkit-tap-highlight-color: rgba(0, 0, 0, 0) !important;
          }
        ` }} />

        {/* Read the CSS env(safe-area-inset-top) pixel value at boot time and
            store it as window.__SAFE_AREA_TOP__ so React Native web components
            can read it synchronously (e.g. to set paddingTop on the chat header
            without needing react-native-safe-area-context on web). */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var el = document.createElement('div');
              el.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);left:0;width:0;height:0;pointer-events:none;visibility:hidden;';
              document.documentElement.appendChild(el);
              window.__SAFE_AREA_TOP__ = parseFloat(getComputedStyle(el).top) || 0;
              document.documentElement.removeChild(el);

              // Prevent browser from scrolling the body when inputs are focused (PWA/mobile web)
              var preventScroll = function() {
                if (window.scrollY > 0 || window.scrollX > 0 || document.documentElement.scrollTop > 0 || document.body.scrollTop > 0) {
                  window.scrollTo(0, 0);
                  document.body.scrollTop = 0;
                  document.documentElement.scrollTop = 0;
                }
              };
              
              document.addEventListener('focusin', function() {
                setTimeout(preventScroll, 50);
                setTimeout(preventScroll, 150);
              }, true);
            } catch(e) {
              window.__SAFE_AREA_TOP__ = 0;
            }
          })();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
