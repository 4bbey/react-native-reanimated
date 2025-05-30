/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */
'use strict';

// This file works by accident - currently Builder Bob doesn't move `.d.ts` files to output types.
// If it ever breaks, we should address it so we'd not pollute the user's global namespace.

import type {
  FlatShareableRef,
  MapperRegistry,
  MeasuredDimensions,
  ShadowNodeWrapper,
  ShareableRef,
  StyleProps,
} from './commonTypes';
import type { FrameCallbackRegistryUI } from './frameCallback/FrameCallbackRegistryUI';
import type { AnimatedStyle } from './helperTypes';
import type { callGuardDEV } from './initializers';
import type { LayoutAnimationsManager } from './layoutReanimation/animationsManager';
import type { ProgressTransitionRegister } from './layoutReanimation/sharedTransitions';
import type { LoggerConfigInternal } from './logger';
import type { ReanimatedModuleProxy } from './ReanimatedModule';
import type { WorkletRuntime } from './runtimes';
import type { RNScreensTurboModuleType } from './screenTransition/commonTypes';
import type { SensorContainer } from './SensorContainer';
import type { UpdatePropsManager } from './UpdateProps';
import type { WorkletsModuleProxy } from './worklets';

declare global {
  var _REANIMATED_IS_REDUCED_MOTION: boolean | undefined;
  var _IS_FABRIC: boolean | undefined;
  var _REANIMATED_VERSION_CPP: string | undefined;
  var _REANIMATED_VERSION_JS: string | undefined;
  var __workletsModuleProxy: WorkletsModuleProxy | undefined;
  var __reanimatedModuleProxy: ReanimatedModuleProxy | undefined;
  var __callGuardDEV: typeof callGuardDEV | undefined;
  var evalWithSourceMap:
    | ((js: string, sourceURL: string, sourceMap: string) => any)
    | undefined;
  var evalWithSourceUrl: ((js: string, sourceURL: string) => any) | undefined;
  var _log: (value: unknown) => void;
  var _toString: (value: unknown) => string;
  var _notifyAboutProgress: (
    tag: number,
    value: Record<string, unknown>,
    isSharedTransition: boolean
  ) => void;
  var _registriesLeakCheck: () => string;
  var _notifyAboutEnd: (tag: number, removeView: boolean) => void;
  var _setGestureState: (handlerTag: number, newState: number) => void;
  var _makeShareableClone: <T>(
    value: T,
    nativeStateSource?: object
  ) => FlatShareableRef<T>;
  var _scheduleHostFunctionOnJS: (fun: (...args: A) => R, args?: A) => void;
  var _scheduleRemoteFunctionOnJS: (fun: (...args: A) => R, args?: A) => void;
  var _scheduleOnRuntime: (
    runtime: WorkletRuntime,
    worklet: ShareableRef<() => void>
  ) => void;
  var _updatePropsPaper:
    | ((
        operations: {
          tag: number;
          name: string | null;
          // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
          updates: StyleProps | AnimatedStyle<any>;
        }[]
      ) => void)
    | undefined;
  var _updatePropsFabric:
    | ((
        operations: {
          shadowNodeWrapper: ShadowNodeWrapper;
          // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
          updates: StyleProps | AnimatedStyle<any>;
        }[]
      ) => void)
    | undefined;
  var _measurePaper:
    | ((viewTag: number | null) => MeasuredDimensions)
    | undefined;
  var _measureFabric:
    | ((shadowNodeWrapper: ShadowNodeWrapper | null) => MeasuredDimensions)
    | undefined;
  var _scrollToPaper:
    | ((viewTag: number, x: number, y: number, animated: boolean) => void)
    | undefined;
  var _dispatchCommandPaper:
    | ((viewTag: number, commandName: string, args: Array<unknown>) => void)
    | undefined;
  var _dispatchCommandFabric:
    | ((
        shadowNodeWrapper: ShadowNodeWrapper,
        commandName: string,
        args: Array<unknown>
      ) => void)
    | undefined;
  var _getAnimationTimestamp: () => number;
  var __ErrorUtils: {
    reportFatalError: (error: Error) => void;
  };
  var _frameCallbackRegistry: FrameCallbackRegistryUI;
  var console: Console;
  var __frameTimestamp: number | undefined;
  var __flushAnimationFrame: (timestamp: number) => void;
  var __workletsCache: Map<string, any>;
  var __handleCache: WeakMap<object, any>;
  var __callMicrotasks: () => void;
  var __mapperRegistry: MapperRegistry;
  var __sensorContainer: SensorContainer;
  var _maybeFlushUIUpdatesQueue: () => void;
  var LayoutAnimationsManager: LayoutAnimationsManager;
  var UpdatePropsManager: UpdatePropsManager;
  var ProgressTransitionRegister: ProgressTransitionRegister;
  var updateJSProps: (viewTag: number, props: Record<string, unknown>) => void;
  var RNScreensTurboModule: RNScreensTurboModuleType | undefined;
  var _obtainPropPaper: (viewTag: number, propName: string) => string;
  var _obtainPropFabric: (
    shadowNodeWrapper: ShadowNodeWrapper,
    propName: string
  ) => string;
  var __reanimatedLoggerConfig: LoggerConfigInternal;
}
