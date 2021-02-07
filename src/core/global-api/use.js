/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  // Vue.use的实现部分，提供一个操作Vue全局或者实例相关逻辑或者api的聚合，规范化插件安装
  Vue.use = function (plugin: Function | Object) {
    // 判断同一插件是否重复注册
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this)
    // 优先尝试通过install安装插件 可以认为是Vue推荐的插件安装标准格式
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin)
    return this
  }
}
