/* @flow */

import {
  no,
  noop,
  identity
} from 'shared/util'

import { LIFECYCLE_HOOKS } from 'shared/constants'

export type Config = {
  // user
  optionMergeStrategies: { [key: string]: Function }; //各种合并策略的配置 最好不要去改动它 除非对它的机制非常熟悉
  silent: boolean; //是否保持静默 禁止console.warn输出
  productionTip: boolean; //控制开发模式的一个提醒
  performance: boolean; //是否输出记录性能数据 比如vue的渲染耗时 编译耗时记录
  devtools: boolean; //devtools工具开关
  errorHandler: ?(err: Error, vm: Component, info: string) => void; //可以自定义错误处理方法 比如收集vue error上报等
  warnHandler: ?(msg: string, vm: Component, trace: string) => void; //可以自定义warn处理方法 比如收集vue warn上报等
  ignoredElements: Array<string | RegExp>; //可忽略编译的自定义标签
  keyCodes: { [key: string]: number | Array<number> }; //键值合集

  // platform
  isReservedTag: (x?: string) => boolean; //某标签是否保留标签 放到全局不知道是啥作用
  isReservedAttr: (x?: string) => boolean; //某属性是否保留属性 放到全局不知道是啥作用
  parsePlatformTagName: (x: string) => string;
  isUnknownElement: (x?: string) => boolean;
  getTagNamespace: (x?: string) => string | void; //获取标签命名空间
  mustUseProp: (tag: string, type: ?string, name: string) => boolean; //是否必须传入的prop  比如selct标签必须接收value属性当做prop

  // private
  async: boolean;

  // legacy：生命周期钩子 beforeCreate, created, beforeMount, mounted, beforeUpdate, updated, beforeDestory, destroyed, activated, deactivated, errorCaptured, serverPrefetch
  _lifecycleHooks: Array<string>;
};

export default ({
  /**
   * Option merge strategies (used in core/util/options)
   */
  // $flow-disable-line
  optionMergeStrategies: Object.create(null),

  /**
   * Whether to suppress warnings.
   */
  silent: false,

  /**
   * Show production mode tip message on boot?
   */
  productionTip: process.env.NODE_ENV !== 'production',

  /**
   * Whether to enable devtools
   */
  devtools: process.env.NODE_ENV !== 'production',

  /**
   * Whether to record perf
   */
  performance: false,

  /**
   * Error handler for watcher errors
   */
  errorHandler: null,

  /**
   * Warn handler for watcher warns
   */
  warnHandler: null,

  /**
   * Ignore certain custom elements
   */
  ignoredElements: [],

  /**
   * Custom user key aliases for v-on
   */
  // $flow-disable-line
  keyCodes: Object.create(null),

  /**
   * Check if a tag is reserved so that it cannot be registered as a
   * component. This is platform-dependent and may be overwritten.
   */
  isReservedTag: no,

  /**
   * Check if an attribute is reserved so that it cannot be used as a component
   * prop. This is platform-dependent and may be overwritten.
   */
  isReservedAttr: no,

  /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   */
  isUnknownElement: no,

  /**
   * Get the namespace of an element
   */
  getTagNamespace: noop,

  /**
   * Parse the real tag name for the specific platform.
   */
  parsePlatformTagName: identity,

  /**
   * Check if an attribute must be bound using property, e.g. value
   * Platform-dependent.
   */
  mustUseProp: no,

  /**
   * Perform updates asynchronously. Intended to be used by Vue Test Utils
   * This will significantly reduce performance if set to false.
   */
  async: true,

  /**
   * Exposed for legacy reasons
   */
  _lifecycleHooks: LIFECYCLE_HOOKS
}: Config)
