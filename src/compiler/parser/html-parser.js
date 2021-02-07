/**
 * Not type-checking this file because it's mostly vendor code.
 */

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson (MPL-1.1 OR Apache-2.0 OR GPL-2.0-or-later)
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

import { makeMap, no } from 'shared/util'
import { isNonPhrasingTag } from 'web/compiler/util'
import { unicodeRegExp } from 'core/util/lang'

// Regular Expressions for parsing tags and attributes
/** attribute 属性匹配正则
* ^\s*([^\s"'<>\/=]+)
* ^\s*                                                      空白符开头  一个或多个
*     ([^\s"'<>\/=]+)                                       匹配属性名称的子表达式 非空白符且不是"'<>\/=
* (?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))     后半部分子表达式
*  ?:                                                       非捕获组，不缓存匹配记录，对属性这种高频出现的正则匹配有明显的性能提升
*    \s*(=)\s*  <div username = "xxx.zhang">                表示这样也合法
*             (?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+))      属性值部分
*                "([^"]*)"+                                 "双引号包裹除它本身的0或多个符合条件的内容
*                          |'([^']*)'+                      或者'单引号包裹除它本身的0或多个符合条件的内容
*                                     |([^\s"'=<>`]+))      或者没有两者包裹的不包含空白符和这些指定字符的内容
* */
/**
* 该正则匹配的情况如下
* <div v-bind:username="xxx.zhang" :username="xxx.zhang" :username = "xxx.zhang"  @callme="handleCallme" username>  
* */
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
/** dynamicArgAttribute 指令正则匹配：与attribute的区别是dynamicArgAttribute属性名称是一个变量
* ^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*)            前半部分
* ^\s*                                                        空白符开头  一个或多个
*      (?:v-[\w-]+:|@|:|#)                                    这边就是经常出现的v-指令匹配，:指令匹配，@事件绑定匹配 #slot绑定，[w-]还加个- 这种情况比较少 可能是匹配 v-re-get  也就是用户可能自定义个指令re-get
*                         \[[^=]+\]                           动态属性匹配的关键正则 v-bind[name]=""  绑定的属性名称是变量的时候                                                            
*                                   ([^\s"'<>\/=]+)           匹配属性名称的子表达式 非空白符且不是"'<>\/=
* (?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))       后半部分子表达式
*  ?:                                                         非捕获组，不缓存匹配记录，对属性这种高频出现的正则匹配有明显的性能提升
*    \s*(=)\s*  <div username = "xxx.zhang">                  表示这样也合法
*             (?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+))        属性值部分
*                "([^"]*)"+                                   "双引号包裹除它本身的0或多个符合条件的内容
*                          |'([^']*)'+                        或者'单引号包裹除它本身的0或多个符合条件的内容
*                                     |([^\s"'=<>`]+))        或者没有两者包裹的不包含空白符和这些指定字符的内容
* */
/**
* 该正则匹配的情况如下
* <div v-bind:[name]="xxx.zhang" :[name]="xxx.zhang" :[name] = "xxx.zhang"  @[dosomething]="handleCallme">
* <div [name]>                                               这样是非法的 属性名称非法
* */
const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`) //开始标签起点匹配正则
const startTagClose = /^\s*(\/?)>/ //开始标签终点匹配正则
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`) //结束标签匹配正则
const doctype = /^<!DOCTYPE [^>]+>/i
// #7298: escape - to avoid being passed as HTML comment when inlined in page
const comment = /^<!\--/
const conditionalComment = /^<!\[/

// Special Elements (can contain anything)
export const isPlainTextElement = makeMap('script,style,textarea', true)
const reCache = {}

const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t',
  '&#39;': "'"
}
const encodedAttr = /&(?:lt|gt|quot|amp|#39);/g
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g

// #5992
const isIgnoreNewlineTag = makeMap('pre,textarea', true)
const shouldIgnoreFirstNewline = (tag, html) => tag && isIgnoreNewlineTag(tag) && html[0] === '\n'

function decodeAttr (value, shouldDecodeNewlines) {
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr
  return value.replace(re, match => decodingMap[match])
}

export function parseHTML (html, options) {
  const stack = [] // 定义栈，用来存放解析过程中的标签信息
  const expectHTML = options.expectHTML
  const isUnaryTag = options.isUnaryTag || no
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no
  let index = 0 // 定义游标，用来标记当前字符串处理位置
  let last, lastTag // last用来备份字符流数据，lastTag用来标记结尾标签信息
  while (html) {
    last = html // 如果html不为空，备份数据last=html，此时不存在lastTag
    // Make sure we're not in a plaintext content element like script/style
    // 确认html不是类似<script>, <style>这样的纯文本标签
    if (!lastTag || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf('<')
      // html第一位是'<'
      if (textEnd === 0) {
        // 1、判断html是不是<!-- -->注释
        // var comment = /^<!\--/;
        if (comment.test(html)) {
          const commentEnd = html.indexOf('-->')

          if (commentEnd >= 0) {
            if (options.shouldKeepComment) {
              options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3)
            }
            advance(commentEnd + 3)
            continue
          }
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        // 2、判断是否是处理向下兼容的注释,类似<![if !IE]>
        // var conditionalComment = /^<!\[/
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf(']>')

          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2)
            continue
          }
        }

        // 3、判断是否是<!DOCTYPE开头的标签内容
        // var doctype = /^<!DOCTYPE [^>]+>/i
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          advance(doctypeMatch[0].length)
          continue
        }

        // 4、判断此段html是否结束标签
        // const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
        // const qnameCapture = `((?:${ncname}\\:)?${ncname})`
        // const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          const curIndex = index
          advance(endTagMatch[0].length)
          parseEndTag(endTagMatch[1], curIndex, index)
          continue
        }

        // 5、如果上面四种都不符合，则是开始标签。匹配开始标签，获取match对象
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          handleStartTag(startTagMatch)
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            advance(1)
          }
          continue
        }
      }

      // html.indexOf('<') >= 0
      let text, rest, next
      if (textEnd >= 0) {
        rest = html.slice(textEnd)
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          // < in plain text, be forgiving and treat it as text
          // 处理文本中的 < 字符
          next = rest.indexOf('<', 1)
          if (next < 0) break
          textEnd += next
          rest = html.slice(textEnd)
        }
        text = html.substring(0, textEnd)
      }

      // html.indexOf('<') < 0
      if (textEnd < 0) {
        text = html
      }

      if (text) {
        advance(text.length)
      }

      if (options.chars && text) {
        options.chars(text, index - text.length, index)
      }
    } else {
      let endTagLength = 0
      const stackedTag = lastTag.toLowerCase()
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'))
      const rest = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      index += html.length - rest.length
      html = rest
      parseEndTag(stackedTag, index - endTagLength, index)
    }

    if (html === last) {
      options.chars && options.chars(html)
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        options.warn(`Mal-formatted tag at end of template: "${html}"`, { start: index + html.length })
      }
      break
    }
  }

  // Clean up any remaining tags
  parseEndTag()

  // 将局部变量index往后推 并切割字符串
  function advance (n) {
    index += n
    html = html.substring(n)
  }

  // 用来构建一个match对象，对象里面包含(tagName)，标签属性(attrs)，<左开始标签的位置(start)，>右开始标签的位置(end)
  function parseStartTag () {
    const start = html.match(startTagOpen)
    if (start) {
      const match = {
        tagName: start[1], // 标签名
        attrs: [], // 标签属性
        start: index // <左开始标签的位置
      }
      advance(start[0].length)
      // end：开始标签终点匹配信息；attr：属性匹配信息。循环匹配
      let end, attr
      while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
        attr.start = index
        advance(attr[0].length)
        attr.end = index
        match.attrs.push(attr)
      }
      if (end) {
        match.unarySlash = end[1]
        advance(end[0].length)
        match.end = index
        return match
      }
    }
  }

  function handleStartTag (match) {
    const tagName = match.tagName
    const unarySlash = match.unarySlash

    if (expectHTML) {
      // 段落式元素
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag)
      }
      // 可以省略闭合标签
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        parseEndTag(tagName)
      }
    }

    const unary = isUnaryTag(tagName) || !!unarySlash

    const l = match.attrs.length
    const attrs = new Array(l)
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i]
      const value = args[3] || args[4] || args[5] || ''
      const shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines)
      }
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        attrs[i].start = args.start + args[0].match(/^\s*/).length
        attrs[i].end = args.end
      }
    }

    if (!unary) {
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end })
      lastTag = tagName
    }

    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }

  function parseEndTag (tagName, start, end) {
    let pos, lowerCasedTagName
    if (start == null) start = index
    if (end == null) end = index

    // Find the closest opened tag of the same type
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase()
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) &&
          options.warn
        ) {
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`,
            { start: stack[i].start, end: stack[i].end }
          )
        }
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }

      // Remove the open elements from the stack
      stack.length = pos
      lastTag = pos && stack[pos - 1].tag
    } else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    } else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        options.end(tagName, start, end)
      }
    }
  }
}
