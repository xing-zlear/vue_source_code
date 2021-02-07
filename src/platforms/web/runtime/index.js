/* @flow */

import Vue from 'core/index'
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'
import platformComponents from './components/index'

// install platform specific utils
Vue.config.mustUseProp = mustUseProp // 判断是否必须强制通过props引入
Vue.config.isReservedTag = isReservedTag // 判断是否保留标签
Vue.config.isReservedAttr = isReservedAttr // 判断是否保留属性
Vue.config.getTagNamespace = getTagNamespace // 获取命名空间
Vue.config.isUnknownElement = isUnknownElement // 无法识别的组件名称

// install platform runtime directives & components
extend(Vue.options.directives, platformDirectives)
extend(Vue.options.components, platformComponents)

// install platform patch function
// 实现了patch方法，分发渲染通信的核心
// 在服务端渲染中没有真实的浏览器DOM环境，所以不需要把VNode最终转换成DOM，因此是一个空函数noop，而在浏览器端渲染中，它指向了 patch 方法
Vue.prototype.__patch__ = inBrowser ? patch : noop

// public mount method
// 定义原型上的$mount方法
Vue.prototype.$mount = function (
  el?: string | Element, // el: 挂载的元素
  hydrating?: boolean // hydrating: 和服务端渲染相关
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue)
      } else if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test'
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
        `Make sure to turn on production mode when deploying for production.\n` +
        `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)
}

export default Vue
