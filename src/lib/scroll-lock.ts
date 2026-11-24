// Page scroll lock for modals. Smooth scroll (Lenis, landing only) listens for
// SCROLL_LOCK_EVENT and stops/starts itself; native scroll is locked on <html>.

export const SCROLL_LOCK_EVENT = "hfa:scroll-lock";

let locked = false;
let previousOverflow = "";

export function isScrollLocked() {
  return locked;
}

export function setScrollLock(on: boolean) {
  if (on === locked) return;
  locked = on;
  const html = document.documentElement;
  if (on) {
    previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
  } else {
    html.style.overflow = previousOverflow;
  }
  window.dispatchEvent(new CustomEvent<boolean>(SCROLL_LOCK_EVENT, { detail: on }));
}
