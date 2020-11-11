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
	const NativeLibs = {
		'std': // My all-time favorite library name.
		{
			'print': (vm, args) =>
			{
				for (let i = vm.top - 1; i >= vm.top - args; --i)
				{
					console.log(vm.stack[i]);
				}
			},
		},
		// Just going to claim these libraries:
		'gles20': {},
		'gles30': {},
		'canvas': {},
		'math':   {},
		'game':   {},
		'json':   {},
	}
	const op = Enum(
		'ADD',       'SUB',        'MUL',
		'DIV',       'EXP',        'LOAD',
		'LS',        'RS',         'BAND',
		'BOR',       'XOR',        'BNOT',
		'NEG',       'NOT',        'MOD',
		'INC',       'DEC',        'CONST',
		'TRUE',      'FALSE',      'NULL',
		'JMP',       'AND',        'OR',
		'CND',       'CND_NOT',    'POP',
		'EMIT',      'CONCAT',     'TO_STR',
		'STORE',     'GET',        'LT',
		'GT',        'LE',         'GE',
		'EQUIV',     'NOT_EQUIV',  'SET_LOCAL',
		'GET_LOCAL', 'SET_GLOBAL', 'ERUPT',
		'DUP',       'CLOSURE',    'CALL',
		'IMPORT',    'EXPORT',     'DEF_VAR',
		'DEF_CONST', 'GET_GLOBAL', 'CLOSE',
		'GET_UPVAL', 'SET_UPVAL',  'GOTO',
		'ROT2',      'ROT3',       'ROT4',
		'DUMP',      'RETURN');
	
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
			'FAT_ARROW', 'IMPORT',     'ERROR',
			'FIN');
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
				'import': TokenType.IMPORT,
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
			'OR',         'ELSE',
			'IF',         'SET',           'LBRACE',
			'RBRACE',     'COMP',          'NOT',
			'NULL',       'FOR',
			'WHILE',      'BREAK',         'CONTINUE',
			'THIS',       'CALL',          'MATCH',
			'RETURN',     'DECLARE',       'BLOCK',
			'FUNC_BLOCK', 'FUNC',          'HASH',
			'SUBSCRIPT',  'SET_SUBSCRIPT', 'ASSIGN',
			'OBJ',        'EXPR',          'FUNC_CALL',
			'IMPORT',     'FIN');
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
					...base(NodeType.FUNC_CALL, line),
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
				Comparison: (type, value) => ({
					type, value
				}),
				Comparisons: (primer, list, line) => ({
					...base(NodeType.COMP, line),
					primer, list,
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
				sniff(...types)
				{
					return types.indexOf(this.curr.type) >= 0;
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
				taste(...types)
				{
					if (this.sniff(...types))
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
								type = NodeType.RS;
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
					let expr = this.bor();
					const compare = [
						TokenType.LT,
						TokenType.GT,
						TokenType.LE,
						TokenType.GE,
						TokenType.EQUIV,
						TokenType.NOT_EQUIV];
					if (this.taste(...compare))
					{
						const list = []
						do
						{
							this.skipBreaks();
							const comp = Node.Comparison(this.prev.type, this.bor());
							list.push(comp);
						} while (this.taste(...compare));
						return Node.Comparisons(expr, list, this.prev.line)
					}
				   return expr;
				},/*
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
								type = NodeType.NOT_EQUIV;
								break;
						}
						result = Node.Binary(type, result, right);
					}
					return result;
				},*/
				and()
				{
					let result = this.comparision();
					while (this.taste(TokenType.AND))
					{
						this.skipBreaks();
						result = Node.Binary(NodeType.AND, result, this.comparision());
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
						return Node.While(condition, body, other, this.prev.line);
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
						return Node.IfElse(condition, body, other, this.prev.line);
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
						const result = Node.Declarations(false, this.prev.line);
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
					else if (this.taste(TokenType.IMPORT))
					{
						return Node.Unary(NodeType.IMPORT, this.factor());
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
			name,
			chunk: Chunk(),
			upvalues: [],
		});
		const compiler = (parser) =>
		{
			const Local = (name, isConst) => ({
				name,
				depth: -1,
				captured: false,
				isConst,
			});
			const Upvalue = (index = 0, isLocal = true) => ({
				index, isLocal,
			})
			const CompilerScope = (daddy = null) =>
			({
				func:     Func(),
				locals:   [],
				depth:    0,
				upvalues: [],
				error:    null,
				loop:     null,
				daddy,
			});
			const Loop = (scope) =>
			{
				const result = {
					continues: [],
					breaks:    [],
					depth: scope.depth,
					daddy: scope.loop,
				};
				return scope.loop = result;
			}
			const Compiler = {
				curr: null,
				get chunk()
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
					this.emit(
						op.CONST,
						...this.addConst(Value(type, value)));
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
						const local = this.curr.locals.pop();
						this.emit(local.captured ? op.CLOSE : op.POP);
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
					func.upvalues = new Array(this.curr.upvalues.length);
					this.curr = this.curr.daddy;
					return func;
				},
				emitClosure(x)
				{
					this.emit(
						op.CLOSURE,
						...this.addConst(Value(ValueType.FUNC, x)));
				},
				addLocal(name, isConst)
				{
					const local = Local(name, isConst);
					this.curr.locals.push(local);
					return local;
				},
				findLocal(name, scope = this.curr)
				{
					for (let i = scope.locals.length - 1; i >= 0; --i)
					{
						if (scope.locals[i].name === name)
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
					this.curr.upvalues.push(Upvalue(index, isLocal));
					return count;
				},
				findUpvalue(name, scope)
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
					const write = this.uInt(x);
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
				beginLoop()
				{
					return Loop(this.curr);
				},
				endLoop()
				{
					return this.curr.loop = this.curr.loop.daddy;
				},
				globals: [],
				visit(node)
				{
					switch (node.type)
					{
						case NodeType.GROUP:
							this.visit(node.value);
							break;
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
						case NodeType.COMP:
						{
							const getOp = (type) =>
							{
								switch (type)
								{
									case TokenType.LT:
										return op.LT;
									case TokenType.GT:
										return op.GT;
									case TokenType.LE:
										return op.LE;
									case TokenType.GE:
										return op.GE;
									case TokenType.EQUIV:
										return op.EQUIV;
									case TokenType.NOT_EQUIV:
										return op.NOT_EQUIV;
								}
								return null;
							}
							this.visit(node.primer)
							if (node.list.length === 1)
							{
								this.visitUnary(node.list[0], getOp(node.list[0].type));
							}
							else
							{
								const jumps = [];
								for (let i = 0; i < node.list.length; ++i)
								{
									const comp = node.list[i];
									this.visitUnary(comp, op.DUP);
									this.emit(op.ROT3);
									this.emit(getOp(comp.type));
									if (i < node.list.length - 1)
									{
										this.emit(op.AND);
										jumps.push(this.saveSpot());
										this.emit(...this.uInt());
									}
								}
								// The result of these operations is going to be on top,
								// So this will switch it with 
								for (const jump of jumps)
								{
									this.jump(jump);
								}
								this.emit(op.ROT2, op.POP);
								//this.emit(op.POP, op.ROT2, op.POP);
							}
							break;
						}
						case NodeType.IF:
						{
							this.visit(node.condition);
							
							this.emit(op.AND);
							const ifFalse = this.saveSpot();
							this.emit(...this.uInt());
							this.visit(node.then);
							this.emit(op.JMP);
							const ifTrue = this.saveSpot();
							this.emit(...this.uInt());
							
							if (node.other !== null)
							{
								this.jump(ifFalse);
								this.emit(op.POP);
								this.visit(node.other);
								this.jump(ifTrue);
							}
							else
							{
								this.jump(ifFalse);
								this.emit(op.POP);
								this.jump(ifTrue);
							}
							break;
						}
						case NodeType.WHILE:
						{
							this.beginScope();
							let ifTrue, ifFalse;
							const hasElse = node.other !== null;
							if (hasElse)
							{
								this.visit(node.condition);
								this.emit(op.AND);
								ifFalse = this.saveSpot();
								this.emit(...this.uInt());
								this.emit(op.JMP);
								ifTrue = this.saveSpot();
								this.emit(...this.uInt());
							}
							const start = this.saveSpot();
							this.visit(node.condition);
							this.emit(op.AND);
							const mainBreak = this.saveSpot();
							this.emit(...this.uInt());
							if (hasElse)
							{
								this.jump(ifTrue);
							}
							const loop = this.beginLoop();
							this.visit(node.then);
							this.endLoop();
							this.emit(op.GOTO);
							this.emit(...this.uInt(start));
							if (hasElse)
							{
								this.jump(ifFalse);
								this.emit(op.POP);
								this.visit(node.other);
								this.emit(op.JMP);
								const skipPop = this.saveSpot();
								this.emit(...this.uInt());
								const end = this.saveSpot();
								for (const jump of loop.continues)
								{
									this.goTo(jump, start);
								}
								for (const brk of loop.breaks)
								{
									this.goTo(brk, end);
								}
								this.jump(mainBreak);
								this.emit(op.POP);
								this.jump(skipPop);
							}
							else
							{
								for (const jump of loop.continues)
								{
									this.goTo(jump, start);
								}
								for (const brk of loop.breaks)
								{
									this.goTo(brk, end);
								}
								this.jump(mainBreak);
								this.emit(op.POP);
							}
							this.endScope();
							break;
						}
						case NodeType.JUMP:
						{
							this.emit(op.GOTO);
							this.curr.loop.continues.push(this.saveSpot());
							this.emit(...this.uInt());
							break;
						}
						case NodeType.BREAK:
						{
							this.emit(op.GOTO);
							this.curr.loop.breaks.push(this.saveSpot());
							this.emit(...this.uInt());
							break;
						}
						case NodeType.AND:
						{
							break;
						}
						case NodeType.OR:
						{
							break;
						}
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
							if (this.curr.depth > 0)
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
							}
							else
							{
								for (const declaration of node.list)
								{
									if (declaration.value !== null)
									{
										this.visit(declaration.value);
										this.emit(
											node.isConst ? op.DEF_CONST : op.DEF_VAR,
											...this.addConst(Value(ValueType.STRING, declaration.name)));
									}
									else
									{
										this.emit(
											op.NULL,
											node.isConst ? op.DEF_CONST : op.DEF_VAR,
											...this.addConst(Value(ValueType.STRING, declaration.name)));
									}
								}
							}
							break;
						}
						case NodeType.GET:
						{
							let depth = this.findLocal(node.name);
							if (depth >= 0)
							{
								if (this.curr.locals[depth].depth === -1)
								{
									this.error(`Cannot read ${node.name} within its own declaration.`);
									break;
								}
								this.emit(
									op.GET_LOCAL,
									...this.uLEB(depth));
							}
							else if ((depth = this.findUpvalue(node.name, this.curr)) >= 0)
							{
								this.emit(
									op.GET_UPVAL,
									...this.uLEB(depth));
							}
							else
							{
								this.emit(
									op.GET_GLOBAL,
									...this.addConst(Value(NodeType.STRING, node.name)));
								
							}
							break;
						}
						case NodeType.ASSIGN:
						{
							const { name } = node.left;
							let depth = this.findLocal(name);
							this.visit(node.right);
							if (depth >= 0)
							{
								if (this.curr.locals[depth].isConst)
								{
									this.error(`Cannot define constant ${name} after declaration.`);
								}
								this.emit(
									op.SET_LOCAL,
									...this.uLEB(depth));
								this.emit(
									op.GET_LOCAL,
									...this.uLEB(depth));
							}
							else if ((depth = this.findUpvalue(name, this.curr)) >= 0)
							{
								this.emit(
									op.SET_UPVAL,
									...this.uLEB(depth));
								this.emit(
									op.GET_UPVAL,
									...this.uLEB(depth));
							}
							else
							{
								this.emit(
									op.SET_GLOBAL,
									...this.addConst(Value(NodeType.STRING, name)));
								this.emit(
									op.GET_GLOBAL,
									...this.addConst(Value(NodeType.STRING, name)));
								
							}
							break;
						}
						case NodeType.FUNC:
						{
							this.curr = CompilerScope(this.curr);
							this.beginScope();
							this.addLocal('call', true, true);
							this.curr.locals[this.curr.locals.length - 1].depth = this.curr.depth;
							for (const arg of node.args)
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
							const upvalues = this.curr.upvalues;
							const result = this.endCompilerScope();
							if (node.name !== null)
							{
								result.name = node.name;
							}
							this.emitClosure(result);
							for (const upvalue of upvalues)
							{
								this.emit(
									upvalue.isLocal ? 1 : 0,
									...this.uLEB(upvalue.index));
							}
							break;
						}
						case NodeType.RETURN:
						{
							this.visitUnary(node, op.RETURN);
							break;
						}
						case NodeType.FUNC_CALL:
						{
							this.visit(node.callee);
							for (const arg of node.args)
							{
								this.visit(arg);
							}
							this.emit(
								op.CALL,
								...this.uLEB(node.args.length));
							break;
						}
						case NodeType.IMPORT:
						{
							this.visitUnary(node, op.IMPORT);
							break;
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
			});
			const Upvalue = (value) =>
			({
				value,
				next: null,
				closed: null
			})
			const Interpreter = {
				stack:   [],
				globals: {},
				frames: new Array(64),
				depth:   0,
				top:     0,
				openUpvalues: null,
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
					this.stack.splice(this.top++, 0, x);
				},
				pop()
				{
					const result = this.stack[--this.top];
					this.stack.splice(this.top, 1);
					return result;
				},
				advance()
				{
					return this.frame.func.chunk.bytes[this.frame.ip++];
				},
				peek(level = 0)
				{
					return this.stack[this.top - 1 - level];
				},
				put(level = 0, x)
				{
					return this.stack[this.top - 1 - level] = x;
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
				uInt()
				{
					return (
						(this.advance() << 24) |
						(this.advance() << 16) |
						(this.advance() << 8)  |
						(this.advance()));
				},
				error(message = '')
				{
					console.log(message);
				},
				call(func, args)
				{
					this.depth++;
					this.frames[this.depth - 1] = Frame(func, this.top - args - 1);
					return true;
				},
				callVal(val, args)
				{
					switch (val.type)
					{
						case ValueType.FUNC:
						{
							return this.call(val.value, args);
						}
						case ValueType.NATIVE:
						{
							const result = val.value(this.top - args, args);
							this.top -= args + 1;
							this.push(result);
							return true;
						}
						default:
						{
							this.error('Not a function');
							break;
						}
					}
					return false;
				},
				getConst()
				{
					return this.frame.func.chunk.consts[this.uLEB()];
				},
				captureUpvalue(local)
				{
					let prev = null;
					let upvalue = this.openUpvalues;
					
					while (upvalue !== null && upvalue.location > local)
					{
					prev = upvalue;
						upvalue = upvalue.next;
					}
					if (upvalue !== null && upvalue.location === local)
					{
						return upvalue;
					}
					const newUpvalue = Upvalue(local);
					newUpvalue.next = Upvalue(local);
					
					if (prev == null)
					{
						this.openUpvalues = newUpvalue;
					}
					else
					{
						prev.next = newUpvalue;
					}
				},
				closeUpvalues(last = this.top - 1)
				{
					while (
						this.openUpvalues !== null &&
						this.stack.indexOf(this.openUpvalues.value) >= last)
						{
							const upvalue  = this.openUpvalues = Upvalue(null);
							upvalue.closed = upvalue.value;
							upvalue.value =  upvalue.closed;
							this.openUpvalues = upvalue.next;
						}
				},
				isTrue(x)
				{
					return (
						x !== false &&
						x !== null  &&
						x !== 0);
				},
				isNum(x)
				{
					return x.type === ValueType.INT || x.type === ValueType.REAL;
				},
				equiv(a, b)
				{
					const checkTypes = (a, b) =>
					{
						if (a.type !== b.type)
						{
							return isNum(a) && isNum(b);
						}
						return true;
					}
					if (!checkTypes(a, b))
					{
						return false;
					}
					return a.value === b.value;
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
					const compOp = (func) =>
					{
						binary((a, b) => Value(ValueType.BOOL, func(a, b)));
					};
					let byte;
					
					for (;;)
					{
						byte = this.advance();
						console.log(op[byte]);
						switch (byte)
						{
							case op.DUP:
								this.push(this.peek());
								break;
							case op.ROT2:
							{
								const first  = this.peek(0);
								const second = this.peek(1);
								
								this.put(0, second);
								this.put(1, first);
								break;
							}
							case op.ROT3:
							{
								const first  = this.peek(0);
								const second = this.peek(1);
								const third  = this.peek(2);
								
								this.put(0, second);
								this.put(1, third);
								this.put(2, first);
								break;
							}
							case op.ROT4:
							{
								const first   = this.peek(0);
								const second  = this.peek(1);
								const third   = this.peek(2);
								const fourth  = this.peek(3);
								
								this.put(0, second);
								this.put(1, third);
								this.put(2, fourth);
								this.put(3, first);
								break;
							}
							case op.CONST:
								this.push(this.getConst());
								break;
							case op.GET_GLOBAL:
							{
								const name = this.getConst().value;
								if (!(name in this.globals))
								{
									this.error(`${name} is undefined.`);
									return;
								}
								this.push(this.globals[name].value);
								break;
							}
							case op.SET_GLOBAL:
							{
								const name = this.getConst().value;
								if (!(name in this.globals))
								{
									this.error(`${name} is undefined.`);
									return;
								}
								this.globals[name].value = this.pop();
								break;
							}
							case op.LT:
							{
								compOp((a, b) => a < b);
								break;
							}
							case op.GT:
							{
								compOp((a, b) => a > b);
								break;
							}
							case op.LE:
							{
								compOp((a, b) => a <= b);
								break;
							}
							case op.GE:
							{
								compOp((a, b) => a >= b);
								break;
							}
							case op.EQUIV:
							{
								const result = Value(ValueType.BOOL, this.equiv(this.pop(), this.pop()));
								this.push(result);
								break;
							}
							case op.NOT_EQUIV:
							{
								const result = Value(ValueType.BOOL, !this.equiv(this.pop(), this.pop()));
								this.push(result);
								break;
							}
							case op.GET_LOCAL:
								this.push(this.stack[this.frame.slot + this.uLEB()]);
								break;
							case op.SET_LOCAL:
								this.stack[this.frame.slot + this.uLEB()] = this.peek();
								break;
							case op.DEF_VAR:
							{
									const name = this.getConst().value;
									if (name in this.globals)
									{
										this.error(`${name} already declared.`);
										return;
									}
									this.globals[name] = {
										value: this.pop(),
										isConst: false,
									};
								break;
							}
							case op.DEF_CONST:
							{
								const name = this.getConst().value;
								if (name in this.globals)
								{
									this.error(`${name} already declared.`);
									return;
								}
								this.globals[name] = {
									value: this.pop(),
									isConst: true,
								};
								break;
							}
							case op.GET_UPVAL:
							{
								const index = this.uLEB();
								this.push(this.stack[this.frame.slot + index]);
								break;
							}
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
							case op.JMP:
							{
								const jump = this.uInt();
								this.frame.ip += jump;
								break;
							}
							case op.GOTO:
								this.frame.ip = this.uInt();
								break;
							case op.AND:
							{
								const jump = this.uInt();
								if (!this.isTrue(this.peek().value))
								{
									this.frame.ip += jump;
								}
								else
								{
									this.pop();
								}
								break;
							}
							case op.DUMP:
							{
								alert(JSON.stringify(this.stack));
								break;
							}
							case op.CALL:
							{
								const args = this.uLEB();
								this.callVal(this.peek(args), args);
								
								break;
							}
							case op.CLOSURE:
							{
								this.push(this.getConst());
								const func = this.peek().value;
								
								for (let i = 0; i < func.upvalues.length; ++i)
								{
									const isLocal = this.advance() === 1;
									const index   = this.uLEB();
									if (isLocal)
									{
										func.upvalues[i] = this.captureUpvalue(this.stack[this.frame.slot + index]);
									}
									else
									{
										func.upvalues[i] = this.frame.func.upvalues[index];
									}
								}
								break;
							}
							case op.CLOSE:
							{
								this.closeUpvalues();
								this.pop();
								break;
							}
							case op.RETURN:
							{
								
								console.log(JSON.stringify(this.globals));
								const val = this.pop();
								this.closeUpvalues(this.frame.slot);
								--this.depth;
								if (this.depth <= 0)
								{
									return;
								}
								this.top = this.frames[this.depth].slot;
								this.push(val);
								break;
							}
							default:
							{
								this.error('Unrecognized op.');
								return;
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
		compile, run, op
	};
})();

/*const source = `
	match x
	{
		10 => 20
		5 => 6
	}
	10 + 20 ^ 5 if 5 < 10 else 5 ~ ~2`;*/
Engel.run(Engel.compile(`
let a = 1 < 2 < 3 == 3 < 5
`));