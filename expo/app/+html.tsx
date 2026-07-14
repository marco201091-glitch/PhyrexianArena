import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

const responsiveRootCss = `
html, body, #root {
  width: 100%;
  height: 100%;
  min-height: 100%;
  margin: 0;
  background: #050508;
}

body {
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

button, input, textarea, [role='button'] {
  touch-action: manipulation;
}

@supports (height: 100dvh) {
  html, body, #root {
    height: 100dvh;
    min-height: 100dvh;
  }
}

@media (hover: hover) and (pointer: fine) {
  [role='button'] {
    cursor: pointer;
  }
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#050508" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveRootCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
