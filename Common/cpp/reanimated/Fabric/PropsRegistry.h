#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/components/root/RootShadowNode.h>
#include <react/renderer/core/ShadowNode.h>

#include <unordered_map>
#include <utility>

using namespace facebook;
using namespace react;

namespace reanimated {

class PropsRegistry {
 public:
  std::lock_guard<std::mutex> createLock() const;
  // returns a lock you need to hold when calling any of the methods below

  void update(const ShadowNode::Shared &shadowNode, folly::dynamic &&props);

  void for_each(std::function<void(
                    const ShadowNodeFamily &family,
                    const folly::dynamic &props)> callback) const;

  void remove(const Tag tag);

  void pauseReanimatedCommits() {
    isPaused_ = true;
  }

  bool shouldReanimatedSkipCommit() {
    return isPaused_;
  }

  void unpauseReanimatedCommits() {
    isPaused_ = false;
  }

  void pleaseCommitAfterPause() {
    shouldCommitAfterPause_ = true;
  }

  bool shouldCommitAfterPause() {
    return shouldCommitAfterPause_.exchange(false);
  }

  bool isEmpty() {
    return map_.empty();
  }

  void markNodeAsRemovable(const ShadowNode::Shared &shadowNode);
  void unmarkNodeAsRemovable(Tag viewTag);
  void handleNodeRemovals(const RootShadowNode &rootShadowNode);

 private:
  std::unordered_map<Tag, std::pair<ShadowNode::Shared, folly::dynamic>> map_;
  std::unordered_map<Tag, ShadowNode::Shared> removableShadowNodes_;

  mutable std::mutex mutex_; // Protects `map_`.

  std::atomic<bool> isPaused_;
  std::atomic<bool> shouldCommitAfterPause_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
