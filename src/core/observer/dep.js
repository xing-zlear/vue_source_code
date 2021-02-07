/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
/** Dep是一个发布者，可以订阅多个观察者，依赖收集之后Deps中会存在一个或多个Watcher对象，在数据变更的时候通知所有的Watcher */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++ // 每个Dep都有唯一的ID
    this.subs = [] // subs 用来存储所有订阅它的观察者对象Watcher 
  }

  // 向subs数组添加依赖，添加观察者对象
  addSub (sub: Watcher) {
    // 把当前的 watcher 添加到这个数据持有的 dep 的 subs 中，目的是为后续数据变化时能通知到哪些 subs 做准备
    this.subs.push(sub)
  }

  // 移除一个观察者对象
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 依赖收集，当存在Dep.target的时候添加观察者对象
  depend () {
    // Dep.target：watcher实例
    // Dep.target 表示当前正在计算的Watcher，它是全局唯一的，因为在同一时间只能有一个Watcher被计算
    if (Dep.target) {
      // 建立和watcher实例的关系，把当前 Dep 的实例添加到当前正在计算的Watcher 的依赖中
      Dep.target.addDep(this)
    }
  }

  // 通知所有订阅者: 遍历了所有的订阅 Watcher，调用它们的 update 方法
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 依赖收集完需要将Dep.target设为null，防止后面重复添加依赖
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  // 把 Dep.target 恢复成上一个状态，因为当前 vm 的数据依赖收集已经完成，那么对应的渲染Dep.target 也需要改变
  Dep.target = targetStack[targetStack.length - 1]
}
