import { ComponentType, lazy, LazyExoticComponent } from "react";

export type PreloadableComponent<T extends ComponentType<any>> =
  LazyExoticComponent<T> & { preload: () => Promise<{ default: T }> };

/**
 * Like React.lazy, but the returned component has a `.preload()` method
 * that triggers the dynamic import early (idle / hover). Subsequent
 * Suspense renders reuse the in-flight promise.
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): PreloadableComponent<T> {
  let promise: Promise<{ default: T }> | null = null;
  const load = () => {
    if (!promise) promise = factory();
    return promise;
  };
  const Component = lazy(load) as PreloadableComponent<T>;
  Component.preload = load;
  return Component;
}
