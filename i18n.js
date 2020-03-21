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

// 把map的key-value反过来 用来匹配中文对应的key。
function makeReverseMap(map) {
  const reverse = {}
  for (let key in map) {
    reverse[map[key]] = key
  }
  return reverse
}

const reverseCnMap = makeReverseMap(i18Source.zh)

// 构建一个解构的模板
const buildDestructFunction = template(`const { VALUE } = SOURCE`)

// 找到i18n对应的key
function findI18nKey(value) {
  const matchKey = reverseCnMap[value]
  return matchKey
}

// 生成一条import语句 import { foo } from 'bar'
function makeImportDeclaration(value, source) {
  return t.importDeclaration(
    [t.importSpecifier(t.identifier(value), t.identifier(value))],
    t.stringLiteral(source),
  )
}

// 生成函数调用 t(key)
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
    // i18n的import导入 一般第一项一定是import React 所以直接插入在后面就可以
    path.get("body.0").insertAfter(makeImportDeclaration(I18_HOOK, I18_LIB))
  },
  // 通过找到第一个jsxElement 来向上寻找Component函数并且插入i18n的hook函数
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
  // jsx中的文字 直接替换成{t(key)}的形式
  JSXText(path) {
    const { node } = path
    const i18nKey = findI18nKey(node.value)
    if (i18nKey) {
      node.value = `{${I18_FUNC}("${i18nKey}")}`
    }
  },
  // Literal找到的可能是函数中调用参数的文字 也可能是jsx属性中的文字
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
import { useI18n } from "react-intl";
import { Button, Toast, Popover } from 'components';

const Comp = props => {
  const {
    t
  } = useI18n();

  const tips = () => {
    Toast.info(t("tips"));
    Toast({
      text: t("tips")
    });
  };

  return <div>
      <Button onClick={tips}>{t("btn")}</Button>
      <Popover tooltip={t("popover")} />
    </div>;
};

export default Comp;
 */
