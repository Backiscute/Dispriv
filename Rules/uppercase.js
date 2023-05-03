/* eslint-disable */
module.exports = {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'enforce variables and functions to start with an uppercase letter',
        category: 'Variables and functions naming convention',
        recommended: true,
      },
      schema: [],
      fixable: 'code',
    },
    create: function (context) {
      return {
        VariableDeclarator(node) {
          const name = node.id.name;
          if (
            name.charAt(0) !== name.charAt(0).toUpperCase() &&
            !(
              node.init &&
              node.init.type === 'CallExpression' &&
              node.init.callee.name === 'require'
            )
          ) {
            const declarationIdentifier = node.id;
            const references = context.getScope().references.filter(reference => {
              if (reference.identifier === declarationIdentifier) return false;
              if (reference.identifier.type === "Identifier") return reference.identifier.name === name;
              return false;
            });
  
            context.report({
              node: node,
              message: `Variable '${name}' should start with an uppercase letter.`,
              fix: function (fixer) {
                // Return a fixer object that updates the variable name
                return [
                  fixer.replaceTextRange(
                    [node.id.range[0], node.id.range[0] + 1],
                    name.charAt(0).toUpperCase()
                  ),
                  ...references.map((ref) => fixer.replaceTextRange([ref.identifier.range[0], ref.identifier.range[0] + 1], name.charAt(0).toUpperCase()))
                ]
              },
            });
          }
        },
        FunctionDeclaration(node) {
          const name = node.id.name;
          if (
            name.charAt(0) !== name.charAt(0).toUpperCase() &&
            !(
              node.init &&
              node.init.type === 'CallExpression' &&
              node.init.callee.name === 'require'
            )
          ) {
            const declarationIdentifier = node.id;
            const references = context.getScope().references.filter(reference => {
              if (reference.identifier === declarationIdentifier) return false;
              if (reference.identifier.type === "CallExpression") return reference.identifier.callee.name === name;
              return false;
            });
            
            context.report({
              node: node,
              message: `Function '${name}' should start with an uppercase letter. ${references.map(ref => ref.identifier.name).join(",")}.`,
              fix: function (fixer) {
                // Return a fixer object that updates the function name
                return [
                  fixer.replaceTextRange(
                    [node.id.range[0], node.id.range[0] + 1],
                    name.charAt(0).toUpperCase()
                  ),
                  ...references.map((ref) => fixer.replaceTextRange([ref.identifier.range[0], ref.identifier.range[0] + 1], name.charAt(0).toUpperCase()))
                ]
              },
            });
          }
        }
      };
    },
  };