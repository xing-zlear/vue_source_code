/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 在vue原型上进行了初始化方法挂载
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 防止vm实例自身被观察的标志位
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      // mergeOptions：把Vue构造函数的options和用户传入的options做一层合并，到vm.$options上
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    // init核心代码
    vm._self = vm
    
    // 以下init顺序不能变
    initLifecycle(vm) // 初始化生命周期，$parent、$root、$children、$refs
    initEvents(vm) // 初始化事件，处理父组件传递的监听器：_events、_hasHookEvent
    initRender(vm) // 初始化render，$slots, $scopedSlots, _c, $createElement()
    // 调用beforeCreate钩子函数并且触发beforeCreate钩子事件
    callHook(vm, 'beforeCreate') // 显然beforeCreate的钩子函数中无法获取到props、data中定义的值，也不能调用methods中定义的函数
    initInjections(vm) // 获取注入的数据，resolve injections before data/props
    initState(vm) // 初始化组件中的props，methods，data，computed，watch...
    initProvide(vm) // 提供数据，resolve provide after data/props
    // 调用created钩子函数并且触发created钩子事件
    // 一般来说，如果组件在加载的时候需要和后端有交互，放在这两个钩子函数执行都可以
    // 如果是需要访问 props、data 等数据的话，就需要使用 created 钩子函数
    callHook(vm, 'created') // beforeCreate,created执行的时候，还没有渲染DOM，所以我们也不能够访问DOM

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      // 格式化组件名
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 选项里有el时，自动执行$mount（所以new Vue({})选项里不需要单独设置$mount）
    if (vm.$options.el) {
      vm.$mount(vm.$options.el) // 挂载组件
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
