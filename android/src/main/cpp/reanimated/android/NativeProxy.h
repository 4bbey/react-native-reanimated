#pragma once

#include <reanimated/NativeModules/ReanimatedModuleProxy.h>
#include <reanimated/android/JNIHelper.h>
#include <reanimated/android/LayoutAnimations.h>

#include <worklets/android/WorkletsModule.h>

#include <ReactCommon/CallInvokerHolder.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/CxxModuleWrapper.h>
#include <react/jni/JavaScriptExecutorHolder.h>
#include <react/jni/WritableNativeMap.h>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/fabric/JFabricUIManager.h>
#include <react/jni/JRuntimeExecutor.h>
#include <react/renderer/scheduler/Scheduler.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace facebook::jni;

class AnimationFrameCallback : public HybridClass<AnimationFrameCallback> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/nativeProxy/AnimationFrameCallback;";

  void onAnimationFrame(double timestampMs) {
    callback_(timestampMs);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod(
            "onAnimationFrame", AnimationFrameCallback::onAnimationFrame),
    });
  }

 private:
  friend HybridBase;

  explicit AnimationFrameCallback(std::function<void(double)> callback)
      : callback_(std::move(callback)) {}

  std::function<void(double)> callback_;
};

class EventHandler : public HybridClass<EventHandler> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/nativeProxy/EventHandler;";

  void receiveEvent(
      jni::alias_ref<JString> eventKey,
      jint emitterReactTag,
      jni::alias_ref<react::WritableMap> event) {
    handler_(eventKey, emitterReactTag, event);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("receiveEvent", EventHandler::receiveEvent),
    });
  }

 private:
  friend HybridBase;

  explicit EventHandler(std::function<void(
                            jni::alias_ref<JString>,
                            jint emitterReactTag,
                            jni::alias_ref<react::WritableMap>)> handler)
      : handler_(std::move(handler)) {}

  std::function<
      void(jni::alias_ref<JString>, jint, jni::alias_ref<react::WritableMap>)>
      handler_;
};

class SensorSetter : public HybridClass<SensorSetter> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/nativeProxy/SensorSetter;";

  void sensorSetter(jni::alias_ref<JArrayFloat> value, int orientationDegrees) {
    size_t size = value->size();
    auto elements = value->getRegion(0, size);
    double array[7];
    for (size_t i = 0; i < size; i++) {
      array[i] = elements[i];
    }
    callback_(array, orientationDegrees);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("sensorSetter", SensorSetter::sensorSetter),
    });
  }

 private:
  friend HybridBase;

  explicit SensorSetter(std::function<void(double[], int)> callback)
      : callback_(std::move(callback)) {}

  std::function<void(double[], int)> callback_;
};

class KeyboardWorkletWrapper : public HybridClass<KeyboardWorkletWrapper> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/keyboard/KeyboardWorkletWrapper;";

  void invoke(int keyboardState, int height) {
    callback_(keyboardState, height);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("invoke", KeyboardWorkletWrapper::invoke),
    });
  }

 private:
  friend HybridBase;

  explicit KeyboardWorkletWrapper(std::function<void(int, int)> callback)
      : callback_(std::move(callback)) {}

  std::function<void(int, int)> callback_;
};

class NativeProxy : public jni::HybridClass<NativeProxy>,
                    std::enable_shared_from_this<NativeProxy> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/NativeProxy;";
  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis,
      jni::alias_ref<WorkletsModule::javaobject> jWorkletsModule,
      jlong jsContext,
      jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
          jsCallInvokerHolder,
      jni::alias_ref<LayoutAnimations::javaobject> layoutAnimations,
      const bool isBridgeless
#ifdef RCT_NEW_ARCH_ENABLED
      ,
      jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager
#endif
  );

  static void registerNatives();

  ~NativeProxy();

 private:
  friend HybridBase;
  jni::global_ref<NativeProxy::javaobject> javaPart_;
  jsi::Runtime *rnRuntime_;
  std::shared_ptr<ReanimatedModuleProxy> reanimatedModuleProxy_;
  jni::global_ref<LayoutAnimations::javaobject> layoutAnimations_;
#ifndef NDEBUG
  void checkJavaVersion(jsi::Runtime &);
  void injectCppVersion();
#endif // NDEBUG
#ifdef RCT_NEW_ARCH_ENABLED
  // removed temporarily, event listener mechanism needs to be fixed on RN side
  // std::shared_ptr<facebook::react::Scheduler> reactScheduler_;
  // std::shared_ptr<EventListener> eventListener_;
#endif // RCT_NEW_ARCH_ENABLED
  void installJSIBindings();
  PlatformDepMethodsHolder getPlatformDependentMethods();
  void setupLayoutAnimations();

  double getAnimationTimestamp();
  bool isAnyHandlerWaitingForEvent(
      const std::string &eventName,
      const int emitterReactTag);
  void performOperations();
  bool getIsReducedMotion();
  void requestRender(std::function<void(double)> onRender);
  void registerEventHandler();
  void maybeFlushUIUpdatesQueue();
  void setGestureState(int handlerTag, int newState);
  int registerSensor(
      int sensorType,
      int interval,
      int iosReferenceFrame,
      std::function<void(double[], int)> setter);
  void unregisterSensor(int sensorId);
  int subscribeForKeyboardEvents(
      std::function<void(int, int)> callback,
      bool isStatusBarTranslucent,
      bool isNavigationBarTranslucent);
  void unsubscribeFromKeyboardEvents(int listenerId);
#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
  jsi::Value
  obtainProp(jsi::Runtime &rt, const int viewTag, const jsi::Value &propName);
  void configureProps(
      jsi::Runtime &rt,
      const jsi::Value &uiProps,
      const jsi::Value &nativeProps);
  void updateProps(jsi::Runtime &rt, const jsi::Value &operations);
  void scrollTo(int viewTag, double x, double y, bool animated);
  void dispatchCommand(
      jsi::Runtime &rt,
      const int viewTag,
      const jsi::Value &commandNameValue,
      const jsi::Value &argsValue);
  std::vector<std::pair<std::string, double>> measure(int viewTag);
#endif
  void handleEvent(
      jni::alias_ref<JString> eventName,
      jint emitterReactTag,
      jni::alias_ref<react::WritableMap> event);

  void progressLayoutAnimation(
      jsi::Runtime &rt,
      int tag,
      const jsi::Object &newProps,
      bool isSharedTransition);

  /***
   * Wraps a method of `NativeProxy` in a function object capturing `this`
   * @tparam TReturn return type of passed method
   * @tparam TParams parameter types of passed method
   * @param methodPtr pointer to method to be wrapped
   * @return a function object with the same signature as the method, calling
   * that method on `this`
   */
  template <class TReturn, class... TParams>
  std::function<TReturn(TParams...)> bindThis(
      TReturn (NativeProxy::*methodPtr)(TParams...)) {
    // It's probably safe to pass `this` as reference here...
    return [this, methodPtr](TParams &&...args) {
      return (this->*methodPtr)(std::forward<TParams>(args)...);
    };
  }

  template <class Signature>
  JMethod<Signature> getJniMethod(std::string const &methodName) {
    return javaPart_->getClass()->getMethod<Signature>(methodName.c_str());
  }

  explicit NativeProxy(
      jni::alias_ref<NativeProxy::jhybridobject> jThis,
      const std::shared_ptr<WorkletsModuleProxy> &workletsModuleProxy,
      jsi::Runtime *rnRuntime,
      const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
      jni::global_ref<LayoutAnimations::javaobject> layoutAnimations,
      const bool isBridgeless
#ifdef RCT_NEW_ARCH_ENABLED
      ,
      jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager
#endif
  );

#ifdef RCT_NEW_ARCH_ENABLED
  void commonInit(jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
                      &fabricUIManager);
#endif // RCT_NEW_ARCH_ENABLED

  void invalidateCpp();
};

} // namespace reanimated
