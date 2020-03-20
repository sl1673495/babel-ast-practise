const { parse } = require("@babel/parser");
const { default: traverse } = require("@babel/traverse");
const { default: generate } = require("@babel/generator");
const t = require("@babel/types");

/**
 * 本例子是根据公司真实需求改编，
 * 从组件库引入中删除某个引入，转而使用自定义的引入。
 * 注意做好判断，防止insertAfter后继续visit新生成的节点导致死循环。
 */
const ast = parse("import { Image, Button } from 'trnw-components'", {
  sourceType: "module"
});

traverse(ast, {
  ImportDeclaration(importPath) {
    importPath.traverse({
      ImportSpecifier(path) {
        if (
          path.node.local.name === "Image" &&
          importPath.node.source.value === "trnw-components"
        ) {
          path.remove();
          importPath.insertAfter(
            t.importDeclaration(
              [t.importSpecifier(t.identifier("Image"), t.identifier("Image"))],
              t.stringLiteral("@/components")
            )
          );
        }
      }
    });
  }
});
const { code } = generate(ast);
console.log(code);

/**
import { Button } from 'trnw-components';
import { Image } from "@/components";
 */