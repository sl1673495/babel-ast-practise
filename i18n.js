const { parse } = require("@babel/parser")
const { default: traverse } = require("@babel/traverse")
const { default: generate } = require("@babel/generator")
const template = require("babel-template")

const t = require("@babel/types")

const i18Source = {
  en: {
    tips: "this is tips",
    btn: "this is button",
    popover: "popover tooltips",
  },
  zh: {
    tips: "这是一段提示",
    btn: "这是按钮",
    popover: "气泡提示",
  },
}

const I18_LIB = 'react-intl'
const I18_HOOK = 'useI18n'
const I18_FUNC = 't'

const component = `
import React from 'react'
import { Button, Toast, Popover } from 'components'

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
      <Popover tooltip='气泡提示' />
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

const buildDestructFunction = template(`const { VALUE } = SOURCE`)

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

function makeCallExpression(key, value) {
  return t.callExpression(t.identifier(key), [t.stringLiteral(value)])
}

// 生成ast
const ast = parse(component, {
  sourceType: "module",
  plugins: ["jsx"],
})

// 遍历ast
traverse(ast, {
  Program(path) {
    path.get("body.0").insertAfter(makeImportDeclaration(I18_HOOK, I18_LIB))
  },
  JSXText(path) {
    const { node } = path
    const i18nKey = findI18nKey(node.value)
    if (i18nKey) {
      node.value = `{${I18_FUNC}("${i18nKey}")}`
    }
  },
  JSXElement(path) {
    const functionParent = path.getFunctionParent()
    const functionBody = functionParent.node.body.body
    if (!this.hasInsertUseI18n) {
      functionBody.unshift(
        buildDestructFunction({
          VALUE: t.identifier(I18_FUNC),
          SOURCE: t.callExpression(t.identifier(I18_HOOK), []),
        }),
      )
      this.hasInsertUseI18n = true
    }
  },
  Literal(path) {
    const { node } = path
    const i18nKey = findI18nKey(node.value)
    if (i18nKey) {
      if (path.parent.type === "JSXAttribute") {
        path.replaceWith(
          t.jsxExpressionContainer(makeCallExpression(I18_FUNC, i18nKey)),
        )
      } else {
        if (t.isStringLiteral(node)) {
          path.replaceWith(makeCallExpression(I18_FUNC, i18nKey))
        }
      }
    }
  },
})

const { code } = generate(ast)
console.log(code)

/**
import React from 'react';
import { Button, Toast } from 'components';
import { t } from "react-intl";

const Comp = props => {
  const tips = () => {
    Toast.info(t("tips"));
    Toast({
      text: t("tips")
    });
  };

  return <div>
      <Button onClick={tips}>{t("btn")}</Button>
    </div>;
};

export default Comp;
 */
