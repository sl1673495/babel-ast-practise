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

// 找到i18n对应的key
function findI18nKey(value) {
  const matchKey = reverseCnMap[value]
  return matchKey
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
  JSXText(path) {
    const { node } = path
    const i18nKey = findI18nKey(node.value)
    if (i18nKey) {
      node.value = '{t(i18nKey)}'
    }
  },
  Literal(path) {
    const { node } = path
    const { value } = node
    const i18nKey = findI18nKey(value)
    console.log('i18nKey: ', i18nKey);
    if (i18nKey) {
      if (t.isStringLiteral(node)) {
        path.replaceWith(
          t.callExpression(
            t.identifier('t'),
            [t.stringLiteral(i18nKey)]
          )
        )
      }
    }
  }
})

const { code } = generate(ast)
console.log("code: ", code)

/**
import React from 'react';
import { Button, Toast } from 'components';
import { t } from "react-intl";

const Comp = props => {
  const tips = () => {
    Toast.info("t(tips)");
    Toast({
      text: "t(tips)"
    });
  };

  return <div>
      <Button onClick={tips}>t(btn)</Button>
    </div>;
};

export default Comp;
 */