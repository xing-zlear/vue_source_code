/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util'
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode'
import { renderList } from './render-list'
import { renderSlot } from './render-slot'
import { resolveFilter } from './resolve-filter'
import { checkKeyCodes } from './check-keycodes'
import { bindObjectProps } from './bind-object-props'
import { renderStatic, markOnce } from './render-static'
import { bindObjectListeners } from './bind-object-listeners'
import { resolveScopedSlots } from './resolve-scoped-slots'
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys'

// 都是挂载操作 没有执行
export function installRenderHelpers (target: any) {
  target._o = markOnce //标记once指令相关属性
  target._n = toNumber
  target._s = toString
  target._l = renderList //渲染for循环
  target._t = renderSlot
  target._q = looseEqual
  target._i = looseIndexOf
  target._m = renderStatic //渲染静态内容
  target._f = resolveFilter
  target._k = checkKeyCodes
  target._b = bindObjectProps //动态属性绑定
  target._v = createTextVNode //创建Text VNode节点
  target._e = createEmptyVNode //创建empty VNode节点
  target._u = resolveScopedSlots
  target._g = bindObjectListeners
  target._d = bindDynamicKeys //<div :[username]="className"></div>，设置动态key的方法
  target._p = prependModifier
}
