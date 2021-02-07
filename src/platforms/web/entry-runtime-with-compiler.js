/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  // return a && b 如果a是true的话，返回b，否则返回a
  // return a || b 如果a是true的话，返回a，否则返回b
  return el && el.innerHTML
})

// 缓存原型上的$mount方法
const mount = Vue.prototype.$mount
// 在原型的mount基础上扩展$mount方法
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {

  // el变成dom对象
  el = el && query(el)

  /* istanbul ignore if */
  // Vue 不能挂载在 body、html 这样的根节点上
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  // 处理el和template选项
  const options = this.$options
  // resolve template/el and convert to render function
  // 在 Vue 2.0 版本中，所有 Vue 的组件的渲染最终都需要 render 方法
  // 如果没有定义 render 方法，则会把 el 或者 template 字符串转换成 render 方法
  // render不存在时才考虑template，template不存在时才考虑el。render > template > el
  if (!options.render) {
    let template = options.template
    // 获取template：template存在的时候取template，不存在的时候取el的outerHTML
    if (template) {
      if (typeof template === 'string') {
        // template是选择器的情况（template: '#item'）
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) { // template是dom元素的情况
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) { // el作为template的情况：获取element的outerHTML
      template = getOuterHTML(el)
    }
    // 处理template（编译过程）
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      // 将template字符串转换为render函数（不管用户用el还是template作为模版，最终得到的都是render函数）
      // 调用编译器compileToFunctions生成动态节点渲染方法render和静态节点渲染方法集合staticRenderFns
      // 编译详情在 src/compiler/index.js
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render // 挂载到options
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  // 如果元素的outerHTML存在
  if (el.outerHTML) {
    // 返回该元素的所有HTML代码，包括元素自身
    return el.outerHTML
  } else { // 如果该元素的outerHTML属性不存在: 该元素可能是个文字节点
    // 创建一个DIV
    const container = document.createElement('div')
    // 向DIV中添加这个el
    container.appendChild(el.cloneNode(true))
    // 此时返回container的innerHTML就可以得到该元素即本身的HTML代码
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
