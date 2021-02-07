/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

// 构造函数API挂载
export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  /**
   * 劫持config配置的set方法 只读对象 不应该直接修改Vue.config  而是在传入参数中按需配置字段
   * */
  const configDef = {}
  configDef.get = () => config //config: 全局配置config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions, // options合并策略 new Vue(options)
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  Vue.observable = (obj) => {
    observe(obj)
    return obj
  }

  /**
   * Vue.options初始化：初始化构造函数上options 将作为所有后续options的祖先级对象
   * Vue.options = {
   *   components: {},
   *   directives: {},
   *   filters: {}
   * }
   * */
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue

  extend(Vue.options.components, builtInComponents) //builtInComponents: 全局内置组件keep-alive

  initUse(Vue) // 规范化插件安装
  initMixin(Vue) // mixins选项合并
  initExtend(Vue) // 组件扩展核心方法
  initAssetRegisters(Vue) // Vue.component， Vue.directive，Vue.filter全局API的定义
}
