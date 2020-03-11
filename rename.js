const { parse } = require("@babel/parser");
const { default: traverse } = require("@babel/traverse");
const { default: generate } = require("@babel/generator");
const t = require("@babel/types");

/**
 * 本例给出了如何传递状态的指导，
 * 通过traverse传递的第二个参数中的字段可以再visitor中通过this访问到，
 * 这样只会在当前的递归中传递状态，而不会影响到其他的节点。
 */
const source = `function square(n) {
  return n * n;
}
n;
`;

const updateParamNameVisitor = {
  Identifier(path) {
    if (path.node.name === this.paramName) {
      path.node.name = "x";
    }
  }
};

const MyVisitor = {
  FunctionDeclaration(path) {
    const param = path.node.params[0];
    const paramName = param.name;
    param.name = "x";

    path.traverse(updateParamNameVisitor, { paramName });
  }
};

const ast = parse(source);
traverse(ast, MyVisitor);

const { code } = generate(ast);
console.log(code);
