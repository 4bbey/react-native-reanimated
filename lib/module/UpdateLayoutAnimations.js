'use strict';

import { configureLayoutAnimationBatch, makeShareableCloneRecursive } from "./core.js";
import { isFabric, shouldBeUseWeb } from "./PlatformChecker.js";
function createUpdateManager() {
  const animations = [];
  // When a stack is rerendered we reconfigure all the shared elements.
  // To do that we want them to appear in our batch in the correct order,
  // so we defer some of the updates to appear at the end of the batch.
  const deferredAnimations = [];
  return {
    update(batchItem, isUnmounting) {
      if (isUnmounting) {
        deferredAnimations.push(batchItem);
      } else {
        animations.push(batchItem);
      }
      if (animations.length + deferredAnimations.length === 1) {
        isFabric() ? this.flush() : setImmediate(this.flush);
      }
    },
    flush() {
      configureLayoutAnimationBatch(animations.concat(deferredAnimations));
      animations.length = 0;
      deferredAnimations.length = 0;
    }
  };
}

/**
 * Lets you update the current configuration of the layout animation or shared
 * element transition for a given component. Configurations are batched and
 * applied at the end of the current execution block, right before sending the
 * response back to native.
 *
 * @param viewTag - The tag of the component you'd like to configure.
 * @param type - The type of the animation you'd like to configure -
 *   {@link LayoutAnimationType}.
 * @param config - The animation configuration - {@link LayoutAnimationFunction},
 *   {@link SharedTransitionAnimationsFunction}, {@link ProgressAnimationCallback}
 *   or {@link Keyframe}. Passing `undefined` will remove the animation.
 * @param sharedTransitionTag - The tag of the shared element transition you'd
 *   like to configure. Passing `undefined` will remove the transition.
 * @param isUnmounting - Determines whether the configuration should be included
 *   at the end of the batch, after all the non-deferred configurations (even
 *   those that were updated later). This is used to retain the correct ordering
 *   of shared elements. Defaults to `false`.
 */
export let updateLayoutAnimations;
if (shouldBeUseWeb()) {
  updateLayoutAnimations = () => {
    // no-op
  };
} else {
  const updateLayoutAnimationsManager = createUpdateManager();
  updateLayoutAnimations = (viewTag, type, config, sharedTransitionTag, isUnmounting) => updateLayoutAnimationsManager.update({
    viewTag,
    type,
    config: config ? makeShareableCloneRecursive(config) : undefined,
    sharedTransitionTag
  }, isUnmounting);
}
//# sourceMappingURL=UpdateLayoutAnimations.js.map