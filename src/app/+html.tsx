
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-PT">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#208AEF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-title"
          content="Conecta Minho"
        />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <meta
          name="description"
          content="Conecta Minho â€” serviÃ§os, profissionais e oportunidades perto de ti."
        />
        <link rel="icon" type="image/png" href="/favicon.ico" />

        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <ScrollViewStyleReset />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker
                    .register('/service-worker.js')
                    .then(function (registration) {
                      console.log(
                        'Conecta Minho: service worker registado.',
                        registration.scope
                      );
                    })
                    .catch(function (error) {
                      console.error(
                        'Erro ao registar o service worker:',
                        error
                      );
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}



