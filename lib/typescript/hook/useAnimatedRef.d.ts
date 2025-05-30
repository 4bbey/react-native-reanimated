import type { Component } from 'react';
import type { AnimatedRef } from './commonTypes';
/**
 * Lets you get a reference of a view that you can use inside a worklet.
 *
 * @returns An object with a `.current` property which contains an instance of a
 *   component.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef
 */
export declare function useAnimatedRef<TComponent extends Component>(): AnimatedRef<TComponent>;
//# sourceMappingURL=useAnimatedRef.d.ts.map