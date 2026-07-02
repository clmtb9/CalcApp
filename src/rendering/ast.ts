export type AstNode =
  | { type: 'num'; value: number; raw: string }
  | { type: 'const'; name: string }
  | { type: 'sci'; mantissa: number; exponent: number; raw: string }
  | { type: 'empty' }
  | { type: 'neg'; value: AstNode }
  | { type: 'paren'; value: AstNode }
  | { type: 'fact'; value: AstNode }
  | { type: 'fn'; name: string; arg: AstNode }
  | { type: 'binop'; op: '+' | '-' | '*' | '/' | '%' | '^'; left: AstNode; right: AstNode }

interface Token {
  type: 'number' | 'identifier' | 'operator' | 'paren'
  value: string
}

export function parseMathExpression(input: string): AstNode {
  const tokens = tokenize(input)
  let pos = 0

  function peek(): Token | null {
    return tokens[pos] ?? null
  }

  function consume(): Token {
    const token = tokens[pos]
    if (!token) {
      throw new Error('Unexpected end of expression')
    }
    pos += 1
    return token
  }

  function parseAddSub(): AstNode {
    let node = parseMulDivMod()
    while (true) {
      const token = peek()
      if (!token || token.type !== 'operator' || (token.value !== '+' && token.value !== '-')) {
        break
      }
      consume()
      const right = parseMulDivMod()
      node = {
        type: 'binop',
        op: token.value as '+' | '-',
        left: node,
        right,
      }
    }
    return node
  }

  function parseMulDivMod(): AstNode {
    let node = parsePow()
    while (true) {
      const token = peek()
      if (!token || token.type !== 'operator' || !['*', '/', '%'].includes(token.value)) {
        break
      }
      consume()
      const right = parsePow()
      node = {
        type: 'binop',
        op: token.value as '*' | '/' | '%',
        left: node,
        right,
      }
    }
    return node
  }

  function parsePow(): AstNode {
    let node = parseUnary()
    const token = peek()
    if (token && token.type === 'operator' && token.value === '^') {
      consume()
      const right = parsePow()
      node = {
        type: 'binop',
        op: '^',
        left: node,
        right,
      }
    }
    return node
  }

  function parseUnary(): AstNode {
    const token = peek()
    if (token && token.type === 'operator' && token.value === '-') {
      consume()
      return {
        type: 'neg',
        value: parseUnary(),
      }
    }
    return parseAtom()
  }

  function parseAtom(): AstNode {
    const token = consume()

    let base: AstNode
    if (token.type === 'number') {
      const sciMatch = token.value.match(/^([+-]?\d+(?:\.\d+)?)E([+-]?\d+)$/)
      if (sciMatch) {
        base = {
          type: 'sci',
          mantissa: Number(sciMatch[1]),
          exponent: Number(sciMatch[2]),
          raw: token.value,
        }
      } else {
        base = {
          type: 'num',
          value: Number(token.value),
          raw: token.value,
        }
      }
    } else if (token.type === 'identifier') {
      const next = peek()
      if (next && next.type === 'paren' && next.value === '(') {
        consume()
        let arg: AstNode
        const maybeClose = peek()
        if (maybeClose && maybeClose.type === 'paren' && maybeClose.value === ')') {
          arg = { type: 'empty' }
        } else {
          arg = parseAddSub()
        }
        const close = consume()
        if (close.type !== 'paren' || close.value !== ')') {
          throw new Error('Missing closing parenthesis in function')
        }
        base = {
          type: 'fn',
          name: token.value,
          arg,
        }
      } else {
        base = {
          type: 'const',
          name: token.value,
        }
      }
    } else if (token.type === 'paren' && token.value === '(') {
      let inside: AstNode
      const maybeClose = peek()
      if (maybeClose && maybeClose.type === 'paren' && maybeClose.value === ')') {
        inside = { type: 'empty' }
      } else {
        inside = parseAddSub()
      }
      const close = consume()
      if (close.type !== 'paren' || close.value !== ')') {
        throw new Error('Missing closing parenthesis')
      }
      base = {
        type: 'paren',
        value: inside,
      }
    } else {
      throw new Error(`Unexpected token: ${token.value}`)
    }

    while (peek()?.type === 'operator' && peek()?.value === '!') {
      consume()
      base = {
        type: 'fact',
        value: base,
      }
    }

    return base
  }

  const ast = parseAddSub()
  if (pos !== tokens.length) {
    throw new Error('Trailing tokens in expression')
  }
  return ast
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const ch = input[i]
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i += 1
      continue
    }

    if ('+-*/%^!'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch })
      i += 1
      continue
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch })
      i += 1
      continue
    }

    if (/\d|\./.test(ch)) {
      let num = ch
      i += 1
      while (i < input.length && /[\d.]/.test(input[i])) {
        num += input[i]
        i += 1
      }
      if (input[i] === 'E') {
        num += input[i]
        i += 1
        if (input[i] === '+' || input[i] === '-') {
          num += input[i]
          i += 1
        }
        while (i < input.length && /\d/.test(input[i])) {
          num += input[i]
          i += 1
        }
      }
      tokens.push({ type: 'number', value: num })
      continue
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let id = ch
      i += 1
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        id += input[i]
        i += 1
      }
      tokens.push({ type: 'identifier', value: id })
      continue
    }

    throw new Error(`Invalid character: ${ch}`)
  }

  return tokens
}
