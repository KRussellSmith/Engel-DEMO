import {Caret} from './caret.js';
export function highlight(editor)
{
	const keywords = [
		'if',
		'else',
		'true',
		'false',
		'null',
		'jump',
		'break',
		'while',
		'for',
		'match',
		'return',
		'this',
		'call',
		'let',
		'dec',
		'import',
		'in',
	];
	const NORM = '#E6E6FA';
	const KEY = '#FFBF00';
	const TEXT = '#EDC9AF';
	const NUM  = '#F88379';
	const FUNC = '#7DF9FF';
	const COMM = '#006A4E';
	const ID   = '#91A3B0'
	const Highlighter = {
		source: editor.innerText,
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
		isAlpha(x)
		{
			return x === '_' || RegExp(/^\p{L}/, 'u').test(x);
		},
		isDigit(x)
		{
			return /[0-9]/.test(x);
		},
		isAlphaNum(x)
		{
			return this.isAlpha(x) || this.isDigit(x);
		},
		singleString()
		{
			
			let string = '';
			let done = false;
			do
			{
				if (this.fin())
				{
					break;
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
						this.advance();
						break;
					// Interpolation:
					case '#':
					{
						if (this.match('{'))
						{
							this.interps.push(1);
							done = true;
							break;
						}
						break;
					}
				}
			} while (!done);
			return TEXT;
		},
		doubleString()
		{
			
			let string = '';
			let done = false;
			do
			{
				if (this.fin())
				{
					break;
				}
				const curr = this.advance();
				switch (curr)
				{
					// The terminator:
					case '"':
						done = true;
						break;
					// Escape sequences:
					case '\\':
						this.advance();
						break;
					}
			} while (!done);
			return TEXT;
		},
		scan()
		{
			let result = '';
			this.start = this.curr;
			if (this.fin())
			{
				return null;
			}
			const char = this.advance();
			let   color = NORM;
			switch (char)
			{
				case '\'':
					color = this.singleString();
					break;
				case '"':
					color = this.doubleString();
					break;
				case ';':
					while (!this.fin() && !this.spy('\n'))
					{
						this.advance();
					}
					color = COMM;
					break;
				case '`':
				{
					let depth = 1;
					for (;;)
					{
						const char = this.advance();
						if (this.fin())
						{
							break;
						}
						if (char === '.')
						{
							if (this.match('`'))
							{
								--depth;
							}
						}
						else if (this.match('`'))
						{
							++depth;
						}
						if (depth <= 0)
						{
							break;
						}
					}
					color = COMM;
					break;
				}
				case '-':
					if (this.match('>'))
					{
						color = FUNC;
						break;
					}
					color = NORM;
					break;
				case '{':
					if (this.interps.length >= 0)
					{
						++this.interps[this.interps.length - 1];
					}
					color = NORM;
					break;
				case '}':
					if (this.interps.length >= 0)
					{
					   --this.interps[this.interps.length - 1];
					   if (this.interps[this.interps.length - 1] <= 0)
					   {
					   	this.interps.pop();
					   	color = this.singleString();
					   	break;
					   }
					}
					color = NORM;
					break;
				default:
				{
					if (this.isDigit(char))
					{
						while (this.isDigit(this.look()))
						{
							this.advance();
						}
						if (this.match('.'))
						{
							while (this.isDigit(this.look()))
							{
								this.advance();
							}
						}
						color = NUM;
						break;
					}
					else if (this.isAlpha(char))
					{
						while (this.isAlphaNum(this.look()))
						{
							this.advance();
						}
						const ident = this.source.substring(this.start, this.curr);
						if (keywords.indexOf(ident) >= 0)
						{
							color = KEY;
							break;
						}
						color = ID;
						break;
					}
					color = NORM;
					break;
				}
			}
			return {
				color,
				text: this.source.substring(this.start, this.curr),
			};
		},
	};
	let result = '';
	const caret = new Caret(editor);
	const save = caret.getPos();
	for (;;)
	{
		const lexeme = Highlighter.scan();
		if (lexeme === null)
		{
			break;
		}
		const chars = lexeme.text.split('').map(
			x => `<span style='color: ${lexeme.color};'>${x}</span>`);
		result += chars.join('');
	}
	editor.innerHTML = result;
	caret.setPos(save);
};
