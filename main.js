const Enum = (...args) =>
{
	const result = {};
	let i = 0;
	for (const node of args) {
		Object.defineProperty(result, node,
			{
				value: i,
				writable: false,
				configurable: false,
				enumerable: true
			});
		Object.defineProperty(result, i,
			{
				value: node,
				writable: false,
				configurable: false,
				enumerable: true
			});
		++i;
	}
	return result;
};
const op = Enum(
	'ADD', 'SUB', 'MUL',
	'INC', 'DEC',
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

const compile = (() =>
{
	const TokenType = Enum(
		'ADD',       'SUB',        'MUL',
		'DIV',       'EXP',        'MOD',
		'LS',        'RS',         'XOR',
		'BAND',      'BOR',        'ADD_SET',
		'SUB_SET',   'MUL_SET',    'DIV_SET',
		'EXP_SET',   'MOD_SET',    'LS_SET',
		'RS_SET',    'STRING',     'INTERP',
		'REAL',      'INT',        'ID',
		'ENDL',      'LPAREN',     'RPAREN',
		'TRUE',      'FALSE',      'AND',
		'OR',        'EQUIV',      'ELSE',
		'IF',        'SET',        'LBRACE',
		'RBRACE',    'LT',         'GT',
		'LE',        'GE',         'NOT',
		'NOT_EQUIV', 'NULL',       'FOR',
		'WHILE',     'BREAK',      'CONTINUE',
		'THIS',      'CALL',       'MATCH',
		'RETURN',    'LET',        'DEC',
		'FUNC',      'HASH_START', 'OBJ_START',
		'ERROR',     'FIN');
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
				if (this.fin())
				{
					if (this.interps.length > 0)
					{
						return this.error('Unclosed interpolation!');
					}
					return Token(TokenType.FIN, this);
				}
				this.start = this.curr;
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
							return Token(TokenType.XOR_SET, this);
						}
						return Token(TokenType.XOR, this);
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
						return Token(TokenType.SET, this);
					case '#':
						if (this.match('['))
						{
						   return Token(TokenType.NOT_EQUIV, this);
						}
						return Token(TokenType.NOT, this);
					case '\'':
						return this.singleString();
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
		const Token = (type, lexer, value = null) => ({
			type,
			line: lexer.line,
			col: lexer.col,
			value: value === null ? lexer.source.substring(lexer.start, lexer.curr) : value,
			str()
			{
				return `[${TokenType[this.type]}, ${this.value}]`;
			}
		});
		return () => Lexer.scan.call(Lexer);
	};
	const Parser = {};
	return {
		scan(source)
		{
			return lexer(source);
		},
	};
})();
const interpret = bytes =>
{};
const source = "let foo 20";
const scan = compile.scan(source);
alert(scan().str());
alert(scan().str());
alert(scan().str());