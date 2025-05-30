/// <reference types="react" />
import type { AnimatedComponentProps, AnimatedComponentRef, IAnimatedComponentInternal, INativeEventsManager, InitialComponentProps } from './commonTypes';
export declare class NativeEventsManager implements INativeEventsManager {
    #private;
    constructor(component: ManagedAnimatedComponent, options?: ComponentOptions);
    attachEvents(): void;
    detachEvents(): void;
    updateEvents(prevProps: AnimatedComponentProps<InitialComponentProps>): void;
    private getEventViewTag;
}
type ManagedAnimatedComponent = React.Component<AnimatedComponentProps<InitialComponentProps>> & IAnimatedComponentInternal;
type ComponentOptions = {
    setNativeProps: (ref: AnimatedComponentRef, props: InitialComponentProps) => void;
};
export {};
//# sourceMappingURL=NativeEventsManager.d.ts.map