/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
// 只要是对象，就会有一个Observer实例与之对应
// 作用：判断数据对象类型，遍历对象的所有属性将其进行双向绑定
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep() // 实例化 Dep 对象，用于收集依赖
    this.vmCount = 0
    // 给value添加__ob__属性，值就是本Observer对象，value.__ob__ = this;
    // Vue.$data 中每个对象都有 __ob__ 属性,包括 Vue.$data对象本身
    // 执行observe的时候会先检测是否有__ob__属性，来判断是否已经有Observer实例
    def(value, '__ob__', this)
    // 当前对象是否是数组（因为vue2里不能很好的监听数组索引的变化）
    // 如果是数组，调用observeArray()遍历数组，为数组内每个对象添加getter和setter，不是的话调用walk()添加getter和setter
    if (Array.isArray(value)) {
      // 兼容性处理：部分浏览器里数组是没有原型的
      if (hasProto) { // 判断数组的实例是否有 proto 属性，在部分浏览器没有proto
        // 将 arrayMethods 重写到原型上，直接覆盖原型的方法来修改目标对象
        protoAugment(value, arrayMethods) // arrayMethods：监听后的数组方法
      } else {
        // 定义（覆盖）目标对象或数组的某一个方法
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 如果是数组则需要遍历数组的每一个成员进行observe
      this.observeArray(value)
    } else {
      this.walk(value) // 如果是对象则直接walk进行绑定
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    // walk方法会遍历对象的每一个属性进行defineReactive绑定
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    // 数组需要遍历每一个成员进行observe
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
/**
 * 尝试创建一个Observer实例（__ob__）
 * 如果成功创建Observer实例则返回新的Observer实例
 * 如果已有Observer实例则返回现有的Observer实例
 */
// Vue的响应式数据都会有一个__ob__的属性作为标记，里面存放了该属性的观察器，也就是Observer的实例，防止重复绑定
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void

  // 这里用__ob__这个属性来判断是否已经有Observer实例
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // 如果已有Observer实例则直接返回该Observer实例
    ob = value.__ob__ // __ob__是Observer的实例
  } else if (
    // 这里的判断是为了确保value是单纯的对象，而不是函数或者是Regexp等情况
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 如果没有Observer实例则会新建一个Observer实例并赋值给__ob__这个属性
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    // 如果是根数据则计数，后面Observer中的observe的asRootData非true
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
/**
 * 通过Object.defineProperty为数据定义上getter\setter方法，
 * 进行依赖收集后闭包中的Deps会存放Watcher对象。
 * 触发setter改变数据的时候,会通知Deps订阅者通知所有的观察者对象Watcher进行试图更新
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 在闭包中定义一个dep对象
  const dep = new Dep() // 只要有一个属性，就有一个独一无二的Dep和它相对应

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 如果之前该对象已经预设了getter以及setter函数则将其取出来，新定义的getter/setter中会将其执行，保证不会覆盖之前已经定义的getter/setter
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 递归，childOb得到一个Observe实例
  let childOb = !shallow && observe(val)
  // 定义数据拦截
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 如果用户设置了getter，则取用户设置的，否则取val
      const value = getter ? getter.call(obj) : val
      // 依赖收集：Dep.target是个全局变量，它是一个Watcher类型的变量，来将Watcher和Dep进行互相绑定
      if (Dep.target) {
        dep.depend() // 追加依赖关系
        // 如果有子ob存在
        if (childOb) {
          // 继续追加依赖，子对象进行依赖收集，其实就是将同一个watcher观察者实例放进了两个depend中
          // 一个是正在本身闭包中的depend，另一个是子元素的depend
          childOb.dep.depend() 
          // 如果是数组还要继续处理
          if (Array.isArray(value)) {
            // 是数组则需要对每一个成员都进行依赖收集，如果数组的成员还是数组，则递归
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      // 通过getter方法获取当前值，与新值进行比较，一致则不需要执行下面的操作
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 当前值与新值比较，一致则不需要执行下面的操作
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      // 更新val
      if (getter && !setter) return
      if (setter) {
        // 如果用户设置了setter，则用用户设置的值
        setter.call(obj, newVal)
      } else {
        // 赋新值
        val = newVal
      }
      // 如果用户设置的值是对象，还需要额外做响应式处理
      childOb = !shallow && observe(newVal)
      // 如果数据被重新赋值了, 调用 Dep 的 notify 方法, 通知所有的观察者 Watcher
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  // 判断target的类型是否符合要求，若不符合要求，且不在生产环境下，就抛出警告。
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 如果target是数组，且key是有效的数组索引
  // 数组的splice方法会被重写，重写的方法中会手动Observe（../observer/array.js）
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    // 用包装好的变异方法splice进行赋值
    target.splice(key, 1, val)
    return val
  }
  // 对于对象，如果key本来就是对象中的属性，直接修改值就可以触发更新
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  // vue的响应式对象中都会添加了__ob__属性，所以可以根据是否有__ob__属性判断是否为响应式对象，有这个对象就代表是响应式的
  const ob = (target: any).__ob__
  // 如果当前的target对象是vue实例对象或者是根数据对象，就抛出警告
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 如果不存在observer，那就不是响应式对象，直接赋值
  if (!ob) {
    target[key] = val
    return val
  }
  // 给新属性添加依赖，以后直接修改属性就能重新渲染（给数据添加getter和setter）
  defineReactive(ob.value, key, val)
  // 直接触发依赖，通知更新
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
