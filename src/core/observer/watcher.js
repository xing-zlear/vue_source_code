/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
/**
 * 依赖收集以后Watcher对象会被保存在Deps中，
 * 数据变动的时候会由Deps通知Watcher实例，
 * 然后由Watcher实例回调cb进行视图的更新。
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      // 把当前 watcher 的实例赋值给 vm._watcher
      // vm._watcher 是专门用来监听 vm 上数据变化然后重新渲染的
      vm._watcher = this
    }
    // _watchers存放订阅者实例
    // 把当前 wathcer 实例 push 到 vm._watchers 中
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = [] // 表示上一次添加的 Dep 实例数组，存放与这个观察者有关的数据Dep
    this.newDeps = [] // 表示新添加的 Dep 实例数组
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    // 把表达式expOrFn解析成getter
    if (typeof expOrFn === 'function') {
      // 传过来的expOrFn是后期数据更新页面渲染的核心步骤
      // this.getter 对应就是 updateComponent 函数，它会执行 vm._render()
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  /* 获得getter的值并且重新进行依赖收集 */
  get () {
    // 将自身watcher观察者实例设置给Dep.target，用以依赖收集
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // this.getter 对应就是 updateComponent 函数，它会执行 vm._render()
      // vm._render() 中，会触发所有数据的 getter，这样实际上已经完成了一个依赖收集的过程
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      // 如果存在deep，则触发每个深层对象的依赖，追踪其变化
      if (this.deep) {
        // 递归每一个对象或者数组，触发它们的getter，使得对象或数组的每一个成员都被依赖收集，形成一个“深（deep）”依赖关系
        traverse(value)
      }
      // 将观察者实例从target栈中取出，并将Dep.target恢复到上一个状态
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   * 添加一个依赖关系到Deps集合中
   */
  addDep (dep: Dep) {
    const id = dep.id
    // 保证同一数据不会被添加多次
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep) // 把传过来的dep对象push到了watcher.newDeps中
      if (!this.depIds.has(id)) {
        // 把watcher对象传入dep中
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   * 清理依赖收集
   * 首先遍历 deps，移除对 dep.subs 数组中 Wathcer 的订阅，
   * 然后把 newDepIds 和 depIds 交换，newDeps 和 deps 交换，
   * 并把 newDepIds 和 newDeps 清空。
   */
  cleanupDeps () {
    // 移除所有观察者对象
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  // 调度者接口，当依赖发生改变的时候进行回调
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      // 同步则执行run直接渲染视图
      this.run()
    } else {
      // 异步推送到观察者队列中，由调度者在下一个tick时调用
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  // 调度者工作接口，将被调度者回调
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        // 即便值相同，拥有Deep属性的观察者以及在对象／数组上的观察者应该被触发更新，因为它们的值可能发生改变
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        // 设置新的值
        this.value = value
        // 触发回调渲染视图
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  // 获取观察者的值
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  // 收集该watcher的所有deps依赖
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  // 将自身从所有依赖收集订阅列表删除
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      // 从vm实例的观察者列表中将自身移除，由于该操作比较耗费资源，所以如果vm实例正在被销毁则跳过该步骤
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
