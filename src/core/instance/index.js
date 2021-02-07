import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// Vue的构造类只做了一件事情，就是调用_init函数进行初始化
function Vue (options) {
  // 在测试或者开发环境检测实例是否是通过new Vue的形式生成的 否则告警 因为后续的所有操作都是围绕vue实例进行
  // new Vue() ✔
  // Vue()     ×
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    // Vue 只能通过 new 关键字初始化
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 初始化，_init方法就是initMixin中的_init方法
  this._init(options)
}

// 以下都是实例原型对象挂载（Vue.prototype实例方法）
initMixin(Vue) // 实现了Vue.prototype._init()，初始化的入口，各种初始化工作，包括下方4个Mixin()涉及的数据初始化
stateMixin(Vue) // 和组件状态相关：【Vue.prototype.】$data, $props, $set, $delete, $watch
eventsMixin(Vue) // 事件的核心方法：【Vue.prototype.】$on, $once, $off, $emit
lifecycleMixin(Vue) // 生命周期的核心方法：【Vue.prototype.】_update, $forceUpdate, $destroy
renderMixin(Vue) // 渲染的核心方法：【Vue.prototype.】$nextTick, _render（_update, _render都是私有方法，不打算给用户使用的）

export default Vue
