import type { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

export default function Html({ children }: PropsWithChildren) {
  return <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="theme-color" content="#f5f6f5" />
      <meta name="description" content="A daily money tracker. Set a monthly plan, get a daily spending target, and log as you go." />
      <ScrollViewStyleReset />
    </head>
    <body>{children}</body>
  </html>;
}
