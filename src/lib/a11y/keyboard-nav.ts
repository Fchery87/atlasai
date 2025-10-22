import * as React from "react";

/**
 * Keyboard Navigation Utilities
 * Provides comprehensive keyboard navigation support for interactive elements
 */

export type KeyboardNavOptions = {
  /** Elements to navigate within */
  container: HTMLElement | null;
  /** Selector for focusable elements */
  selector?: string;
  /** Enable loop navigation (wrap around) */
  loop?: boolean;
  /** Enable horizontal navigation (left/right arrows) */
  horizontal?: boolean;
  /** Enable vertical navigation (up/down arrows) */
  vertical?: boolean;
  /** Enable home/end keys */
  homeEnd?: boolean;
  /** Callback when focus changes */
  onFocusChange?: (element: HTMLElement, index: number) => void; // eslint-disable-line no-unused-vars
};

const DEFAULT_FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

/**
 * Setup keyboard navigation for a container element
 */
export function setupKeyboardNav(options: KeyboardNavOptions) {
  const {
    container,
    selector = DEFAULT_FOCUSABLE_SELECTOR,
    loop = true,
    horizontal = true,
    vertical = true,
    homeEnd = true,
    onFocusChange,
  } = options;

  if (!container) return () => {};

  const getFocusableElements = (): HTMLElement[] => {
    return Array.from(container.querySelectorAll(selector));
  };

  const getCurrentIndex = (): number => {
    const elements = getFocusableElements();
    const activeElement = document.activeElement as HTMLElement;
    return elements.indexOf(activeElement);
  };

  const focusElement = (index: number) => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    let targetIndex = index;
    if (loop) {
      targetIndex =
        ((index % elements.length) + elements.length) % elements.length;
    } else {
      targetIndex = Math.max(0, Math.min(index, elements.length - 1));
    }

    const element = elements[targetIndex];
    if (element) {
      element.focus();
      onFocusChange?.(element, targetIndex);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const currentIndex = getCurrentIndex();
    if (currentIndex === -1) return;

    let handled = false;

    switch (event.key) {
      case "ArrowRight":
        if (horizontal) {
          event.preventDefault();
          focusElement(currentIndex + 1);
          handled = true;
        }
        break;
      case "ArrowLeft":
        if (horizontal) {
          event.preventDefault();
          focusElement(currentIndex - 1);
          handled = true;
        }
        break;
      case "ArrowDown":
        if (vertical) {
          event.preventDefault();
          focusElement(currentIndex + 1);
          handled = true;
        }
        break;
      case "ArrowUp":
        if (vertical) {
          event.preventDefault();
          focusElement(currentIndex - 1);
          handled = true;
        }
        break;
      case "Home":
        if (homeEnd) {
          event.preventDefault();
          focusElement(0);
          handled = true;
        }
        break;
      case "End":
        if (homeEnd) {
          event.preventDefault();
          const elements = getFocusableElements();
          focusElement(elements.length - 1);
          handled = true;
        }
        break;
    }

    if (handled) {
      event.stopPropagation();
    }
  };

  container.addEventListener("keydown", handleKeyDown);

  return () => {
    container.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * Focus trap utility for modals and dialogs
 */
export function setupFocusTrap(element: HTMLElement | null) {
  if (!element) return () => {};

  const focusableSelector = DEFAULT_FOCUSABLE_SELECTOR;
  let previouslyFocused: HTMLElement | null = null;

  const getFocusableElements = (): HTMLElement[] => {
    return Array.from(element.querySelectorAll(focusableSelector));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift+Tab: move backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: move forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  // Save currently focused element
  previouslyFocused = document.activeElement as HTMLElement;

  // Focus first element
  const focusableElements = getFocusableElements();
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }

  element.addEventListener("keydown", handleKeyDown);

  return () => {
    element.removeEventListener("keydown", handleKeyDown);
    // Restore focus to previously focused element
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  };
}

/**
 * React hook for keyboard navigation
 */
export function useKeyboardNav(options: Omit<KeyboardNavOptions, "container">) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    return setupKeyboardNav({
      ...options,
      container: containerRef.current,
    });
  }, [options]);

  return containerRef;
}

/**
 * React hook for focus trap
 */
export function useFocusTrap(enabled: boolean = true) {
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!enabled) return;
    return setupFocusTrap(elementRef.current);
  }, [enabled]);

  return elementRef;
}
