if ("serviceWorker" in navigator && window.isSecureContext) {
  const worker = new URL("sw.js", document.currentScript.src);
  navigator.serviceWorker.register(worker).catch(error => {
    console.warn("Expense Macros offline setup failed:", error);
  });
}
