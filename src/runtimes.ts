'use strict';
import type { WorkletFunction } from './commonTypes';
import { isWorkletFunction } from './commonTypes';
import { ReanimatedError, registerReanimatedError } from './errors';
import { setupCallGuard, setupConsole } from './initializers';
import { registerLoggerConfig } from './logger';
import { shouldBeUseWeb } from './PlatformChecker';
import { ReanimatedModule } from './ReanimatedModule';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

export type WorkletRuntime = {
  __hostObjectWorkletRuntime: never;
  readonly name: string;
};

/**
 * Lets you create a new JS runtime which can be used to run worklets possibly
 * on different threads than JS or UI thread.
 *
 * @param name - A name used to identify the runtime which will appear in
 *   devices list in Chrome DevTools.
 * @param initializer - An optional worklet that will be run synchronously on
 *   the same thread immediately after the runtime is created.
 * @returns WorkletRuntime which is a
 *   `jsi::HostObject<reanimated::WorkletRuntime>` - {@link WorkletRuntime}
 * @see https://docs.swmansion.com/react-native-reanimated/docs/threading/createWorkletRuntime
 */
// @ts-expect-error Check `runOnUI` overload.
export function createWorkletRuntime(
  name: string,
  initializer?: () => void
): WorkletRuntime;

export function createWorkletRuntime(
  name: string,
  initializer?: WorkletFunction<[], void>
): WorkletRuntime {
  // Assign to a different variable as __reanimatedLoggerConfig is not a captured
  // identifier in the Worklet runtime.
  const config = __reanimatedLoggerConfig;
  return ReanimatedModule.createWorkletRuntime(
    name,
    makeShareableCloneRecursive(() => {
      'worklet';
      registerReanimatedError();
      registerLoggerConfig(config);
      setupCallGuard();
      setupConsole();
      initializer?.();
    })
  );
}

// @ts-expect-error Check `runOnUI` overload.
export function runOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue
): WorkletFunction<Args, ReturnValue>;
/** Schedule a worklet to execute on the background queue. */
export function runOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  'worklet';
  if (__DEV__ && !SHOULD_BE_USE_WEB && !isWorkletFunction(worklet)) {
    throw new ReanimatedError(
      'The function passed to `runOnRuntime` is not a worklet.' +
        (_WORKLET
          ? ' Please make sure that `processNestedWorklets` option in Reanimated Babel plugin is enabled.'
          : '')
    );
  }
  if (_WORKLET) {
    return (...args) =>
      global._scheduleOnRuntime(
        workletRuntime,
        makeShareableCloneOnUIRecursive(() => {
          'worklet';
          worklet(...args);
        })
      );
  }
  return (...args) =>
    ReanimatedModule.scheduleOnRuntime(
      workletRuntime,
      makeShareableCloneRecursive(() => {
        'worklet';
        worklet(...args);
      })
    );
}
