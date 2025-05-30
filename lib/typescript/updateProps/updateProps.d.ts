import type { MutableRefObject } from 'react';
import type { AnimatedStyle, StyleProps } from '../commonTypes';
import type { Descriptor } from '../hook/commonTypes';
declare let updateProps: (viewDescriptors: ViewDescriptorsWrapper, updates: StyleProps | AnimatedStyle<any>, isAnimatedProps?: boolean) => void;
export declare const updatePropsJestWrapper: (viewDescriptors: ViewDescriptorsWrapper, updates: AnimatedStyle<any>, animatedValues: MutableRefObject<AnimatedStyle<any>>, adapters: ((updates: AnimatedStyle<any>) => void)[]) => void;
export default updateProps;
/**
 * This used to be `SharedValue<Descriptors[]>` but objects holding just a
 * single `value` prop are fine too.
 */
interface ViewDescriptorsWrapper {
    value: Readonly<Descriptor[]>;
}
//# sourceMappingURL=updateProps.d.ts.map