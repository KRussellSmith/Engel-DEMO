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
		'ADD', 'SUB', 'MUL',
		'INC', 'DEC', 'CONST',
		'DIV', 'EXP', 'LOAD',
		'FIN', 'NEG', 'NOT',
		'JMP', 'AND', 'OR',
		'CND', 'CND_NOT', 'POP',
		'EMIT', 'CONCAT', 'TO_STR',
		'STORE', 'GET', 'LT',
		'GT', 'LE', 'GE',
		'EQUIV', 'NOT_EQUIV',
		'STORE_LOCAL', 'GET_LOCAL',
		'SET', 'ERUPT', 'MOD');
	
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
						//alert(curr)
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
			'OBJ',        'FIN');
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
				
				Declarations: (index, isConst, line) => ({
					...base(NodeType.DECLARE, line),
					index, isConst,
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
				statement()
				{
					if (this.taste(TokenType.ENDL))
					{
						return null;
					}
					return this.expression();
				},
				declaration()
				{
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
		
		const compiler = (parser) =>
		{
			const Chunk = () => ({
				bytes:  [],
				consts: [],
			})
			const Compiler = {
				chunk: null,
				addConst(value)
				{
					this.chunk.consts.push(value);
					return this.uLEB(this.chunk.consts.length - 1);
				},
				emit(...ops)
				{
					this.chunk.bytes.push(...ops);
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
				visit(node)
				{
					switch (node.type)
					{
						case NodeType.INT:
						{
							this.emit(op.CONST);
							const value = Value(ValueType.INT, parseInt(node.value));
							this.emit(...this.addConst(value));
							break;
						}
						case NodeType.ADD:
							this.visit(node.left);
							this.visit(node.right);
							this.emit(op.ADD);
							break;
						case NodeType.SUB:
							this.visit(node.left);
							this.visit(node.right);
							this.emit(op.SUB);
							break;
						case NodeType.MUL:
							this.visit(node.left);
							this.visit(node.right);
							this.emit(op.MUL);
							break;
						case NodeType.DIV:
							this.visit(node.left);
							this.visit(node.right);
							this.emit(op.DIV);
							break;
					}
				},
				compile()
				{
					const parse = parser();
					this.chunk = Chunk();
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
					return this.chunk;
				},
			};
			return () => Compiler.compile.call(Compiler);
		};
		
		return source => compiler(parser(lexer(source)))();
	})();
	const interpret = bytes =>
	{};
	return {
		compile, interpret,
	}
})();

/*const source = `
	match x
	{
		10 => 20
		5 => 6
	}
	10 + 20 ^ 5 if 5 < 10 else 5 ~ ~2`;*/
console.log(JSON.stringify(Engel.compile('30 + 5')));