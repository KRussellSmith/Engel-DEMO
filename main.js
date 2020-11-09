const Engel = (() =>
{
	const Enum = (...args) =>
	{
		const result = {};
		let i = 0;
		for (let i = 0; i < args.length; ++i) {
			result[result[args[i]] = i] = args[i];
		}
		return result;
	};
	const op = Enum(
		'ADD',       'SUB',       'MUL',
		'DIV',       'EXP',       'LOAD',
		'LS',        'RS',        'BAND',
		'BOR',       'XOR',       'BNOT',
		'NEG',       'NOT',       'MOD',
		'INC',       'DEC',       'CONST',
		'TRUE',      'FALSE',     'NULL',
		'JMP',       'AND',       'OR',
		'CND',       'CND_NOT',   'POP',
		'EMIT',      'CONCAT',    'TO_STR',
		'STORE',     'GET',       'LT',
		'GT',        'LE',        'GE',
		'EQUIV',     'NOT_EQUIV', 'STORE_LOCAL',
		'GET_LOCAL', 'SET',       'ERUPT',
		'DUP', 'RETURN');
	
	const ValueType = Enum(
		'INT',  'REAL',  'STRING',
		'FUNC', 'NULL',  'BOOL',
		'HASH', 'ARRAY', 'OBJ');
	const Value = (type, value) => ({
		type,
		value,
	});
	const compile = (() =>
	{
		const TokenType = Enum(
			'ADD',       'SUB',        'MUL',
			'DIV',       'EXP',        'MOD',
			'LS',        'RS',         'SQUIGGLY',
			'BAND',      'BOR',        'ADD_SET',
			'SUB_SET',   'MUL_SET',    'DIV_SET',
			'EXP_SET',   'MOD_SET',    'LS_SET',
			'RS_SET',    'STRING',     'INTERP',
			'REAL',      'INT',        'ID',
			'ENDL',      'LPAREN',     'RPAREN',
			'TRUE',      'FALSE',      'AND',
			'OR',        'EQUIV',      'ELSE',
			'IF',        'SET',        'LBRACE',
			'LBRACK',    'RBRACK',     'COMMA',
			'RBRACE',    'LT',         'GT',
			'LE',        'GE',         'NOT',
			'NOT_EQUIV', 'NULL',       'FOR',
			'WHILE',     'BREAK',      'CONTINUE',
			'THIS',      'CALL',       'MATCH',
			'RETURN',    'LET',        'DEC',
			'FUNC',      'HASH_START', 'OBJ_START',
			'FAT_ARROW', 'ERROR',      'FIN');
		const Token = (type, lexer, value = null) => ({
		   type,
		   line: lexer.line,
		   col: lexer.col,
		   value: value === null ? lexer.source.substring(lexer.start, lexer.curr) : value,
		   str()
		   {
		      return `[${TokenType[this.type]}, '${this.value}']`;
		   }
		});
		const lexer = source =>
		{
			const keywords = {
				'if':     TokenType.IF,
				'else':   TokenType.ELSE,
				'true':   TokenType.TRUE,
				'false':  TokenType.FALSE,
				'jump':   TokenType.CONTINUE,
				'break':  TokenType.BREAK,
				'while':  TokenType.WHILE,
				'for':    TokenType.FOR,
				'match':  TokenType.MATCH,
				'return': TokenType.RETURN,
				'this':   TokenType.THIS,
				'call':   TokenType.CALL,
				'let':    TokenType.LET,
				'dec':    TokenType.DEC,
			};
			const Lexer = {
				source,
				line: 1,
				column: 1,
				start: 0,
				curr: 0,
				interps: [],
				newLine()
				{
					++this.line;
					this.column = 1;
				},
				fin()
				{
					return this.curr >= this.source.length;
				},
				advance()
				{
					++this.column;
					return this.source[this.curr++];
				},
				look()
				{
					return this.source[this.curr];
				},
				spy(x)
				{
					return this.look() === x;
				},
				match(x)
				{
					if (this.fin())
					{
						return false;
					}
					if (this.spy(x))
					{
						this.advance();
						return true;
					}
					return false;
				},
				skipUseless()
				{
					for (;;)
					{
						switch (this.look())
						{
							case ' ':
							case '\t':
							case '\r':
							case '\f':
									this.advance();
									break;
							case ';':
								while (!this.fin() && !!this.spy('\n'))
								{
									this.advance();
								}
								break;
							default: return;
						}
					}
				},
				isAlpha(x)
				{
					return RegExp(/^\p{L}/, 'u').test(x);
				},
				isDigit(x)
				{
					return /[0-9]/.test(x);
				},
				isAlphaNum(x)
				{
					return this.isAlpha(x) || this.isDigit(x);
				},
				error(message)
				{
					return Token(TokenType.ERROR, this, message);
				},
				singleString()
				{
					let string = '';
					let done = false;
					let type = TokenType.STRING;
					do
					{
						if (this.fin())
						{
							return this.error('Unterminated string!');
						}
						const curr = this.advance();
						switch (curr)
						{
							// The terminator:
							case '\'':
								done = true;
								break;
							// Escape sequences:
							case '\\':
							{
								switch (this.look())
								{
									case 'n':
										string += '\n';
										break;
									case 'r':
										string += '\r';
										break;
									case 'f':
										string += '\f';
										break;
									case 't':
										string += '\t';
										break;
									case 'v':
										string += '\v';
										break;
									case 'a':
										string += '\a';
										break;
									case 'b':
										string += '\b';
										break;
									case '\'':
										string += '\'';
										break;
									case '#':
										string += '#';
										break;
									case '\\':
										string += '\\';
										break;
									case '\n':
										break;
									default:
										return this.error(`Unrecognized escape: \\${this.look()}`);
									}
									this.advance();
									break;
								}
								// Interpolation:
								case '#':
								{
									if (this.match('{'))
									{
										type = TokenType.INTERP;
										this.interps.push(1);
										done = true;
										break;
									}
									// Fall-through
								}
								default:
								{
									if (curr == '\n')
									{
										this.newLine();
									}
									string += curr;
									break;
								}
							}
					} while (!done);
					return Token(type, this, string);
				},
				scan()
				{
					this.skipUseless();
					this.start = this.curr;
					if (this.fin())
					{
						if (this.interps.length > 0)
						{
							return this.error('Unclosed interpolation!');
						}
						return Token(TokenType.FIN, this);
					}
					const char = this.advance();
					switch (char)
					{
						case '+':
							if (this.match('='))
							{
								return Token(TokenType.ADD_SET, this);
							}
							return Token(TokenType.ADD, this);
						case '-':
							if (this.match('='))
							{
								return Token(TokenType.SUB_SET, this);
							}
							if (this.match('>'))
							{
								return Token(TokenType.FUNC, this);
							}
							return Token(TokenType.SUB, this);
						case '*':
							if (this.match('='))
							{
								return Token(TokenType.MUL_SET, this);
							}
							return Token(TokenType.MUL, this);
						case '/':
							if (this.match('='))
							{
								return Token(TokenType.DIV_SET, this);
							}
							return Token(TokenType.DIV, this);
						case '^':
							if (this.match('='))
							{
								return Token(TokenType.EXP_SET, this);
							}
							return Token(TokenType.EXP, this);
						case '%':
							if (this.match('='))
							{
								return Token(TokenType.MOD_SET, this);
							}
							return Token(TokenType.MOD, this);
						case '~':
							if (this.match('='))
							{
								return Token(TokenType.SQUIGGLY_SET, this);
							}
							return Token(TokenType.SQUIGGLY, this);
						case '&':
							if (this.match('&'))
							{
								return Token(TokenType.AND, this)
							}
							if (this.match('='))
							{
							   return Token(TokenType.BAND_SET, this);
							}
							return Token(TokenType.BAND, this);
						case '|':
							if (this.match('|'))
							{
							   return Token(TokenType.OR, this)
							}
							if (this.match('='))
							{
							   return Token(TokenType.BOR_SET, this);
							}
							return Token(TokenType.BOR, this);
						case '<':
							if (this.match('<'))
							{
								if (this.match('='))
								{
									return Token(TokenType.LS_SET, this);
								}
							   return Token(TokenType.LS, this)
							}
							if (this.match('='))
							{
							   return Token(TokenType.LE, this);
							}
							return Token(TokenType.LT, this);
						case '>':
							if (this.match('>'))
							{
							   if (this.match('='))
							   {
							      return Token(TokenType.RS_SET, this);
							   }
							   return Token(TokenType.RS, this)
							}
							if (this.match('='))
							{
							   return Token(TokenType.GE, this);
							}
							return Token(TokenType.GT, this);
						case '!':
							if (this.match('='))
							{
							   return Token(TokenType.NOT_EQUIV, this);
							}
							return Token(TokenType.NOT, this);
						case '=':
							if (this.match('='))
							{
							   return Token(TokenType.EQUIV, this);
							}
							else if (this.match('>'))
							{
								return Token(TokenType.FAT_ARROW, this);
							}
							return Token(TokenType.SET, this);
						case '#':
							if (this.match('['))
							{
							   return Token(TokenType.HASH_START, this);
							}
							else if (this.match('{'))
							{
								return Token(TokenType.OBJ_START, this);
							}
							return this.error('Unexpected hash (#)');
						case '\'':
							return this.singleString();
						case '\n':
							this.newLine();
							return Token(TokenType.ENDL, this);
						case ',':
							return Token(TokenType.COMMA, this);
						case '{':
							if (this.interps.length >= 0)
							{
								++this.interps[this.interps.length - 1];
							}
							return Token(TokenType.LBRACE, this);
						case '}':
							if (this.interps.length >= 0)
							{
							   --this.interps[this.interps.length - 1];
							   if (this.interps[this.interps.length - 1] <= 0)
							   {
							   	this.interps.pop();
							   	return this.singleString();
							   }
							}
							return Token(TokenType.RBRACE, this);
						case '(':
							return Token(TokenType.LPAREN, this);
						case ')':
							return Token(TokenType.RPAREN, this);
						case '[':
						return Token(TokenType.LBRACK, this);
						case ']':
						return Token(TokenType.RBRACK, this);
						default:
						{
							if (this.isDigit(char))
							{
								let type = TokenType.INT;
								while (this.isDigit(this.look()))
								{
									this.advance();
								}
								if (this.match('.'))
								{
									type = TokenType.REAL;
									while (this.isDigit(this.look()))
									{
										this.advance();
									}
								}
								return Token(type, this)
							}
							else if (this.isAlpha(char))
							{
								while (this.isAlphaNum(this.look()))
								{
									this.advance();
								}
								const ident = this.source.substring(this.start, this.curr);
								if (ident in keywords)
								{
									return Token(keywords[ident], this);
								}
								return Token(TokenType.ID, this);
							}
							return this.error(`Unrecognized character: '${char}'`);
						}
					}
				},
			};
			return () => Lexer.scan.call(Lexer);
		};
		
		const NodeType = Enum(
			'ADD',        'SUB',           'MUL',
			'DIV',        'EXP',           'MOD',
			'LS',         'RS',            'XOR',
			'BAND',       'BOR',           'BNOT',
			'NEG',        'ADD_SET',       'GROUP',
			'SUB_SET',    'MUL_SET',       'DIV_SET',
			'EXP_SET',    'MOD_SET',       'LS_SET',
			'RS_SET',     'STRING',        'INTERP',
			'REAL',       'INT',           'GET',
			'ENDL',       'LPAREN',        'RPAREN',
			'TRUE',       'FALSE',         'AND',
			'OR',         'EQUIV',         'ELSE',
			'IF',         'SET',           'LBRACE',
			'RBRACE',     'LT',            'GT',
			'LE',         'GE',            'NOT',
			'NOT_EQUIV',  'NULL',          'FOR',
			'WHILE',      'BREAK',         'CONTINUE',
			'THIS',       'CALL',          'MATCH',
			'RETURN',     'DECLARE',       'BLOCK',
			'FUNC_BLOCK', 'FUNC',          'HASH',
			'SUBSCRIPT',  'SET_SUBSCRIPT', 'ASSIGN',
			'OBJ',        'EXPR',          'FIN');
		const Node = (() =>
		{
			const base = (type, line = 0) => ({
				type, line,
			});
			return {
				Constant: (type, token) => ({
					...base(type, token.line),
					value: token.value,
				}),
				Nilary: base,
				Unary: (type, value, line) => ({
					...base(type, line),
					value
				}),
				Binary: (type, left, right, line) => ({
					...base(type, line),
					left, right,
				}),
				Trinary: (type, left, middle, right, line) => ({
					...base(type, line),
					
				}),
				Get: (token) => ({
					...base(NodeType.GET, token.line),
					name: token.value,
				}),
				IfElse: (condition, then, other, line) => ({
					...base(NodeType.IF, line),
					condition, then, other,
				}),
				While: (condition, then, other, line) => ({
					...base(NodeType.WHILE, line),
					condition, then, other,
				}),
				Case: (checks = [], then) => ({
					checks, then,
				}),
				Match: (comp, cases, other, line) => ({
					...base(NodeType.MATCH), comp, cases, other,
				}),
				Interpolation: (token, value) => ({
					chars: token.value,
					line: token.line,
					value,
				}),
				StringInterp: (interps, terminator) => ({
					...base(NodeType.INTERP, terminator.line),
					interps,
					terminator: terminator.value,
				}),
				Declare: (name, value) => ({
					name, value,
				}),
				Declarations: (isConst, line) => ({
					...base(NodeType.DECLARE, line),
					isConst,
					list: [],
				}),
				Assign: (left, right, line) => ({
					...base(NodeType.SET, line),
					left, right,
				}),
				Func: (args, name, body, line) => ({
					...base(NodeType.FUNC, line),
					args, name, body,
				}),
				FuncCall: (args, callee, line) => ({
					...base(NodeType.CALL, line),
					args, callee,
				}),
				Block: (nodes = [], line) => ({
					...base(NodeType.BLOCK, line),
					nodes,
				}),
				FuncBlock: (nodes, line) => ({
				   ...base(NodeType.FUNC_BLOCK, line),
				   nodes,
				}),
			}
		})();
		const parser = (scan) =>
		{
			const Parser = {
				curr:  null,
				prev:  null,
				panic: false,
				advance()
				{
					this.prev = this.curr;
					this.curr = scan();
					// Lexical errors will be handled here.
					return this.curr;
				},
				error(token, message)
				{
					console.log(`[${token.line}:${token.collumn}] ${message}`);
				},
				sniff(type)
				{
					return type === this.curr.type;
				},
				eat(type, error)
				{
					if (this.sniff(type))
					{
						this.advance();
						return;
					}
					this.advance();
					this.error(this.curr, error);
				},
				taste(type)
				{
					if (this.sniff(type))
					{
						this.advance();
						return true;
					}
					return false;
				},
				skipBreaks()
				{
					while (this.taste(TokenType.ENDL));
				},
				funcBody()
				{
					const start = this.curr;
					if (this.taste(TokenType.LBRACE))
					{
						nodes = [];
						for (;;)
						{
							if (this.sniff(TokenType.FIN))
							{
								this.error('Unclosed function body.');
								return null;
							}
							if (this.taste(TokenType.RBRACE))
							{
								break;
							}
							const stmt = this.declaration();
							if (stmt !== null)
							{
								nodes.push(stmt);
							}
						}
						return Node.FuncBlock(nodes, start.line)
					}
					else
					{
						const value = this.expression();
						return Node.Unary(NodeType.RETURN, value, start.line)
					}
				},
				finishCall(node)
				{
					if (this.taste(TokenType.LPAREN))
					{
						const start = this.prev;
						const args  = [];
						if (!this.taste(TokenType.RPAREN))
						{
							do
							{
								this.skipBreaks();
								args.push(this.expression());
								this.skipBreaks();
							} while (this.taste(TokenType.COMMA));
							this.eat(TokenType.RPAREN, 'Expected closing parenthenis to call.');
						}
						return Node.FuncCall(args, node, start.line);
					}
					return node;
				},
				callTo(node)
				{
					let result = node;
					for (;;)
					{
						if (this.sniff(TokenType.LPAREN))
						{
							result = this.finishCall(result);
						}
						else if (this.taste(TokenType.LBRACK))
						{
							const subscript = this.expression();
							this.eat(TokenType.RBRACK, 'Unclosed subscription.');
							result = Node.Binary(NodeType.SUBSCRIPT, result, subscript, this.last.line);
						}
						else
						{
							break;
						}
					}
					return result;
				},
				factor()
				{
					let result;
					if (this.taste(TokenType.INT))
					{
						result = Node.Constant(NodeType.INT, this.prev);
					}
					else if (this.taste(TokenType.REAL))
					{
					   result = Node.Constant(NodeType.REAL, this.prev);
					}
					else if (this.taste(TokenType.STRING))
					{
					   result = Node.Constant(NodeType.STRING, this.prev);
					}
					else if (this.taste(TokenType.INTERP))
					{
						const interps = [];
						do
						{
							const start = this.prev;
							const value = this.expression();
							const interp = Node.Interpolation(start, value);
							interps.push(interp);
						} while (this.taste(TokenType.INTERP));
						this.eat(TokenType.STRING, 'Expected closing string.');
					   result = Node.StringInterp(interps, this.prev);
					}
					else if (this.taste(TokenType.TRUE))
					{
					   result = Node.Nilary(NodeType.TRUE, this.prev.line);
					}
					else if (this.taste(TokenType.FALSE))
					{
					   result = Node.Nilary(NodeType.FALSE, this.prev.line);
					}
					else if (this.taste(TokenType.NULL))
					{
					   result = Node.Nilary(NodeType.NULL, this.prev.line);
					}
					else if (this.taste(TokenType.ID))
					{
					   result = Node.Get(this.prev);
					}
					else if (this.taste(TokenType.CALL))
					{
					   result = Node.Get(this.prev);
					}
					else if (this.taste(TokenType.THIS))
					{
					   result = Node.Get(this.prev);
					}
					else if (this.taste(TokenType.SUB))
					{
					   result = Node.Unary(NodeType.NEG, this.factor());
					}
					else if (this.taste(TokenType.SQUIGGLY))
					{
					   result = Node.Unary(NodeType.BNOT, this.factor());
					}
					else if (this.taste(TokenType.NOT))
					{
					   result = Node.Unary(NodeType.NOT, this.factor());
					}
					else if (this.taste(TokenType.LPAREN))
					{
						let isFunc = false;
						let args;
						
						this.skipBreaks();
						let expr = null;
						if (this.taste(TokenType.RPAREN))
						{
							isFunc = true;
							args = [];
						}
						else
						{
							expr = this.expression();
							this.skipBreaks();
							if (this.taste(TokenType.COMMA))
							{
								args = [];
								args.push(expr);
								do
								{
									this.skipBreaks();
									args.push(this.expression());
									this.skipBreaks();
								} while (this.taste(TokenType.COMMA));
								isFunc = true;
							}
							this.eat(TokenType.RPAREN, 'Expected closing parenthensis.');
						}
						if (isFunc)
						{
							this.eat(TokenType.FUNC, 'Expected skinny arrow (->)');
							this.skipBreaks();
							const body = this.funcBody();
							result = Node.Func(args, null, body, this.prev.line);
						}
						else if (this.taste(TokenType.FUNC))
						{
							isFunc = true;
							args = [expr];
							this.skipBreaks();
							const body = this.funcBody();
							
							result = Node.Func(args, null, body, this.prev.line);
						}
						else
						{
							result = Node.Unary(NodeType.GROUP, expr, this.prev.line);
						}
					}
					else if (this.taste(TokenType.LBRACK))
					{
						const elements = [];
						this.skipBreaks();
						if (this.taste(TokenType.RBRACK))
						{
							result = Node.Array(elements, this.prev.line);
						}
						else
						{
							do
							{
								this.skipBreaks();
								elements.push(this.expression());
								this.skipBreaks();
							} while (this.taste(TokenType.COMMA));
							
							this.eat(TokenType.RBRACK, 'Expected closing bracket to array.');
							result = Node.Array(elements, this.prev.line);
						}
					}
					else if (this.taste(TokenType.MATCH))
					{
						const start = this.curr;
						this.skipBreaks();
						const comp = this.expression();
						this.skipBreaks();
						this.eat(TokenType.LBRACE, 'Expected opening brace ({).');
						const cases = [];
						for (;;)
						{
							this.skipBreaks();
							if (this.taste(TokenType.FIN))
							{
								this.error(start, 'Unclosed match.');
								break;
							}
							if (this.taste(TokenType.RBRACE))
							{
								break;
							}
							const checks = [];
							do
							{
								this.skipBreaks();
								const expr = this.expression();
								checks.push(expr);
								this.skipBreaks();
							} while (this.taste(TokenType.COMMA));
							this.eat(TokenType.FAT_ARROW, 'Expected fat arrow (=>).');
							this.skipBreaks();
							const then = this.expression();
							const curr = Node.Case(checks, then);
							cases.push(curr);
						}
						let other = null;
						this.skipBreaks();
						if (this.taste(TokenType.ELSE))
						{
							this.skipBreaks();
							other = this.expression();
						}
						result = Node.Match(comp, cases, other, start.line);
					}
					else
					{
						this.error(this.curr, 'Invalid expression.');
						this.advance();
						return null;
					}
					return this.callTo(result);
				},
				exponentation()
				{
					let result = this.factor();
					if (
						this.taste(TokenType.EXP))
					{
						this.skipBreaks();
						const right = this.exponentation();
						result = Node.Binary(NodeType.EXP, result, right);
					}
					return result;
				},
				multiplication()
				{
					let result = this.exponentation();
					while (
						this.taste(TokenType.MUL) ||
						this.taste(TokenType.MOD) ||
						this.taste(TokenType.DIV))
					{
						const start = this.prev;
						this.skipBreaks();
						const right = this.exponentation();
						let type = null;
						switch (start.type)
						{
							case TokenType.MUL:
								type = NodeType.MUL;
								break;
							case TokenType.MOD:
								type = NodeType.MOD;
								break;
							case TokenType.DIV:
								type = NodeType.DIV;
								break;
						}
						result = Node.Binary(type, result, right);
					}
					return result;
				},
				addition()
				{
					let result = this.multiplication();
					while (
						this.taste(TokenType.ADD) ||
						this.taste(TokenType.SUB))
					{
						const start = this.prev;
						this.skipBreaks();
						const right = this.multiplication();
						let type = null;
						switch (start.type)
						{
							case TokenType.ADD:
								type = NodeType.ADD;
								break;
							case TokenType.SUB:
								type = NodeType.SUB;
								break;
						}
						result = Node.Binary(type, result, right);
					}
					return result;
				},
				shift()
				{
					let result = this.addition();
					while (
						this.taste(TokenType.LS) ||
						this.taste(TokenType.RS))
					{
						const token = this.prev;
						this.skipBreaks();
						const right = this.addition();
						let type = null;
						switch (token.type)
						{
							case TokenType.LS:
								type = NodeType.LS;
								break;
							case TokenType.RS:
								type = nodeType.RS;
								break;
						}
						result = Node.Binary(type, result, right);
					}
					return result;
				},
				band()
				{
					let result = this.shift();
					while (
						this.taste(TokenType.BAND))
					{
						this.skipBreaks();
						const right = this.shift();
						result = Node.Binary(NodeType.BAND, result, right);
					}
					return result;
				},
				xor()
				{
					let result = this.band();
					while (
						this.taste(TokenType.SQUIGGLY))
					{
						this.skipBreaks();
						const right = this.band();
						result = Node.Binary(NodeType.XOR, result, right);
					}
					return result;
				},
				bor()
				{
					let result = this.xor();
					while (
						this.taste(TokenType.BOR))
					{
						this.skipBreaks();
						const right = this.xor();
						result = Node.Binary(type, result, right);
					}
					return result;
				},
				comparision()
				{
					let result = this.bor();
					while (
						this.taste(TokenType.LT) ||
						this.taste(TokenType.GT) ||
						this.taste(TokenType.LE) ||
						this.taste(TokenType.GE))
					{
						const token = this.prev;
						this.skipBreaks();
						const right = this.bor();
						let type = null;
						switch (token.type)
						{
							case TokenType.LT:
								type = NodeType.LT;
								break;
							case TokenType.GT:
								type = nodeType.GT;
								break;
							case TokenType.LE:
								type = NodeType.LE;
								break;
							case TokenType.GE:
								type = nodeType.GE;
								break;
						}
						result = Node.Binary(type, result, right);
					}
				   return result;
				},
				equality()
				{
					let result = this.comparision();
					while (
					this.taste(TokenType.EQUIV) ||
					this.taste(TokenType.NOT_EQUIV))
					{
						const token = this.prev;
						this.skipBreaks();
						const right = this.comparision();
						let type = null;
						switch (token.type)
						{
							case TokenType.EQUIV:
								type = NodeType.EQUIV;
								break;
							case TokenType.NOT_EQUIV:
								type = nodeType.NOT_EQUIV;
								break;
						}
						result = Node.Binary(type, result, right);
					}
					return result;
				},
				and()
				{
					let result = this.equality();
					while (this.taste(TokenType.AND))
					{
						this.skipBreaks();
						result = Node.Binary(NodeType.AND, result, this.equality());
					}
					return result;
				},
				or()
				{
					let result = this.and();
					while (this.taste(TokenType.OR))
					{
						this.skipBreaks();
						result = Node.Binary(NodeType.OR, result, this.and())
					}
					return result;
				},
				ifelse()
				{
					const result = this.or();
					if (this.taste(TokenType.IF))
					{
						this.skipBreaks();
						const condition = this.ifelse();
						this.skipBreaks();
						this.eat(TokenType.ELSE, 'Expected else clause.');
						this.skipBreaks();
						const other = this.ifelse();
						return Node.IfElse(condition, result, other);
					}
					return result;
				},
				assignment()
				{
					const result = this.ifelse();
					if (this.taste(TokenType.SET))
					{
						if (result.type === NodeType.SUBSCRIPT)
						{
							result.type = NodeType.PASS;
							const right = this.assignment();
							return Node.Binary(NodeType.SET_SUBSCRIPT, result, right, this.prev.line);
						}
						else if (result.type !== NodeType.GET)
						{
							this.error(this.prev, 'Invalid target for assignment.');
						}
						const right = this.assignment();
						return Node.Binary(NodeType.ASSIGN, result, right, this.prev.line);
					}
					return result;
				},
				expression()
				{
					return this.assignment();
				},
				block()
				{
					this.eat(TokenType.LBRACE, 'Expected opening brace.');
					const start = this.curr;
					const nodes = [];
					for (;;)
					{
						if (this.sniff(TokenType.FIN))
						{
							this.error(start, 'Expected closing brace.');
							break;
						}
						if (this.taste(TokenType.RBRACE))
						{
							break;
						}
						const stmt = this.declaration();
						if (stmt !== null)
						{
							nodes.push(stmt);
						}
					}
					alert('done!');
					return Node.Block(nodes, this.prev.line);
				},
				statement()
				{
					if (this.taste(TokenType.ENDL))
					{
						return null;
					}
					else if (this.taste(TokenType.WHILE))
					{
						const condition = this.expression();
						this.skipBreaks();
						const body = this.block();
						let other = null;
						this.skipBreaks();
						if (this.taste(TokenType.ELSE))
						{
							this.skipBreaks();
							other = this.block();
						}
						return Node.While(condition, body, other, this,prev.line);
					}
					else if (this.taste(TokenType.IF))
					{
						const condition = this.expression();
						this.skipBreaks();
						const body = this.block();
						let other = null;
						this.skipBreaks();
						if (this.taste(TokenType.ELSE))
						{
							this.skipBreaks();
							other = this.block();
						}
						return Node.IfElse(condition, body, other, this,prev.line);
					}
					else if (this.taste(TokenType.MATCH))
					{
						this.skipBreaks();
						const start = this.curr;
						const comp = this.expression();
						this.skipBreaks();
						this.eat(TokenType.LBRACE, 'Expected opening brace');
						const cases = [];
						for (;;)
						{
							this.skipBreaks();
							if (this.sniff(TokenType.FIN))
							{
								this.error(start, 'Expected closing brace.');
								break;
							}
							if (this.taste(TokenType.RBRACE))
							{
								break;
							}
							const checks = [];
							do
							{
								this.skipBreaks()
								const expr = this.expression();
								this.checks.push(expr);
							} while (this.taste(TokenType.COMMA));
							this.eat(TokenType.FAT_ARROW, 'Expected fat arrow (=>)');
							this.skipBreaks();
							const then = this.statement();
							const curr = Node.Case(checks, then);
							this.cases.push(curr);
						}
						let other = null;
						this.skipBreaks();
						if (this.taste(TokenType.ELSE))
						{
							this.skipBreaks();
							other = this.block();
						}
						return Node.Match(comp, cases, other, start.line);
					}
					else if (this.taste(TokenType.CONTINUE))
					{
						return Node.Nilary(NodeType.CONTINUE, this.prev.line)
					}
					else if (this.taste(TokenType.BREAK))
					{
						return Node.Nilary(NodeType.BREAK, this.prev.line)
					}
					else if (this.taste(TokenType.RETURN))
					{
						const value = this.expression();
						return Node.Unary(NodeType.RETURN, value, this.prev.line)
					}
					else if (this.sniff(TokenType.LBRACE))
					{
						return this.block();
					}
					const value = this.expression();
					return Node.Unary(NodeType.EXPR, value, this.prev.line);
				},
				declaration()
				{
					if (this.taste(TokenType.LET))
					{
						const result = Node.Declarations(false, this.prev.line);
						do
						{
							this.skipBreaks();
							this.eat(TokenType.ID, 'Expected identifier.');
							const name = this.prev.value;
							this.skipBreaks();
							let value = null;
							if (this.taste(TokenType.SET))
							{
								this.skipBreaks();
								value = this.expression();
							}
							const declare = Node.Declare(name, value);
							result.list.push(declare);
						} while (this.taste(TokenType.COMMA));
						return result;
					}
					else if (this.taste(TokenType.DEC))
					{
						const result = Node.Declarations(false, parser.last.line);
						do
						{
							this.skipBreaks();
							this.eat(TokenType.ID, 'Expected identifier.');
							const name = this.prev.value;
							this.skipBreaks();
							this.eat(TokenType.SET, 'Uninitialized constant.');
							this.skipBreaks();
							const value = this.expression();
							const declare = Node.Declare(name, value);
							result.list.push(declare);
						} while (this.taste(TokenType.COMMA));
						return result;
					}
					return this.statement();
				},
				parse()
				{
					let stmt = null;
					for (;;)
					{
						if (this.curr.type === TokenType.FIN)
						{
							return Node.Nilary(NodeType.FIN);
						}
						stmt = this.declaration();
						if (stmt !== null)
						{
							return stmt;
						}
					}
				}
			};
			return () => {
				Parser.advance();
				return () => Parser.parse.call(Parser);
			};
		};
		const Chunk = () => ({
		   bytes: [],
		   consts: [],
		});
		const Func = (name = null) => ({
			name, chunk: Chunk(),
		});
		const compiler = (parser) =>
		{
			const Local = (name, isConst) => ({
				name,
				depth: -1,
				isConst,
			});
			const Upvalue = (index = 0, isLocal = true) => ({
				index, isLocal,
			})
			const CompilerScope = daddy =>
			({
				func:     Func(),
				locals:   [],
				depth:    0,
				upvalues: [],
				error: null,
				daddy,
			});
			const Compiler = {
				curr: null,
				get chunck()
				{
					return this.curr.func.chunk;
				},
				error(message = '')
				{
					console.log(message);
				},
				addConst(value)
				{
					this.curr.func.chunk.consts.push(value);
					return this.uLEB(this.curr.func.chunk.consts.length - 1);
				},
				emit(...ops)
				{
					this.curr.func.chunk.bytes.push(...ops);
				},
				uLEB(x)
				{
					const result = [];
					do
					{
						let byte = x & 0x7F;
						x >>= 7;
						if (x != 0)
						{
							byte |= 0x80;
						}
						result.push(byte);
					} while (x != 0);
					return result;
				},
				visitBinary(node, op)
				{
					this.visit(node.left);
					this.visit(node.right);
					this.emit(op);
				},
				visitUnary(node, op)
				{
					this.visit(node.value);
					this.emit(op);
				},
				emitConst(value, type)
				{
					this.emit(op.CONST);
					this.emit(...this.addConst(Value(type, value)));
				},
				beginScope()
				{
					++this.curr.depth;
				},
				endScope()
				{
					--this.curr.depth;
					while (
						this.curr.locals.length > 0 &&
						this.curr.locals[this.curr.locals.length - 1].depth > this.curr.depth)
					{
						this.emit(op.POP);
						this.curr.locals.pop();
					}
				},
				endCompilerScope()
				{
					this.emit(op.NULL, op.RETURN);
					const { func } = this.curr;
					if (this.curr.daddy !== null)
					{
						this.curr.daddy.error = this.curr.error;
					}
					this.curr = this.curr.daddy;
					return func;
				},
				emitClosure(x)
				{
					this.emit(op.CLOSURE);
					this.emitConst(x, ValueType.FUNC);
				},
				addLocal(name, isConst)
				{
					const local = Local(name, isConst);
					this.curr.locals.push(local);
					return local;
				},
				findLocal(name)
				{
					for (let i = this.curr.locals.length - 1; i >= 0; --i)
					{
						if (this.curr.locals[i].name === name)
						{
							return i;
						}
					}
					return -1;
				},
				addUpvalue(index, isLocal)
				{
					const count = this.curr.upvalues.length;
					for (let i = 0; i < count; ++i)
					{
						const upvalue = this.curr.upvalues[i];
						if (upvalue.index === index && upvalue.isLocal === isLocal)
						{
							return i;
						}
					}
					this.curr.upvalues.push(Upvalue(index, isConst));
					return count;
				},
				findUpvalue(name, scode)
				{
					if (scope.daddy === null)
					{
						return -1;
					}
					const local = this.findLocal(name, scope.daddy);
					if (local !== -1)
					{
						scope.daddy.locals[local].captured = true;
						return this.addUpvalue(local, true);
					}
					const upvalue = this.findUpvalue(name, scope.daddy);
					if (upvalue !== -1)
					{
						return this.addUpvalue(upvalue, false);
					}
					return -1;
				},
				uInt(x)
				{
					return [
						(x >> 24) & 0xFF,
						(x >> 16) & 0xFF,
						(x >> 8)  & 0xFF,
						(x)       & 0xFF,
					];
				},
				saveSpot()
				{
					return this.chunk.bytes.length;
				},
				writeInt(offset = 0, x = 0)
				{
					const write = this.uInt(patch);
					for (let i = 0; i < 4; ++i)
					{
					   this.chunk.bytes[offset + i] = write[i];
					}
				},
				jump(spot)
				{
					const patch = this.chunk.bytes.length - spot - 4;
					this.writeInt(spot, patch);
				},
				goTo(spot, to)
				{
					this.writeInt(spot, to);
				},
				visit(node)
				{
					switch (node.type)
					{
						case NodeType.EXPR:
							this.visitUnary(node, op.POP);
							break;
						case NodeType.INT:
							this.emitConst(parseInt(node.value), ValueType.INT);
							break;
						case NodeType.REAL:
							this.emitConst(parseFloat(node.value), ValueType.REAL);
							break;
						case NodeType.STRING:
							this.emitConst(node.value, ValueType.STRING)
							break;
						case NodeType.NULL:
							this.emitConst(null, ValueType.NULL);
							break;
						case NodeType.TRUE:
							this.emitConst(true, ValueType.NULL);
							break;
						case NodeType.NULL:
							this.emitConst(null, ValueType.NULL);
							break;
						case NodeType.ADD:
							this.visitBinary(node, op.ADD);
							break;
						case NodeType.SUB:
							this.visitBinary(node, op.SUB);
							break;
						case NodeType.MUL:
							this.visitBinary(node, op.MUL);
							break;
						case NodeType.MOD:
							this.visitBinary(node, op.MOD);
							break;
						case NodeType.DIV:
							this.visitBinary(node, op.DIV);
							break;
						case NodeType.EXP:
							this.visitBinary(node, op.EXP);
							break;
						case NodeType.LS:
							this.visitBinary(node, op.LS);
							break;
						case NodeType.RS:
							this.visitBinary(node, op.RS);
							break;
						case NodeType.BAND:
							this.visitBinary(node, op.BAND);
							break;
						case NodeType.BOR:
							this.visitBinary(node, op.BOR);
							break;
						case NodeType.XOR:
							this.visitBinary(node, op.XOR);
							break;
						case NodeType.BNOT:
							this.visitUnary(node, op.BNOT);
							break;
						case NodeType.NEG:
							this.visitUnary(node, op.NEG);
							break;
						case NodeType.NOT:
							this.visitUnary(node, op.NOT);
							break;
						case NodeType.BLOCK:
						{
							this.beginScope();
							for (const child of node.nodes)
							{
								this.visit(child);
							}
							this.endScope();
							break;
						}
						case NodeType.DECLARE:
						{
							for (const declaration of node.list)
							{
								for (let i = this.curr.locals.length - 1; i >= 0; --i)
								{
									const local = this.curr.locals[i];
									if (local.depth != -1 && local.depth < this.curr.depth)
									{
										break;
									}
									if (declaration.name === local.name)
									{
										this.error(`${declaration.name} already defined in scope.`);
										break;
									}
								}
								if (declaration.value !== null)
								{
									this.addLocal(declaration.name, node.isConst);
									this.visit(declaration.value);
								}
								else
								{
									this.emit(op.NULL);
									this.addLocal(declaration.name, node.isConst);
								}
								this.curr.locals[this.curr.locals.length - 1].depth = this.curr.depth;
							}
							break;
						}
						case NodeType.FUNC:
						{
							const next = CompilerScope(this.curr);
							this.beginScope();
							this.addLocal('call', true, true);
							this.curr.locals[this.curr.locals.length - 1].depth = this.curr.depth;
							for (const arg of func.args)
							{
								if (arg.type != NodeType.GET)
								{
									this.error('Invalid expression for function parameter.');
								}
								this.addLocal(arg.name, false, true);
								this.curr.locals[this.curr.locals.length - 1].depth = this.curr.depth;
							}
							this.visit(node.body);
							this.endScope();
							const result = this.endCompilerScope();
							if (node.name !== null)
							{
								result.name = node.name;
							}
							this.emitClosure(result);
							for (const upvalue of result.upvalues)
							{
								this.emit(
									upvalue.isLocal ? 1 : 0,
									...this.uLEB(this.upvalue.index));
							}
						}
					}
				},
				compile()
				{
					const parse = parser();
					this.curr = CompilerScope();
					for (;;)
					{
						const node = parse();
						console.log(JSON.stringify(node));
						if (node.type === NodeType.FIN)
						{
							break;
						}
						this.visit(node);
					}
					return this.endCompilerScope();
				},
			};
			return () => Compiler.compile.call(Compiler);
		};
		
		return source => compiler(parser(lexer(source)))();
	})();
	const run = (() =>
	{
		const interpreter = chunk =>
		{
			const Frame = (func, slot = 0) => ({
				func,
				ip: 0,
				slot: 0,
			})
			const Interpreter = {
				stack:   [],
				frames: new Array(64),
				depth:   0,
				top:     0,
				addFrame(frame)
				{
					this.frames[this.depth++] = frame;
				},
				get frame()
				{
					return this.frames[this.depth - 1];
				},
				push(x)
				{
					this.stack.splice(this.frame.slot + this.top++, 0, x);
				},
				pop()
				{
					const result = this.stack[this.frame.slot + --this.top];
					this.stack.splice(this.frame.slot + this.top, 1);
					return result;
				},
				advance()
				{
					return this.frame.func.chunk.bytes[this.frame.ip++];
				},
				peek(level = 0)
				{
					return this.stack[this.frame.slot + this.top - 1 - level];
				},
				uLEB()
				{
					let result = 0;
					let shift  = 0;
					let val;
					for (;;)
					{
						val = this.advance();
						result |= (val & 0x7F) << shift;
						if ((val & 0x80) == 0)
						{
							break;
						}
						shift += 7;
					}
					return result;
				},
				interpret()
				{
					this.addFrame(Frame(chunk));
					const binary = (func) =>
					{
						const b = this.pop();
						const a = this.pop();
						this.push(func(a.value, b.value));
					};
					const numOp = (func) =>
					{
						let type = (
							this.peek(0).type === ValueType.INT &&
							this.peek(0).type === this.peek(1).type)
							? ValueType.INT : ValueType.REAL;
						binary((a, b) => Value(type, func(a, b)));
							
					};
					let byte;
					for (;;)
					{
						byte = this.advance()
						switch (byte)
						{
							case op.CONST:
								this.push(this.frame.func.chunk.consts[this.uLEB()]);
								break;
							case op.ADD:
							{
								if (
									this.peek(0).type === ValueType.STRING &&
									this.peek(0).type === this.peek(1).type)
								{
									binary((a, b) => Value(ValueType.STRING, a + b));
								}
								else
								{
									numOp((a, b) => a + b);
								}
								break;
							}
							case op.SUB:
								numOp((a, b) => a - b);
								break;
							case op.MUL:
								numOp((a, b) => a * b);
								break;
							case op.MOD:
								numOp((a, b) => a % b);
								break;
							case op.DIV:
								numOp((a, b) => a / b);
								break;
							case op.EXP:
								numOp((a, b) => a ** b);
								break;
							case op.NULL:
								this.push(Value(ValueType.NULL, null));
								break;
							case op.POP:
								this.pop();
								break;
							case op.RETURN:
							{
								console.log(JSON.stringify(this.stack));
								const val = this.pop();
								this.top = this.frame.slot;
								--this.depth;
								if (this.depth <= 0)
								{
									return;
								}
								break;
							}
						}
					}
				},
			};
			return () => Interpreter.interpret.call(Interpreter);
		};
		return chunk => interpreter(chunk)();
	})();
	return {
		compile, run,
	};
})();

/*const source = `
	match x
	{
		10 => 20
		5 => 6
	}
	10 + 20 ^ 5 if 5 < 10 else 5 ~ ~2`;*/
Engel.run(Engel.compile(`let i = 30
{
	let i = 20 + 4
}`));