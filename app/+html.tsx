import type { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

export default function Html({ children }: PropsWithChildren) {
  return <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="theme-color" content="#f3f6f4" />
      <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('expense_macros_appearance')==='dark'){document.documentElement.style.backgroundColor='#101412';var m=document.querySelector('meta[name=\"theme-color\"]');if(m)m.setAttribute('content','#101412');}}catch(e){}" }} />
      <meta name="description" content="A daily money tracker. Set a monthly plan, get a daily spending target, and log as you go." />
      <ScrollViewStyleReset />
    </head>
    <body>{children}</body>
  </html>;
}
