/* based on:
 * https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/StyleSheet/processBoxShadow.js
 */
'use strict';

// @ts-ignore BoxShadowValue isn't available in RN 0.75
import type { BoxShadowValue, OpaqueColorValue } from 'react-native';

import type { StyleProps } from '.';
import { ReanimatedError } from './errors';

const isLength = (value: string) => {
  'worklet';
  return value.endsWith('px') || !isNaN(Number(value));
};

function parseBoxShadowString(rawBoxShadows: string): Array<BoxShadowValue> {
  'worklet';
  const result: Array<BoxShadowValue> = [];

  for (const rawBoxShadow of rawBoxShadows
    .split(/,(?![^()]*\))/) // split by comma that is not in parenthesis
    .map((bS) => bS.trim())
    .filter((bS) => bS !== '')) {
    const boxShadow: BoxShadowValue = {
      offsetX: 0,
      offsetY: 0,
    };
    let offsetX: number | string | null = null;
    let offsetY: number | string | null = null;
    let keywordDetectedAfterLength = false;

    let lengthCount = 0;

    // split rawBoxShadow string by all whitespaces that are not in parenthesis
    const args = rawBoxShadow.split(/\s+(?![^(]*\))/);
    for (const arg of args) {
      if (isLength(arg)) {
        switch (lengthCount) {
          case 0:
            offsetX = arg;
            lengthCount++;
            break;
          case 1:
            if (keywordDetectedAfterLength) {
              return [];
            }
            offsetY = arg;
            lengthCount++;
            break;
          case 2:
            if (keywordDetectedAfterLength) {
              return [];
            }
            boxShadow.blurRadius = arg;
            lengthCount++;
            break;
          case 3:
            if (keywordDetectedAfterLength) {
              return [];
            }
            boxShadow.spreadDistance = arg;
            lengthCount++;
            break;
          default:
            return [];
        }
      } else if (arg === 'inset') {
        if (boxShadow.inset) {
          return [];
        }
        if (offsetX !== null) {
          keywordDetectedAfterLength = true;
        }
        boxShadow.inset = true;
        continue;
      } else {
        if (boxShadow.color) {
          return [];
        }
        if (offsetX != null) {
          keywordDetectedAfterLength = true;
        }
        boxShadow.color = arg;
        continue;
      }
    }

    if (offsetX === null || offsetY === null) {
      return [];
    }

    boxShadow.offsetX = offsetX;
    boxShadow.offsetY = offsetY;

    result.push(boxShadow);
  }
  return result;
}

function parseLength(length: string): number | null {
  'worklet';
  // matches on args with units like "1.5 5% -80deg"
  const argsWithUnitsRegex = /([+-]?\d*(\.\d+)?)([\w\W]+)?/g;
  const match = argsWithUnitsRegex.exec(length);

  if (!match || !isLength(length)) {
    return null;
  }

  return Number(match[1]);
}

type ParsedBoxShadow = {
  offsetX: number;
  offsetY: number;
  blurRadius?: number | OpaqueColorValue;
  spreadDistance?: number;
  inset?: boolean;
  color?: string;
};

export function processBoxShadow(props: StyleProps) {
  'worklet';
  const result: Array<ParsedBoxShadow> = [];

  const rawBoxShadows = props.boxShadow;

  if (rawBoxShadows === null) {
    return result;
  }

  let boxShadowList: Array<BoxShadowValue>;

  if (typeof rawBoxShadows === 'string') {
    boxShadowList = parseBoxShadowString(rawBoxShadows.replace(/\n/g, ' '));
  } else if (Array.isArray(rawBoxShadows)) {
    boxShadowList = rawBoxShadows;
  } else {
    throw new ReanimatedError(
      `Box shadow value must be an array of shadow objects or a string. Received: ${JSON.stringify(rawBoxShadows)}`
    );
  }

  for (const rawBoxShadow of boxShadowList) {
    const parsedBoxShadow: ParsedBoxShadow = {
      offsetX: 0,
      offsetY: 0,
    };

    let value;
    for (const arg in rawBoxShadow) {
      switch (arg) {
        case 'offsetX':
          value =
            typeof rawBoxShadow.offsetX === 'string'
              ? parseLength(rawBoxShadow.offsetX)
              : rawBoxShadow.offsetX;
          if (value === null) {
            return [];
          }

          parsedBoxShadow.offsetX = value;
          break;
        case 'offsetY':
          value =
            typeof rawBoxShadow.offsetY === 'string'
              ? parseLength(rawBoxShadow.offsetY)
              : rawBoxShadow.offsetY;
          if (value === null) {
            return [];
          }

          parsedBoxShadow.offsetY = value;
          break;
        case 'spreadDistance':
          value =
            typeof rawBoxShadow.spreadDistance === 'string'
              ? parseLength(rawBoxShadow.spreadDistance)
              : rawBoxShadow.spreadDistance;
          if (value === null) {
            return [];
          }

          parsedBoxShadow.spreadDistance = value;
          break;
        case 'blurRadius':
          value =
            typeof rawBoxShadow.blurRadius === 'string'
              ? parseLength(rawBoxShadow.blurRadius)
              : (rawBoxShadow.blurRadius as number);
          if (value === null || value < 0) {
            return [];
          }

          parsedBoxShadow.blurRadius = value;
          break;
        case 'color':
          parsedBoxShadow.color = rawBoxShadow.color;
          break;
        case 'inset':
          parsedBoxShadow.inset = rawBoxShadow.inset;
      }
    }
    result.push(parsedBoxShadow);
  }
  props.boxShadow = result;
}
