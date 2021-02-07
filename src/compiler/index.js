/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
// createCompiler用以创建编译器，编译器会将传入的template转换成对应的AST、render函数以及staticRenderFns函数
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // parse会用正则等方式解析template模板中的指令、class、style等数据，形成AST树
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    /**
     * optimize的作用：将AST树进行优化
     * 优化的目标：生成模板AST树，检测不需要进行DOM改变的静态节点
     * 一旦检测到这些静态树，我们就能做以下这些事情：
     *     1.把它们变成常数，这样我们就再也不需要每次重新渲染时创建新的节点了
     *     2.当update更新界面时，会有一个patch的过程，diff算法会直接跳过静态节点
     */
    optimize(ast, options)
  }
  // 将AST语法树转化成render funtion字符串
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
