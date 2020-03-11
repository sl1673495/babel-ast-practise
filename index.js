const { parse } = require("@babel/parser");
const { default: traverse } = require("@babel/traverse");
const { default: generate } = require("@babel/generator");
const t = require("@babel/types");

const ast = parse("import { Image, Button } from 'components'", {
  sourceType: "module"
});

const visitor = {
  ImportDeclaration(importPath) {
    importPath.traverse({
      ImportSpecifier(path) {
        if (
          path.node.local.name === "Image" &&
          importPath.node.source.value === "components"
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
};

traverse(ast, visitor);
const { code } = generate(ast);
console.log(code);
