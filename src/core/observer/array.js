/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'
// 取得原生数组的原型（Array.prototype也是一个数组）
const arrayProto = Array.prototype
// 克隆数组的原型，创建一个新的数组对象，防止污染原生数组方法
// 对象的__proto__指向arrayProto，所以arrayMethods的__proto__包含数组的所有方法
export const arrayMethods = Object.create(arrayProto)

// 我们只对这7个方法做了拦截，用这些方法修改数组会实现响应式，如果用索引修改数组是无法实现响应式的
// 在保证不污染原生数组原型的情况下重写数组的这些方法
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
// 遍历methodsToPatch数组，对其中的方法进行重写
methodsToPatch.forEach(function (method) {
  // cache original method
  // 保存数组的原型方法
  const original = arrayProto[method]
  // 拦截：添加额外行为，修改方法映射，调用数组方法的时候实际上调用的是对应的mutator方法
  // def：通过object.defineProperty对元素的属性重新定义，尤其是value的获取
  def(arrayMethods, method, function mutator (...args) {
    // 执行原先的任务, 调用原方法，先把结果求出来
    const result = original.apply(this, args)
    // 额外任务
    const ob = this.__ob__ // 拿到观察者observer

    // 以下三个操作需要额外响应化处理
    let inserted
    switch (method) {
      // 对于push，unshift会新增索引，所以需要手动observe
      case 'push':
      case 'unshift':
        inserted = args
        break
      // splice方法，如果传入了第三个参数，也会有新增索引，所以也需要手动observe
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // push，unshift，splice三个方法触发后，在这里手动observe，
    // 其他方法的变更会在当前的索引上进行更新，所以不需要再执行ob.observeArray
    if (inserted) ob.observeArray(inserted) // 给新添加的元素添加观察者
    // 通知更新，触发依赖
    // 每一个ob都有唯一的一个dep
    ob.dep.notify()
    return result
  })
})
