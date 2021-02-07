/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

// Vue.component，Vue.directive，Vue.filter全局API的定义
export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   * ASSET_TYPES ——> 'component','directive','filter'
   */
  ASSET_TYPES.forEach(type => {
    // Vue 初始化了 3 个全局函数
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        // 如果注册的内容存在，返回对应id。注册之后是存储在对应的位置Vue.options中的{components: {}, filters: {}, directives: {}}集合中
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          // 校验组件名称的合法性（../util/options.js）
          validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
          // 优先使用component对象内部定义的name属性来命名组件 没有则使用注册时使用的id来命名 也可看成是组件使用时候的标签名
          definition.name = definition.name || id
          // this.opitons._base.extend 相当于 Vue.extend，把这个对象转换成一个继承于 Vue 的构造函数
          definition = this.options._base.extend(definition)
        }
        // 如果是指令且指令的配置为一个方法  则默认该指令的绑定和更新都是调用这个方法
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // 挂载到 Vue.options.[type]s
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
