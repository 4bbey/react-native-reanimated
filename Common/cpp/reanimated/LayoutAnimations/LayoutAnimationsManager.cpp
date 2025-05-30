#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/Tools/CollectionUtils.h>

#ifndef NDEBUG
#include <utility>
#endif

namespace reanimated {

void LayoutAnimationsManager::configureAnimationBatch(
    const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  std::vector<LayoutAnimationConfig> sharedTransitionConfigs;
  for (auto layoutAnimationConfig : layoutAnimationsBatch) {
    const auto &[tag, type, config, sharedTransitionTag] =
        layoutAnimationConfig;
    if (type == SHARED_ELEMENT_TRANSITION ||
        type == SHARED_ELEMENT_TRANSITION_PROGRESS) {
      clearSharedTransitionConfig(tag);
      sharedTransitionConfigs.push_back(std::move(layoutAnimationConfig));
    } else {
#ifdef RCT_NEW_ARCH_ENABLED
      if (type == ENTERING) {
        enteringAnimationsForNativeID_[tag] = config;
        continue;
      }
#endif
      if (config == nullptr) {
        getConfigsForType(type).erase(tag);
      } else {
        getConfigsForType(type)[tag] = config;
      }
    }
  }
  for (const auto &[tag, type, config, sharedTransitionTag] :
       sharedTransitionConfigs) {
    if (config == nullptr) {
      continue;
    }
    sharedTransitionGroups_[sharedTransitionTag].push_back(tag);
    viewTagToSharedTag_[tag] = sharedTransitionTag;
    getConfigsForType(SHARED_ELEMENT_TRANSITION)[tag] = config;
    if (type == SHARED_ELEMENT_TRANSITION) {
      ignoreProgressAnimationForTag_.insert(tag);
    }
  }
}

void LayoutAnimationsManager::setShouldAnimateExiting(
    const int tag,
    const bool value) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  shouldAnimateExitingForTag_[tag] = value;
}

bool LayoutAnimationsManager::shouldAnimateExiting(
    const int tag,
    const bool shouldAnimate) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  return collection::contains(shouldAnimateExitingForTag_, tag)
      ? shouldAnimateExitingForTag_[tag]
      : shouldAnimate;
}

bool LayoutAnimationsManager::hasLayoutAnimation(
    const int tag,
    const LayoutAnimationType type) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  if (type == SHARED_ELEMENT_TRANSITION_PROGRESS) {
    auto end = ignoreProgressAnimationForTag_.end();
    return ignoreProgressAnimationForTag_.find(tag) == end;
  }
  return collection::contains(getConfigsForType(type), tag);
}

void LayoutAnimationsManager::clearSharedTransitionConfig(const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
#ifndef NDEBUG
  const auto &pair = viewsScreenSharedTagMap_[tag];
  screenSharedTagSet_.erase(pair);
  viewsScreenSharedTagMap_.erase(tag);
#endif // NDEBUG

  sharedTransitionAnimations_.erase(tag);
  auto const &groupName = viewTagToSharedTag_[tag];
  if (groupName.empty()) {
    viewTagToSharedTag_.erase(tag);
    return;
  }
  auto &group = sharedTransitionGroups_[groupName];
  auto position = std::find(group.begin(), group.end(), tag);
  if (position != group.end()) {
    group.erase(position);
  }
  if (group.size() == 0) {
    sharedTransitionGroups_.erase(groupName);
  }
  viewTagToSharedTag_.erase(tag);
  ignoreProgressAnimationForTag_.erase(tag);
}

void LayoutAnimationsManager::clearLayoutAnimationConfig(const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  enteringAnimations_.erase(tag);
  exitingAnimations_.erase(tag);
  layoutAnimations_.erase(tag);
  shouldAnimateExitingForTag_.erase(tag);
  clearSharedTransitionConfig(tag);
}

void LayoutAnimationsManager::startLayoutAnimation(
    jsi::Runtime &rt,
    const int tag,
    const LayoutAnimationType type,
    const jsi::Object &values) {
  std::shared_ptr<Shareable> config, viewShareable;
  {
    auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
    if (!collection::contains(getConfigsForType(type), tag)) {
      return;
    }
    config = getConfigsForType(type)[tag];
  }
  // TODO: cache the following!!
  jsi::Value layoutAnimationRepositoryAsValue =
      rt.global()
          .getPropertyAsObject(rt, "global")
          .getProperty(rt, "LayoutAnimationsManager");
  jsi::Function startAnimationForTag =
      layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(
          rt, "start");
  startAnimationForTag.call(
      rt,
      jsi::Value(tag),
      jsi::Value(static_cast<int>(type)),
      values,
      config->toJSValue(rt));
}

void LayoutAnimationsManager::cancelLayoutAnimation(
    jsi::Runtime &rt,
    const int tag) const {
  jsi::Value layoutAnimationRepositoryAsValue =
      rt.global()
          .getPropertyAsObject(rt, "global")
          .getProperty(rt, "LayoutAnimationsManager");
  jsi::Function cancelLayoutAnimation =
      layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(
          rt, "stop");
  cancelLayoutAnimation.call(rt, jsi::Value(tag));
}

/*
  The top screen on the stack triggers the animation, so we need to find
  the sibling view registered in the past. This method finds view
  registered in the same transition group (with the same transition tag)
  which has been added to that group directly before the one that we
  provide as an argument.
*/
int LayoutAnimationsManager::findPrecedingViewTagForTransition(const int tag) {
  auto const &groupName = viewTagToSharedTag_[tag];
  auto const &group = sharedTransitionGroups_[groupName];
  auto position = std::find(group.begin(), group.end(), tag);
  if (position != group.end() && position != group.begin()) {
    return *std::prev(position);
  }
  return -1;
}

const std::vector<int> &LayoutAnimationsManager::getSharedGroup(
    const int viewTag) {
  const auto &groupSharedTag = viewTagToSharedTag_[viewTag];
  return sharedTransitionGroups_[groupSharedTag];
}

#ifdef RCT_NEW_ARCH_ENABLED
void LayoutAnimationsManager::transferConfigFromNativeID(
    const int nativeId,
    const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  auto config = enteringAnimationsForNativeID_[nativeId];
  if (config) {
    enteringAnimations_.insert_or_assign(tag, config);
  }
  enteringAnimationsForNativeID_.erase(nativeId);
}
#endif

#ifndef NDEBUG
std::string LayoutAnimationsManager::getScreenSharedTagPairString(
    const int screenTag,
    const std::string &sharedTag) const {
  return std::to_string(screenTag) + ":" + sharedTag;
}

void LayoutAnimationsManager::checkDuplicateSharedTag(
    const int viewTag,
    const int screenTag) {
  if (!viewTagToSharedTag_.count(viewTag)) {
    return;
  }
  const auto &sharedTag = viewTagToSharedTag_[viewTag];
  const auto &pair = getScreenSharedTagPairString(screenTag, sharedTag);
  bool hasDuplicate = screenSharedTagSet_.count(pair);
  if (hasDuplicate) {
    jsLogger_->warnOnJS(
        "[Reanimated] Duplicate shared tag \"" + sharedTag +
        "\" on the same screen");
  }
  viewsScreenSharedTagMap_[viewTag] = pair;
  screenSharedTagSet_.insert(pair);
}
#endif // NDEBUG

std::unordered_map<int, std::shared_ptr<Shareable>> &
LayoutAnimationsManager::getConfigsForType(const LayoutAnimationType type) {
  switch (type) {
    case ENTERING:
      return enteringAnimations_;
    case EXITING:
      return exitingAnimations_;
    case LAYOUT:
      return layoutAnimations_;
    case SHARED_ELEMENT_TRANSITION:
    case SHARED_ELEMENT_TRANSITION_PROGRESS:
      return sharedTransitionAnimations_;
    default:
      assert(false);
  }
}

} // namespace reanimated
