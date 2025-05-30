'use strict';

// this is just a temporary mock

export let LayoutAnimationType = /*#__PURE__*/function (LayoutAnimationType) {
  LayoutAnimationType[LayoutAnimationType["ENTERING"] = 1] = "ENTERING";
  LayoutAnimationType[LayoutAnimationType["EXITING"] = 2] = "EXITING";
  LayoutAnimationType[LayoutAnimationType["LAYOUT"] = 3] = "LAYOUT";
  LayoutAnimationType[LayoutAnimationType["SHARED_ELEMENT_TRANSITION"] = 4] = "SHARED_ELEMENT_TRANSITION";
  LayoutAnimationType[LayoutAnimationType["SHARED_ELEMENT_TRANSITION_PROGRESS"] = 5] = "SHARED_ELEMENT_TRANSITION_PROGRESS";
  return LayoutAnimationType;
}({});
/**
 * Used to configure the `.defaultTransitionType()` shared transition modifier.
 *
 * @experimental
 */
export let SharedTransitionType = /*#__PURE__*/function (SharedTransitionType) {
  SharedTransitionType["ANIMATION"] = "animation";
  SharedTransitionType["PROGRESS_ANIMATION"] = "progressAnimation";
  return SharedTransitionType;
}({});

/**
 * A value that can be used both on the [JavaScript
 * thread](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#javascript-thread)
 * and the [UI
 * thread](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#ui-thread).
 *
 * Shared values are defined using
 * [useSharedValue](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue)
 * hook. You access and modify shared values by their `.value` property.
 */

/**
 * Due to pattern of `MaybeSharedValue` type present in `AnimatedProps`
 * (`AnimatedStyle`), contravariance breaks types for animated styles etc.
 * Instead of refactoring the code with small chances of success, we just
 * disable contravariance for `SharedValue` in this problematic case.
 */

// The below type is used for HostObjects returned by the JSI API that don't have
// any accessible fields or methods but can carry data that is accessed from the
// c++ side. We add a field to the type to make it possible for typescript to recognize
// which JSI methods accept those types as arguments and to be able to correctly type
// check other methods that may use them. However, this field is not actually defined
// nor should be used for anything else as assigning any data to those objects will
// throw an error.

// In case of objects with depth or arrays of objects or arrays of arrays etc.
// we add this utility type that makes it a `SharaebleRef` of the outermost type.

/**
 * This function allows you to determine if a given function is a worklet. It
 * only works with Reanimated Babel plugin enabled. Unless you are doing
 * something with internals of Reanimated you shouldn't need to use this
 * function.
 *
 * ### Note
 *
 * Do not call it before the worklet is declared, as it will always return false
 * then. E.g.:
 *
 * ```ts
 * isWorkletFunction(myWorklet); // Will always return false.
 *
 * function myWorklet() {
 *   'worklet';
 * }
 * ```
 *
 * ### Maintainer note
 *
 * This function is supposed to be used only in the React Runtime. It always
 * returns `false` in Worklet Runtimes.
 */
export function isWorkletFunction(value) {
  'worklet';

  // Since host objects always return true for `in` operator, we have to use dot notation to check if the property exists.
  // See https://github.com/facebook/hermes/blob/340726ef8cf666a7cce75bc60b02fa56b3e54560/lib/VM/JSObject.cpp#L1276.
  return (
    // `__workletHash` isn't extracted in Worklet Runtimes.
    typeof value === 'function' && !!value.__workletHash
  );
}
export let SensorType = /*#__PURE__*/function (SensorType) {
  SensorType[SensorType["ACCELEROMETER"] = 1] = "ACCELEROMETER";
  SensorType[SensorType["GYROSCOPE"] = 2] = "GYROSCOPE";
  SensorType[SensorType["GRAVITY"] = 3] = "GRAVITY";
  SensorType[SensorType["MAGNETIC_FIELD"] = 4] = "MAGNETIC_FIELD";
  SensorType[SensorType["ROTATION"] = 5] = "ROTATION";
  return SensorType;
}({});
export let IOSReferenceFrame = /*#__PURE__*/function (IOSReferenceFrame) {
  IOSReferenceFrame[IOSReferenceFrame["XArbitraryZVertical"] = 0] = "XArbitraryZVertical";
  IOSReferenceFrame[IOSReferenceFrame["XArbitraryCorrectedZVertical"] = 1] = "XArbitraryCorrectedZVertical";
  IOSReferenceFrame[IOSReferenceFrame["XMagneticNorthZVertical"] = 2] = "XMagneticNorthZVertical";
  IOSReferenceFrame[IOSReferenceFrame["XTrueNorthZVertical"] = 3] = "XTrueNorthZVertical";
  IOSReferenceFrame[IOSReferenceFrame["Auto"] = 4] = "Auto";
  return IOSReferenceFrame;
}({});

/**
 * A function called upon animation completion. If the animation is cancelled,
 * the callback will receive `false` as the argument; otherwise, it will receive
 * `true`.
 */

export let InterfaceOrientation = /*#__PURE__*/function (InterfaceOrientation) {
  InterfaceOrientation[InterfaceOrientation["ROTATION_0"] = 0] = "ROTATION_0";
  InterfaceOrientation[InterfaceOrientation["ROTATION_90"] = 90] = "ROTATION_90";
  InterfaceOrientation[InterfaceOrientation["ROTATION_180"] = 180] = "ROTATION_180";
  InterfaceOrientation[InterfaceOrientation["ROTATION_270"] = 270] = "ROTATION_270";
  return InterfaceOrientation;
}({});
export let KeyboardState = /*#__PURE__*/function (KeyboardState) {
  KeyboardState[KeyboardState["UNKNOWN"] = 0] = "UNKNOWN";
  KeyboardState[KeyboardState["OPENING"] = 1] = "OPENING";
  KeyboardState[KeyboardState["OPEN"] = 2] = "OPEN";
  KeyboardState[KeyboardState["CLOSING"] = 3] = "CLOSING";
  KeyboardState[KeyboardState["CLOSED"] = 4] = "CLOSED";
  return KeyboardState;
}({});

/**
 * @param x - A number representing X coordinate relative to the parent
 *   component.
 * @param y - A number representing Y coordinate relative to the parent
 *   component.
 * @param width - A number representing the width of the component.
 * @param height - A number representing the height of the component.
 * @param pageX - A number representing X coordinate relative to the screen.
 * @param pageY - A number representing Y coordinate relative to the screen.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/measure#returns
 */

/**
 * @param System - If the `Reduce motion` accessibility setting is enabled on
 *   the device, disable the animation. Otherwise, enable the animation.
 * @param Always - Disable the animation.
 * @param Never - Enable the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility
 */
export let ReduceMotion = /*#__PURE__*/function (ReduceMotion) {
  ReduceMotion["System"] = "system";
  ReduceMotion["Always"] = "always";
  ReduceMotion["Never"] = "never";
  return ReduceMotion;
}({});

// Ideally we want AnimatedStyle to not be generic, but there are
// so many dependencies on it being generic that it's not feasible at the moment.

/** @deprecated Please use {@link AnimatedStyle} type instead. */

/** @deprecated This type is no longer relevant. */
//# sourceMappingURL=commonTypes.js.map