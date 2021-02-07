/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

// 组件扩展核心方法
export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   * 作用：构造一个Vue的子类
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    // options上挂载_Ctor用于储存
    // 假定需要扩展的options = targetOptions 则下次继续用这个options去extend
    // 则会有现成的 已经存在的符合条件的扩展Vue类构造函数
    // 缓存已经扩展过的构造函数
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    // 扩展一般用来建设组件
    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }

    // 继承于Vue的构造器Sub
    // 当我们去实例化Sub的时候，就会执行this._init逻辑再次走到了Vue实例的初始化逻辑
    const Sub = function VueComponent (options) {
      this._init(options) // 当调用构造方法是 son = new Sub() 调用_init方法
    }
    // 改写Sub的prototype，constructor指向Vue，继承所有Vue上实例原型链上的方法属性
    Sub.prototype = Object.create(Super.prototype)
    // 调转原型链的构造函数执行Sub  旧有的是指向Vue
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    // 扩展 options
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    // 对配置中的props和computed做初始化工作
    if (Sub.options.props) {
      initProps(Sub) // 设置props代理访问  this.xxx = this._props.xxx
    }
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    // 继承来自super的属性和方法
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    // Vue中的conponents filters directives继承
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    // 密封options
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor 注意：用的是superId，储存的是super执行扩展之后的构造函数
    // 对Sub构造函数做缓存，避免多次执行Vue.extend的时候对同一个子组件重复构造
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
