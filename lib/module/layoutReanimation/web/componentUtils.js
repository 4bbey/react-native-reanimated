'use strict';

import { LayoutAnimationType, ReduceMotion } from "../../commonTypes.js";
import { EasingNameSymbol } from "../../Easing.js";
import { logger } from "../../logger/index.js";
import { _updatePropsJS } from "../../ReanimatedModule/js-reanimated/index.js";
import { ReducedMotionManager } from "../../ReducedMotion.js";
import { Keyframe } from "../animationBuilder/index.js";
import { setElementPosition, snapshots } from "./componentStyle.js";
import { Animations, TransitionType } from "./config.js";
import { TransitionGenerator } from "./createAnimation.js";
import { scheduleAnimationCleanup } from "./domUtils.js";
import { getEasingByName, WebEasings } from "./Easing.web.js";
import { prepareCurvedTransition } from "./transition/Curved.web.js";
function getEasingFromConfig(config) {
  if (!config.easingV) {
    return getEasingByName('linear');
  }
  const easingName = config.easingV[EasingNameSymbol];
  if (!(easingName in WebEasings)) {
    logger.warn(`Selected easing is not currently supported on web.`);
    return getEasingByName('linear');
  }
  return getEasingByName(easingName);
}
function getRandomDelay(maxDelay = 1000) {
  return Math.floor(Math.random() * (maxDelay + 1)) / 1000;
}
function getDelayFromConfig(config) {
  const shouldRandomizeDelay = config.randomizeDelay;
  const delay = shouldRandomizeDelay ? getRandomDelay() : 0;
  if (!config.delayV) {
    return delay;
  }
  return shouldRandomizeDelay ? getRandomDelay(config.delayV) : config.delayV / 1000;
}
export function getReducedMotionFromConfig(config) {
  if (!config.reduceMotionV) {
    return ReducedMotionManager.jsValue;
  }
  switch (config.reduceMotionV) {
    case ReduceMotion.Never:
      return false;
    case ReduceMotion.Always:
      return true;
    default:
      return ReducedMotionManager.jsValue;
  }
}
function getDurationFromConfig(config, animationName) {
  // Duration in keyframe has to be in seconds. However, when using `.duration()` modifier we pass it in miliseconds.
  // If `duration` was specified in config, we have to divide it by `1000`, otherwise we return value that is already in seconds.

  const defaultDuration = animationName in Animations ? Animations[animationName].duration : 0.3;
  return config.durationV !== undefined ? config.durationV / 1000 : defaultDuration;
}
function getCallbackFromConfig(config) {
  return config.callbackV !== undefined ? config.callbackV : null;
}
function getReversedFromConfig(config) {
  return !!config.reversed;
}
export function getProcessedConfig(animationName, animationType, config) {
  return {
    animationName,
    animationType,
    duration: getDurationFromConfig(config, animationName),
    delay: getDelayFromConfig(config),
    easing: getEasingFromConfig(config),
    callback: getCallbackFromConfig(config),
    reversed: getReversedFromConfig(config)
  };
}
export function maybeModifyStyleForKeyframe(element, config) {
  if (!(config instanceof Keyframe)) {
    return;
  }

  // We need to set `animationFillMode` to `forwards`, otherwise component will go back to its position.
  // This will result in wrong snapshot
  element.style.animationFillMode = 'forwards';
  for (const timestampRules of Object.values(config.definitions)) {
    if ('originX' in timestampRules || 'originY' in timestampRules) {
      element.style.position = 'absolute';
      return;
    }
  }
}
export function saveSnapshot(element) {
  const rect = element.getBoundingClientRect();
  const snapshot = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    scrollOffsets: getElementScrollValue(element)
  };
  snapshots.set(element, snapshot);
}
export function setElementAnimation(element, animationConfig, shouldSavePosition = false, parent = null) {
  const {
    animationName,
    duration,
    delay,
    easing
  } = animationConfig;
  const configureAnimation = () => {
    element.style.animationName = animationName;
    element.style.animationDuration = `${duration}s`;
    element.style.animationDelay = `${delay}s`;
    element.style.animationTimingFunction = easing;
  };
  if (animationConfig.animationType === LayoutAnimationType.ENTERING) {
    // On chrome sometimes entering animations flicker. This is most likely caused by animation being interrupted
    // by already started tasks. To avoid flickering, we use `requestAnimationFrame`, which will run callback right before repaint.
    requestAnimationFrame(configureAnimation);
  } else {
    configureAnimation();
  }
  element.onanimationend = () => {
    if (shouldSavePosition) {
      saveSnapshot(element);
    }
    if (parent?.contains(element)) {
      element.removedAfterAnimation = true;
      parent.removeChild(element);
    }
    animationConfig.callback?.(true);
    element.removeEventListener('animationcancel', animationCancelHandler);
  };
  const animationCancelHandler = () => {
    animationConfig.callback?.(false);
    if (parent?.contains(element)) {
      element.removedAfterAnimation = true;
      parent.removeChild(element);
    }
    element.removeEventListener('animationcancel', animationCancelHandler);
  };

  // Here we have to use `addEventListener` since element.onanimationcancel doesn't work on chrome
  element.onanimationstart = () => {
    if (animationConfig.animationType === LayoutAnimationType.ENTERING) {
      _updatePropsJS({
        visibility: 'initial'
      }, element);
    }
    element.addEventListener('animationcancel', animationCancelHandler);
  };
  if (!(animationName in Animations)) {
    scheduleAnimationCleanup(animationName, duration + delay, () => {
      if (shouldSavePosition) {
        setElementPosition(element, snapshots.get(element));
      }
    });
  }
}
export function handleLayoutTransition(element, animationConfig, transitionData) {
  const {
    animationName
  } = animationConfig;
  let animationType;
  switch (animationName) {
    case 'LinearTransition':
      animationType = TransitionType.LINEAR;
      break;
    case 'SequencedTransition':
      animationType = TransitionType.SEQUENCED;
      break;
    case 'FadingTransition':
      animationType = TransitionType.FADING;
      break;
    case 'JumpingTransition':
      animationType = TransitionType.JUMPING;
      break;
    case 'CurvedTransition':
      animationType = TransitionType.CURVED;
      break;
    case 'EntryExitTransition':
      animationType = TransitionType.ENTRY_EXIT;
      break;
    default:
      animationType = TransitionType.LINEAR;
      break;
  }
  const {
    transitionKeyframeName,
    dummyTransitionKeyframeName
  } = TransitionGenerator(animationType, transitionData);
  animationConfig.animationName = transitionKeyframeName;
  if (animationType === TransitionType.CURVED) {
    const {
      dummy,
      dummyAnimationConfig
    } = prepareCurvedTransition(element, animationConfig, transitionData, dummyTransitionKeyframeName // In `CurvedTransition` it cannot be undefined
    );
    setElementAnimation(dummy, dummyAnimationConfig);
  }
  setElementAnimation(element, animationConfig);
}
function getElementScrollValue(element) {
  let current = element;
  const scrollOffsets = {
    scrollTopOffset: 0,
    scrollLeftOffset: 0
  };
  while (current) {
    if (current.scrollTop !== 0 && scrollOffsets.scrollTopOffset === 0) {
      scrollOffsets.scrollTopOffset = current.scrollTop;
    }
    if (current.scrollLeft !== 0 && scrollOffsets.scrollLeftOffset === 0) {
      scrollOffsets.scrollLeftOffset = current.scrollLeft;
    }
    current = current.parentElement;
  }
  return scrollOffsets;
}
export function handleExitingAnimation(element, animationConfig) {
  const parent = element.offsetParent;
  const dummy = element.cloneNode();
  dummy.reanimatedDummy = true;
  element.style.animationName = '';
  dummy.style.animationName = '';

  // After cloning the element, we want to move all children from original element to its clone. This is because original element
  // will be unmounted, therefore when this code executes in child component, parent will be either empty or removed soon.
  // Using element.cloneNode(true) doesn't solve the problem, because it creates copy of children and we won't be able to set their animations
  //
  // This loop works because appendChild() moves element into its new parent instead of copying it
  while (element.firstChild) {
    dummy.appendChild(element.firstChild);
  }
  parent?.appendChild(dummy);
  const snapshot = snapshots.get(element);
  const scrollOffsets = getElementScrollValue(element);

  // Scroll does not trigger snapshotting, therefore if we start exiting animation after
  // scrolling through parent component, dummy will end up in wrong place. In order to fix that
  // we keep last known scroll position in snapshot and then adjust dummy position based on
  // last known scroll offset and current scroll offset

  const currentScrollTopOffset = scrollOffsets.scrollTopOffset;
  const lastScrollTopOffset = snapshot.scrollOffsets.scrollTopOffset;
  if (currentScrollTopOffset !== lastScrollTopOffset) {
    snapshot.top += lastScrollTopOffset - currentScrollTopOffset;
  }
  const currentScrollLeftOffset = scrollOffsets.scrollLeftOffset;
  const lastScrollLeftOffset = snapshot.scrollOffsets.scrollLeftOffset;
  if (currentScrollLeftOffset !== lastScrollLeftOffset) {
    snapshot.left += lastScrollLeftOffset - currentScrollLeftOffset;
  }
  snapshots.set(dummy, snapshot);
  setElementPosition(dummy, snapshot);
  setElementAnimation(dummy, animationConfig, false, parent);
}
//# sourceMappingURL=componentUtils.js.map