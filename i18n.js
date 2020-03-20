const { parse } = require("@babel/parser")
const { default: traverse } = require("@babel/traverse")
const { default: generate } = require("@babel/generator")

const t = require("@babel/types")

const i18Source = {
  en: {
    tips: "this is tips",
    btn: "this is button",
  },
  zh: {
    tips: "这是一段提示",
    btn: "这是按钮",
  },
}

const component = `
import React from 'react'
import { Button, Toast } from 'components'

const Comp = (props) => {
  const tips = () => {
    Toast.info('这是一段提示')
    Toast({
    	text: '这是一段提示'
    })
  }

  return (
    <div>
      <Button onClick={tips}>这是按钮</Button>
    </div>
  )
}

export default Comp
`

// 把map的key-value反过来，用来匹配中文对应的key。
function makeReverseMap(map) {
  const reverse = {}
  for (let key in map) {
    reverse[map[key]] = key
  }
  return reverse
}

const reverseCnMap = makeReverseMap(i18Source.zh)

// 找到代码中最后一个import语句的位置
function findLastImportNodeIndex(body) {
  let index
  for (let i = 0; i < body.length; i++) {
    const node = body[i]
    if (node.type === "ImportDeclaration") {
      index = i
    } else {
      // 小优化 import一定在顶部
      return index
    }
  }
  return index
}

// 匹配中文对应的key替换
function replacei18Text(node) {
  const { value } = node
  const matchKey = reverseCnMap[value]
  if (matchKey) {
    node.value = `t(${matchKey})`
  }
}

// 生成一条import语句对应的node
function makeImportDeclaration(value, source) {
  return t.importDeclaration(
    [t.importSpecifier(t.identifier(value), t.identifier(value))],
    t.stringLiteral(source),
  )
}

// 生成ast
const ast = parse(component, {
  sourceType: "module",
  plugins: ["jsx"],
})

// 遍历ast
traverse(ast, {
  Program(path) {
    const { body } = path.node
    const lastImportIndex = findLastImportNodeIndex(body)
    body.splice(
      // 往最后一个import的下面插入导入i18n的语句
      lastImportIndex + 1,
      0,
      makeImportDeclaration("t", "react-intl"),
    )
  },
  "JSXText|Literal"(path) {
    const { node } = path
    replacei18Text(node)
  },
})

const { code } = generate(ast)
console.log("code: ", code)