/**
 * PWA Service Worker Registration
 * Handles service worker lifecycle and updates
 */

export type UpdateCallback = (registration: ServiceWorkerRegistration) => void; // eslint-disable-line no-unused-vars

let updateCallback: UpdateCallback | null = null;

/**
 * Register the service worker
 */
export async function registerServiceWorker(onUpdate?: UpdateCallback) {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers are not supported");
    return null;
  }

  if (onUpdate) {
    updateCallback = onUpdate;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("Service worker registered:", registration.scope);

    // Check for updates periodically
    setInterval(
      () => {
        registration.update();
      },
      60 * 60 * 1000,
    ); // Check every hour

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          // New service worker available
          console.log("New service worker available");
          if (updateCallback) {
            updateCallback(registration);
          }
        }
      });
    });

    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const unregistered = await registration.unregister();
    console.log("Service worker unregistered:", unregistered);
    return unregistered;
  } catch (error) {
    console.error("Service worker unregistration failed:", error);
    return false;
  }
}

/**
 * Skip waiting and activate new service worker immediately
 */
export function skipWaiting() {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    return;
  }

  navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
  window.location.reload();
}

/**
 * Clear all caches
 */
export async function clearCaches() {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    return false;
  }

  try {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage({ type: "CLEAR_CACHE" });
    }

    // Also clear cache storage directly
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    console.log("Caches cleared");
    return true;
  } catch (error) {
    console.error("Failed to clear caches:", error);
    return false;
  }
}

/**
 * Get service worker version
 */
export async function getVersion(): Promise<string | null> {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    return null;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data && event.data.type === "VERSION") {
        resolve(event.data.version);
      } else {
        resolve(null);
      }
    };

    navigator.serviceWorker.controller.postMessage({ type: "GET_VERSION" }, [
      messageChannel.port2,
    ]);

    // Timeout after 5 seconds
    setTimeout(() => resolve(null), 5000);
  });
}

/**
 * Check if app is running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

/**
 * Check if app can be installed (installable PWA)
 */
export function isInstallable(): boolean {
  return "serviceWorker" in navigator && "BeforeInstallPromptEvent" in window;
}

/**
 * Prompt user to install PWA
 */
let deferredPrompt: any = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn("Install prompt not available");
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User ${outcome} the install prompt`);
    deferredPrompt = null;
    return outcome === "accepted";
  } catch (error) {
    console.error("Install prompt failed:", error);
    return false;
  }
}

/**
 * Listen for app installed event
 */
export function onInstalled(callback: () => void) {
  window.addEventListener("appinstalled", () => {
    console.log("PWA installed");
    callback();
  });
}
