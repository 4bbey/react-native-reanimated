'use strict';

import React, { useRef } from 'react';
import { FlatList } from 'react-native';
import { createAnimatedComponent } from "../createAnimatedComponent/index.js";
import { componentWithRef } from "../reactUtils.js";
import { LayoutAnimationConfig } from "./LayoutAnimationConfig.js";
import { AnimatedView } from "./View.js";
const AnimatedFlatList = createAnimatedComponent(FlatList);
const createCellRendererComponent = itemLayoutAnimationRef => {
  const CellRendererComponent = props => {
    return <AnimatedView
    // TODO TYPESCRIPT This is temporary cast is to get rid of .d.ts file.
    layout={itemLayoutAnimationRef?.current} onLayout={props.onLayout} style={props.style}>
        {props.children}
      </AnimatedView>;
  };
  return CellRendererComponent;
};

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.

// We need explicit any here, because this is the exact same type that is used in React Native types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FlatListForwardRefRender = function (props, ref) {
  const {
    itemLayoutAnimation,
    skipEnteringExitingAnimations,
    ...restProps
  } = props;

  // Set default scrollEventThrottle, because user expects
  // to have continuous scroll events and
  // react-native defaults it to 50 for FlatLists.
  // We set it to 1, so we have peace until
  // there are 960 fps screens.
  if (!('scrollEventThrottle' in restProps)) {
    restProps.scrollEventThrottle = 1;
  }
  const itemLayoutAnimationRef = useRef(itemLayoutAnimation);
  itemLayoutAnimationRef.current = itemLayoutAnimation;
  const CellRendererComponent = React.useMemo(() => createCellRendererComponent(itemLayoutAnimationRef), [itemLayoutAnimationRef]);
  const animatedFlatList =
  // @ts-expect-error In its current type state, createAnimatedComponent cannot create generic components.
  <AnimatedFlatList ref={ref} {...restProps} CellRendererComponent={CellRendererComponent} />;
  if (skipEnteringExitingAnimations === undefined) {
    return animatedFlatList;
  }
  return <LayoutAnimationConfig skipEntering skipExiting>
      {animatedFlatList}
    </LayoutAnimationConfig>;
};
export const ReanimatedFlatList = componentWithRef(FlatListForwardRefRender);
//# sourceMappingURL=FlatList.js.map