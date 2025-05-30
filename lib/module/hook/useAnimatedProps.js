'use strict';

import { shouldBeUseWeb } from "../PlatformChecker.js";
import { useAnimatedStyle } from "./useAnimatedStyle.js";

// TODO: we should make sure that when useAP is used we are not assigning styles

function useAnimatedPropsJS(updater, deps, adapters) {
  return useAnimatedStyle(updater, deps, adapters, true);
}
const useAnimatedPropsNative = useAnimatedStyle;

/**
 * Lets you create an animated props object which can be animated using shared
 * values.
 *
 * @param updater - A function returning an object with properties you want to
 *   animate.
 * @param dependencies - An optional array of dependencies. Only relevant when
 *   using Reanimated without the Babel plugin on the Web.
 * @param adapters - An optional function or array of functions allowing to
 *   adopt prop naming between JS and the native side.
 * @returns An animated props object which has to be passed to `animatedProps`
 *   property of an Animated component that you want to animate.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps
 */
export const useAnimatedProps = shouldBeUseWeb() ? useAnimatedPropsJS : useAnimatedPropsNative;
//# sourceMappingURL=useAnimatedProps.js.map