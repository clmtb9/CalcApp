import type { ReactElement } from 'react'
import { parseMathExpression, type AstNode } from './ast'

interface MathExpressionViewProps {
  expression: string
  exactMode: boolean
}

export function MathExpressionView({ expression, exactMode }: MathExpressionViewProps) {
  if (!expression.trim()) {
    return <span className="math-empty"> </span>
  }

  try {
    const ast = parseMathExpression(expression)
    return <span className="math-node">{renderNode(ast, exactMode)}</span>
  } catch {
    return <span className="math-fallback">{expression}</span>
  }
}

function renderNode(node: AstNode, exactMode: boolean): ReactElement {
  switch (node.type) {
    case 'num':
      return <span>{node.raw}</span>

    case 'const':
      return <span>{node.name === 'pi' ? 'π' : node.name}</span>

    case 'sci':
      return (
        <span>
          {node.mantissa}×10
          <sup>{node.exponent}</sup>
        </span>
      )

    case 'neg':
      return (
        <span>
          -{renderNode(node.value, exactMode)}
        </span>
      )

    case 'paren':
      return (
        <span>
          ({renderNode(node.value, exactMode)})
        </span>
      )

    case 'fact':
      return (
        <span>
          {renderNode(node.value, exactMode)}!
        </span>
      )

    case 'fn':
      if (node.name === 'sqrt') {
        return (
          <span className="sqrt-wrap">
            <span className="sqrt-sign">√</span>
            <span className="sqrt-body">{renderNode(node.arg, exactMode)}</span>
          </span>
        )
      }
      if (node.name === 'abs') {
        return (
          <span>
            |{renderNode(node.arg, exactMode)}|
          </span>
        )
      }
      return (
        <span>
          {node.name}({renderNode(node.arg, exactMode)})
        </span>
      )

    case 'binop':
      if (node.op === '/' && exactMode) {
        return (
          <span className="frac">
            <span className="frac-top">{renderNode(node.left, exactMode)}</span>
            <span className="frac-bar" />
            <span className="frac-bottom">{renderNode(node.right, exactMode)}</span>
          </span>
        )
      }

      if (node.op === '^') {
        return (
          <span>
            {renderNode(node.left, exactMode)}
            <sup>{renderNode(node.right, exactMode)}</sup>
          </span>
        )
      }

      return (
        <span>
          {renderNode(node.left, exactMode)} {displayOperator(node.op)} {renderNode(node.right, exactMode)}
        </span>
      )

    default:
      return <span>?</span>
  }
}

function displayOperator(op: string): string {
  if (op === '*') {
    return '×'
  }
  if (op === '/') {
    return '÷'
  }
  return op
}
