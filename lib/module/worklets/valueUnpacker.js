/* eslint-disable reanimated/use-reanimated-error */
'use strict';

import { isWorkletFunction } from "../commonTypes.js";
import { shouldBeUseWeb } from "../PlatformChecker.js";
function valueUnpacker(objectToUnpack, category, remoteFunctionName) {
  'worklet';

  let workletsCache = global.__workletsCache;
  let handleCache = global.__handleCache;
  if (workletsCache === undefined) {
    // init
    workletsCache = global.__workletsCache = new Map();
    handleCache = global.__handleCache = new WeakMap();
  }
  const workletHash = objectToUnpack.__workletHash;
  if (workletHash !== undefined) {
    let workletFun = workletsCache.get(workletHash);
    if (workletFun === undefined) {
      const initData = objectToUnpack.__initData;
      if (global.evalWithSourceMap) {
        // if the runtime (hermes only for now) supports loading source maps
        // we want to use the proper filename for the location as it guarantees
        // that debugger understands and loads the source code of the file where
        // the worklet is defined.
        workletFun = global.evalWithSourceMap('(' + initData.code + '\n)', initData.location, initData.sourceMap);
      } else if (global.evalWithSourceUrl) {
        // if the runtime doesn't support loading source maps, in dev mode we
        // can pass source url when evaluating the worklet. Now, instead of using
        // the actual file location we use worklet hash, as it the allows us to
        // properly symbolicate traces (see errors.ts for details)
        workletFun = global.evalWithSourceUrl('(' + initData.code + '\n)', `worklet_${workletHash}`);
      } else {
        // in release we use the regular eval to save on JSI calls
        // eslint-disable-next-line no-eval
        workletFun = eval('(' + initData.code + '\n)');
      }
      workletsCache.set(workletHash, workletFun);
    }
    const functionInstance = workletFun.bind(objectToUnpack);
    objectToUnpack._recur = functionInstance;
    return functionInstance;
  } else if (objectToUnpack.__init !== undefined) {
    let value = handleCache.get(objectToUnpack);
    if (value === undefined) {
      value = objectToUnpack.__init();
      handleCache.set(objectToUnpack, value);
    }
    return value;
  } else if (category === 'RemoteFunction') {
    const fun = () => {
      const label = remoteFunctionName ? `function \`${remoteFunctionName}\`` : 'anonymous function';
      throw new Error(`[Reanimated] Tried to synchronously call a non-worklet ${label} on the UI thread.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread for more details.`);
    };
    fun.__remoteFunction = objectToUnpack;
    return fun;
  } else {
    throw new Error(`[Reanimated] Data type in category "${category}" not recognized by value unpacker: "${_toString(objectToUnpack)}".`);
  }
}
if (__DEV__ && !shouldBeUseWeb()) {
  const testWorklet = () => {
    'worklet';
  };
  if (!isWorkletFunction(testWorklet)) {
    throw new Error(`[Reanimated] Failed to create a worklet. See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#failed-to-create-a-worklet for more details.`);
  }
  if (!isWorkletFunction(valueUnpacker)) {
    throw new Error('[Reanimated] `valueUnpacker` is not a worklet');
  }
  const closure = valueUnpacker.__closure;
  if (closure === undefined) {
    throw new Error('[Reanimated] `valueUnpacker` closure is undefined');
  }
  if (Object.keys(closure).length !== 0) {
    throw new Error('[Reanimated] `valueUnpacker` must have empty closure');
  }
}
export function getValueUnpackerCode() {
  return valueUnpacker.__initData.code;
}
//# sourceMappingURL=valueUnpacker.js.map