import type { ReactElement } from 'react'

interface ExpressionLineProps {
  expr: string
  cursorPos: number
}

interface Part {
  text: string
  className: string
}

const PRIORITY_TOKENS = ['asin', 'acos', 'atan', 'exp', 'sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'abs']

export function ExpressionLine({ expr, cursorPos }: ExpressionLineProps) {
  const parts = tokenizeExpr(expr)

  let currentPos = 0
  const rendered: ReactElement[] = []

  const pushCursor = (index: number) => {
    rendered.push(<span key={`cursor-${index}`} className="cursor-blink" aria-hidden="true" />)
  }

  if (cursorPos === 0) {
    pushCursor(0)
  }

  parts.forEach((part, idx) => {
    const start = currentPos
    currentPos += part.text.length

    rendered.push(
      <span key={`part-${idx}`} className={part.className}>
        {part.text}
      </span>,
    )

    if (cursorPos === currentPos) {
      pushCursor(idx + 1)
    }

    if (cursorPos > start && cursorPos < currentPos) {
      // Cursor inside a token: split for precise positioning.
      const local = cursorPos - start
      rendered.pop()
      rendered.push(
        <span key={`part-a-${idx}`} className={part.className}>
          {part.text.slice(0, local)}
        </span>,
      )
      pushCursor(idx + 1000)
      rendered.push(
        <span key={`part-b-${idx}`} className={part.className}>
          {part.text.slice(local)}
        </span>,
      )
    }
  })

  if (cursorPos >= expr.length && expr.length > 0) {
    pushCursor(999999)
  }

  if (expr.length === 0) {
    return <span className="expr-empty"> </span>
  }

  return <>{rendered}</>
}

function tokenizeExpr(expr: string): Part[] {
  const out: Part[] = []
  let i = 0

  while (i < expr.length) {
    const rest = expr.slice(i)
    const fn = PRIORITY_TOKENS.find((name) => rest.startsWith(name))
    if (fn) {
      out.push({
        text: fn,
        className: fn.startsWith('a') ? 'expr-inv' : 'expr-fn',
      })
      i += fn.length
      continue
    }

    const ch = expr[i]

    if (/[0-9.]/.test(ch)) {
      out.push({ text: ch, className: 'expr-num' })
      i += 1
      continue
    }

    if (ch === 'p' && expr.slice(i, i + 2) === 'pi') {
      out.push({ text: 'pi', className: 'expr-cst' })
      i += 2
      continue
    }

    if (ch === 'e') {
      out.push({ text: 'e', className: 'expr-cst' })
      i += 1
      continue
    }

    if ('+-*/^%'.includes(ch)) {
      out.push({ text: ch, className: 'expr-op' })
      i += 1
      continue
    }

    if ('()'.includes(ch)) {
      out.push({ text: ch, className: 'expr-par' })
      i += 1
      continue
    }

    out.push({ text: ch, className: 'expr-num' })
    i += 1
  }

  return out
}
