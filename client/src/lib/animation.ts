import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const TIMING = {
  SLOW: 1.0,
  MEDIUM: 0.6,
  FAST: 0.2,
} as const;

export const EASE = "power3.out";

export const STAGGER = {
  TIGHT: 0.08,
  NORMAL: 0.12,
  LOOSE: 0.2,
} as const;

export const DELAY = {
  SHORT: 0.2,
  MEDIUM: 0.4,
  LONG: 0.6,
} as const;

export function createSectionTimeline(
  container: HTMLElement | null,
  options: {
    pin?: boolean;
    scrub?: boolean | number;
    start?: string;
    end?: string;
  } = {}
) {
  if (!container) return null;

  return gsap.timeline({
    scrollTrigger: {
      trigger: container,
      start: options.start || "top 70%",
      end: options.end || "bottom 30%",
      scrub: options.scrub ?? 1,
      pin: options.pin ?? false,
    },
  });
}

export function animateHeadline(
  element: HTMLElement | null,
  timeline: gsap.core.Timeline,
  position: number = 0
) {
  if (!element) return;
  gsap.set(element, { opacity: 0, y: 40 });
  timeline.to(element, {
    opacity: 1,
    y: 0,
    duration: TIMING.MEDIUM,
    ease: EASE,
  }, position);
}

export function animateSubtext(
  element: HTMLElement | null,
  timeline: gsap.core.Timeline,
  position: number = 0
) {
  if (!element) return;
  gsap.set(element, { opacity: 0, y: 30 });
  timeline.to(element, {
    opacity: 1,
    y: 0,
    duration: TIMING.MEDIUM,
    ease: EASE,
  }, position + DELAY.SHORT);
}

export function animateVisuals(
  elements: (HTMLElement | null)[],
  timeline: gsap.core.Timeline,
  position: number = 0
) {
  const validElements = elements.filter(Boolean);
  validElements.forEach((el) => {
    gsap.set(el, { opacity: 0, y: 30, scale: 0.95 });
  });
  timeline.to(validElements, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: TIMING.MEDIUM,
    ease: EASE,
    stagger: STAGGER.NORMAL,
  }, position + DELAY.MEDIUM);
}

export function animateCTA(
  element: HTMLElement | null,
  timeline: gsap.core.Timeline,
  position: number = 0
) {
  if (!element) return;
  gsap.set(element, { opacity: 0, y: 20 });
  timeline.to(element, {
    opacity: 1,
    y: 0,
    duration: TIMING.FAST,
    ease: EASE,
  }, position + DELAY.LONG);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setInitialState(
  elements: (HTMLElement | null)[],
  props: gsap.TweenVars
) {
  const valid = elements.filter(Boolean);
  valid.forEach((el) => gsap.set(el, props));
}
