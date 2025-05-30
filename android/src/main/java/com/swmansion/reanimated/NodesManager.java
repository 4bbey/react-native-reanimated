package com.swmansion.reanimated;

import static java.lang.Float.NaN;

import android.graphics.drawable.Drawable;
import android.os.SystemClock;
import android.view.View;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.GuardedRunnable;
import com.facebook.react.bridge.JavaOnlyMap;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.modules.core.ReactChoreographer;
import com.facebook.react.uimanager.GuardedFrameCallback;
import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.PixelUtil;
import com.facebook.react.uimanager.ReactShadowNode;
import com.facebook.react.uimanager.ReactStylesDiffMap;
import com.facebook.react.uimanager.UIImplementation;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.UIManagerReanimatedHelper;
import com.facebook.react.uimanager.common.UIManagerType;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.EventDispatcher;
import com.facebook.react.uimanager.events.EventDispatcherListener;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.swmansion.reanimated.layoutReanimation.AnimationsManager;
import com.swmansion.reanimated.nativeProxy.NoopEventHandler;
import com.swmansion.worklets.WorkletsModule;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.annotation.Nullable;

public class NodesManager implements EventDispatcherListener {

  private Long mFirstUptime = SystemClock.uptimeMillis();
  private boolean mSlowAnimationsEnabled = false;
  private int mAnimationsDragFactor;

  public void scrollTo(int viewTag, double x, double y, boolean animated) {
    View view;
    try {
      view = mUIManager.resolveView(viewTag);
    } catch (IllegalViewOperationException e) {
      e.printStackTrace();
      return;
    }
    NativeMethodsHelper.scrollTo(view, x, y, animated);
  }

  public void dispatchCommand(int viewTag, String commandId, ReadableArray commandArgs) {
    // mUIManager.dispatchCommand must be called from native modules queue thread
    // because of an assert in ShadowNodeRegistry.getNode
    mContext.runOnNativeModulesQueueThread(
        new GuardedRunnable(mContext.getExceptionHandler()) {
          @Override
          public void runGuarded() {
            mUIManager.dispatchCommand(viewTag, commandId, commandArgs);
          }
        });
  }

  public float[] measure(int viewTag) {
    View view;
    try {
      view = mUIManager.resolveView(viewTag);
    } catch (IllegalViewOperationException e) {
      e.printStackTrace();
      return (new float[] {NaN, NaN, NaN, NaN, NaN, NaN});
    }
    return NativeMethodsHelper.measure(view);
  }

  public interface OnAnimationFrame {
    void onAnimationFrame(double timestampMs);
  }

  private final WorkletsModule mWorkletsModule;
  private final AnimationsManager mAnimationManager;
  private final UIImplementation mUIImplementation;
  private final DeviceEventManagerModule.RCTDeviceEventEmitter mEventEmitter;
  private final ReactChoreographer mReactChoreographer;
  private final GuardedFrameCallback mChoreographerCallback;
  protected final UIManagerModule.CustomEventNamesResolver mCustomEventNamesResolver;
  private final AtomicBoolean mCallbackPosted = new AtomicBoolean();
  private final ReactContext mContext;
  private final UIManager mUIManager;
  private RCTEventEmitter mCustomEventHandler = new NoopEventHandler();
  private List<OnAnimationFrame> mFrameCallbacks = new ArrayList<>();
  private ConcurrentLinkedQueue<CopiedEvent> mEventQueue = new ConcurrentLinkedQueue<>();
  private double lastFrameTimeMs;
  public Set<String> uiProps = Collections.emptySet();
  public Set<String> nativeProps = Collections.emptySet();
  private ReaCompatibility compatibility;
  private @Nullable Runnable mUnsubscribe = null;

  public NativeProxy getNativeProxy() {
    return mNativeProxy;
  }

  private NativeProxy mNativeProxy;

  public AnimationsManager getAnimationsManager() {
    return mAnimationManager;
  }

  public void invalidate() {
    if (mAnimationManager != null) {
      mAnimationManager.invalidate();
    }

    if (mNativeProxy != null) {
      mNativeProxy.invalidate();
      mNativeProxy = null;
    }

    if (compatibility != null) {
      compatibility.unregisterFabricEventListener(this);
    }

    if (mUnsubscribe != null) {
      mUnsubscribe.run();
      mUnsubscribe = null;
    }
  }

  public void initWithContext(ReactApplicationContext reactApplicationContext) {
    mNativeProxy = new NativeProxy(reactApplicationContext, mWorkletsModule);
    mAnimationManager.setAndroidUIScheduler(mWorkletsModule.getAndroidUIScheduler());
    compatibility = new ReaCompatibility(reactApplicationContext);
    compatibility.registerFabricEventListener(this);
  }

  private final class NativeUpdateOperation {
    public int mViewTag;
    public WritableMap mNativeProps;

    public NativeUpdateOperation(int viewTag, WritableMap nativeProps) {
      mViewTag = viewTag;
      mNativeProps = nativeProps;
    }
  }

  private Queue<NativeUpdateOperation> mOperationsInBatch = new LinkedList<>();
  private boolean mTryRunBatchUpdatesSynchronously = false;

  public NodesManager(ReactContext context, WorkletsModule workletsModule) {
    mContext = context;
    mWorkletsModule = workletsModule;
    int uiManagerType =
        BuildConfig.IS_NEW_ARCHITECTURE_ENABLED ? UIManagerType.FABRIC : UIManagerType.DEFAULT;
    mUIManager = UIManagerHelper.getUIManager(context, uiManagerType);
    assert mUIManager != null;
    mUIImplementation =
        mUIManager instanceof UIManagerModule
            ? ((UIManagerModule) mUIManager).getUIImplementation()
            : null;
    mCustomEventNamesResolver = mUIManager::resolveCustomDirectEventName;
    mEventEmitter = context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class);

    mReactChoreographer = ReactChoreographer.getInstance();
    mChoreographerCallback =
        new GuardedFrameCallback(context) {
          @Override
          protected void doFrameGuarded(long frameTimeNanos) {
            onAnimationFrame(frameTimeNanos);
          }
        };

    if (!BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // We register as event listener at the end, because we pass `this` and we haven't finished
      // constructing an object yet.
      // This lead to a crash described in
      // https://github.com/software-mansion/react-native-reanimated/issues/604 which was caused by
      // Nodes Manager being constructed on UI thread and registering for events.
      // Events are handled in the native modules thread in the `onEventDispatch()` method.
      // This method indirectly uses `mChoreographerCallback` which was created after event
      // registration, creating race condition
      EventDispatcher eventDispatcher =
          Objects.requireNonNull(UIManagerHelper.getEventDispatcher(context, uiManagerType));
      eventDispatcher.addListener(this);
      mUnsubscribe = () -> eventDispatcher.removeListener(this);
    }

    mAnimationManager = new AnimationsManager(mContext, mUIManager);
  }

  public void onHostPause() {
    if (mCallbackPosted.get()) {
      stopUpdatingOnAnimationFrame();
      mCallbackPosted.set(true);
    }
  }

  public boolean isAnimationRunning() {
    return mCallbackPosted.get();
  }

  public void onHostResume() {
    if (mCallbackPosted.getAndSet(false)) {
      startUpdatingOnAnimationFrame();
    }
  }

  public void startUpdatingOnAnimationFrame() {
    if (!mCallbackPosted.getAndSet(true)) {
      mReactChoreographer.postFrameCallback(
          ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE, mChoreographerCallback);
    }
  }

  private void stopUpdatingOnAnimationFrame() {
    if (mCallbackPosted.getAndSet(false)) {
      mReactChoreographer.removeFrameCallback(
          ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE, mChoreographerCallback);
    }
  }

  public void performOperations() {
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      if (mNativeProxy != null) {
        mNativeProxy.performOperations();
      }
    } else if (!mOperationsInBatch.isEmpty()) {
      final Queue<NativeUpdateOperation> copiedOperationsQueue = mOperationsInBatch;
      mOperationsInBatch = new LinkedList<>();
      final boolean trySynchronously = mTryRunBatchUpdatesSynchronously;
      mTryRunBatchUpdatesSynchronously = false;
      final Semaphore semaphore = new Semaphore(0);
      mContext.runOnNativeModulesQueueThread(
          new GuardedRunnable(mContext.getExceptionHandler()) {
            @Override
            public void runGuarded() {
              boolean queueWasEmpty =
                  UIManagerReanimatedHelper.isOperationQueueEmpty(mUIImplementation);
              boolean shouldDispatchUpdates = trySynchronously && queueWasEmpty;
              if (!shouldDispatchUpdates) {
                semaphore.release();
              }
              while (!copiedOperationsQueue.isEmpty()) {
                NativeUpdateOperation op = copiedOperationsQueue.remove();
                ReactShadowNode<?> shadowNode = mUIImplementation.resolveShadowNode(op.mViewTag);
                if (shadowNode != null) {
                  ((UIManagerModule) mUIManager)
                      .updateView(op.mViewTag, shadowNode.getViewClass(), op.mNativeProps);
                }
              }
              if (queueWasEmpty) {
                mUIImplementation.dispatchViewUpdates(-1); // no associated batchId
              }
              if (shouldDispatchUpdates) {
                semaphore.release();
              }
            }
          });
      if (trySynchronously) {
        try {
          boolean ignored = semaphore.tryAcquire(16, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
          // if the thread is interrupted we just continue and let the layout update happen
          // asynchronously
        }
      }
    }
  }

  private void onAnimationFrame(long frameTimeNanos) {
    // Systrace.beginSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE, "onAnimationFrame");

    double currentFrameTimeMs = frameTimeNanos / 1000000.;
    if (mSlowAnimationsEnabled) {
      currentFrameTimeMs =
          mFirstUptime + (currentFrameTimeMs - mFirstUptime) / mAnimationsDragFactor;
    }

    if (currentFrameTimeMs > lastFrameTimeMs) {
      // It is possible for ChoreographerCallback to be executed twice within the same frame
      // due to frame drops. If this occurs, the additional callback execution should be ignored.
      lastFrameTimeMs = currentFrameTimeMs;

      while (!mEventQueue.isEmpty()) {
        CopiedEvent copiedEvent = mEventQueue.poll();
        handleEvent(
            copiedEvent.getTargetTag(), copiedEvent.getEventName(), copiedEvent.getPayload());
      }

      if (!mFrameCallbacks.isEmpty()) {
        List<OnAnimationFrame> frameCallbacks = mFrameCallbacks;
        mFrameCallbacks = new ArrayList<>(frameCallbacks.size());
        for (int i = 0, size = frameCallbacks.size(); i < size; i++) {
          frameCallbacks.get(i).onAnimationFrame(currentFrameTimeMs);
        }
      }

      performOperations();
    }

    mCallbackPosted.set(false);
    if (!mFrameCallbacks.isEmpty() || !mEventQueue.isEmpty()) {
      // enqueue next frame
      startUpdatingOnAnimationFrame();
    }

    // Systrace.endSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE);
  }

  public void enqueueUpdateViewOnNativeThread(
      int viewTag, WritableMap nativeProps, boolean trySynchronously) {
    if (trySynchronously) {
      mTryRunBatchUpdatesSynchronously = true;
    }
    mOperationsInBatch.add(new NativeUpdateOperation(viewTag, nativeProps));
  }

  public void configureProps(Set<String> uiPropsSet, Set<String> nativePropsSet) {
    uiProps = uiPropsSet;
    nativeProps = nativePropsSet;
  }

  public void postOnAnimation(OnAnimationFrame onAnimationFrame) {
    mFrameCallbacks.add(onAnimationFrame);
    startUpdatingOnAnimationFrame();
  }

  @Override
  public void onEventDispatch(Event event) {
    if (mNativeProxy == null) {
      return;
    }
    // Events can be dispatched from any thread so we have to make sure handleEvent is run from the
    // UI thread.
    if (UiThreadUtil.isOnUiThread()) {
      handleEvent(event);
      performOperations();
    } else {
      String eventName = mCustomEventNamesResolver.resolveCustomEventName(event.getEventName());
      int viewTag = event.getViewTag();
      boolean shouldSaveEvent = mNativeProxy.isAnyHandlerWaitingForEvent(eventName, viewTag);
      if (shouldSaveEvent) {
        mEventQueue.offer(new CopiedEvent(event));
      }
      startUpdatingOnAnimationFrame();
    }
  }

  private void handleEvent(Event event) {
    event.dispatch(mCustomEventHandler);
  }

  private void handleEvent(int targetTag, String eventName, @Nullable WritableMap event) {
    mCustomEventHandler.receiveEvent(targetTag, eventName, event);
  }

  public UIManagerModule.CustomEventNamesResolver getEventNameResolver() {
    return mCustomEventNamesResolver;
  }

  public void registerEventHandler(RCTEventEmitter handler) {
    mCustomEventHandler = handler;
  }

  public void sendEvent(String name, WritableMap body) {
    mEventEmitter.emit(name, body);
  }

  public void updateProps(int viewTag, Map<String, Object> props) {
    /*
     * This is a temporary fix intended to address an issue where updates to properties
     * are attempted on views that may not exist or have been removed. This scenario can
     * occur in fast-changing UI environments where components are frequently added or
     * removed, leading to potential inconsistencies or errors when attempting to update
     * views based on outdated references
     */
    try {
      View view = mUIManager.resolveView(viewTag);
      if (view == null) {
        return;
      }
    } catch (IllegalViewOperationException e) {
      return;
    }

    // TODO: update PropsNode to use this method instead of its own way of updating props
    boolean hasUIProps = false;
    boolean hasNativeProps = false;
    boolean hasJSProps = false;
    JavaOnlyMap newUIProps = new JavaOnlyMap();
    WritableMap newJSProps = Arguments.createMap();
    WritableMap newNativeProps = Arguments.createMap();

    for (Map.Entry<String, Object> entry : props.entrySet()) {
      String key = entry.getKey();
      Object value = entry.getValue();
      if (uiProps.contains(key)) {
        hasUIProps = true;
        addProp(newUIProps, key, value);
      } else if (nativeProps.contains(key)) {
        hasNativeProps = true;
        addProp(newNativeProps, key, value);
      } else {
        hasJSProps = true;
        addProp(newJSProps, key, value);
      }
    }

    if (viewTag != View.NO_ID) {
      if (hasUIProps) {
        mUIImplementation.synchronouslyUpdateViewOnUIThread(
            viewTag, new ReactStylesDiffMap(newUIProps));
      }
      if (hasNativeProps) {
        enqueueUpdateViewOnNativeThread(viewTag, newNativeProps, true);
      }
      if (hasJSProps) {
        WritableMap evt = Arguments.createMap();
        evt.putInt("viewTag", viewTag);
        evt.putMap("props", newJSProps);
        sendEvent("onReanimatedPropsChange", evt);
      }
    }
  }

  public String obtainProp(int viewTag, String propName) {
    View view;
    try {
      view = mUIManager.resolveView(viewTag);
    } catch (Exception e) {
      // This happens when the view is not mounted yet
      return "[Reanimated] Unable to resolve view";
    }

    switch (propName) {
      case "opacity" -> {
        return Float.toString(view.getAlpha());
      }
      case "zIndex" -> {
        return Float.toString(view.getElevation());
      }
      case "width" -> {
        return Float.toString(PixelUtil.toDIPFromPixel(view.getWidth()));
      }
      case "height" -> {
        return Float.toString(PixelUtil.toDIPFromPixel(view.getHeight()));
      }
      case "top" -> {
        return Float.toString(PixelUtil.toDIPFromPixel(view.getTop()));
      }
      case "left" -> {
        return Float.toString(PixelUtil.toDIPFromPixel(view.getLeft()));
      }
      case "backgroundColor" -> {
        Drawable background = view.getBackground();
        try {
          Method getColor = background.getClass().getMethod("getColor");
          int actualColor = (int) getColor.invoke(background);

          String invertedColor = String.format("%08x", (0xFFFFFFFF & actualColor));
          // By default transparency is first, color second
          return "#" + invertedColor.substring(2, 8) + invertedColor.substring(0, 2);

        } catch (Exception e) {
          return "Unable to resolve background color";
        }
      }
      default -> {
        throw new IllegalArgumentException(
            "[Reanimated] Attempted to get unsupported property "
                + propName
                + " with function `getViewProp`");
      }
    }
  }

  private static WritableMap copyReadableMap(ReadableMap map) {
    WritableMap copy = Arguments.createMap();
    copy.merge(map);
    return copy;
  }

  private static WritableArray copyReadableArray(ReadableArray array) {
    WritableArray copy = Arguments.createArray();
    for (int i = 0; i < array.size(); i++) {
      ReadableType type = array.getType(i);
      switch (type) {
        case Boolean -> copy.pushBoolean(array.getBoolean(i));
        case String -> copy.pushString(array.getString(i));
        case Null -> copy.pushNull();
        case Number -> copy.pushDouble(array.getDouble(i));
        case Map -> copy.pushMap(copyReadableMap(array.getMap(i)));
        case Array -> copy.pushArray(copyReadableArray(array.getArray(i)));
        default -> throw new IllegalStateException("[Reanimated] Unknown type of ReadableArray.");
      }
    }
    return copy;
  }

  private static void addProp(WritableMap propMap, String key, Object value) {
    if (value == null) {
      propMap.putNull(key);
    } else if (value instanceof Double) {
      propMap.putDouble(key, (Double) value);
    } else if (value instanceof Integer) {
      propMap.putInt(key, (Integer) value);
    } else if (value instanceof Number) {
      propMap.putDouble(key, ((Number) value).doubleValue());
    } else if (value instanceof Boolean) {
      propMap.putBoolean(key, (Boolean) value);
    } else if (value instanceof String) {
      propMap.putString(key, (String) value);
    } else if (value instanceof ReadableArray) {
      if (!(value instanceof WritableArray)) {
        propMap.putArray(key, copyReadableArray((ReadableArray) value));
      } else {
        propMap.putArray(key, (ReadableArray) value);
      }
    } else if (value instanceof ReadableMap) {
      if (!(value instanceof WritableMap)) {
        propMap.putMap(key, copyReadableMap((ReadableMap) value));
      } else {
        propMap.putMap(key, (ReadableMap) value);
      }
    } else {
      throw new IllegalStateException("[Reanimated] Unknown type of animated value.");
    }
  }

  public void enableSlowAnimations(boolean slowAnimationsEnabled, int animationsDragFactor) {
    mSlowAnimationsEnabled = slowAnimationsEnabled;
    mAnimationsDragFactor = animationsDragFactor;
    if (slowAnimationsEnabled) {
      mFirstUptime = SystemClock.uptimeMillis();
    }
  }
}
