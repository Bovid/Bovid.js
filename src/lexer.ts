const EOF = '';

export interface ILexerOptions {
  ranges: boolean;
}

export abstract class Lexer {
  done: boolean;
  _input: string;
  _more: boolean;
  yytext: string;
  rules: string[];
  match: string;
  yylineno: number;
  matches: string;
  yyleng: number;
  matched: string;
  _less: boolean;
  yylloc: IYYLoc;
  options: ILexerOptions;

  // return next match that has a token
  lex(): string {
    var r = this.next();
    if (typeof r !== 'undefined') {
        return r;
    } else {
        return this.lex();
    }
  }

  // return next match in input
  next(): string {
    if (this.done) {
        return EOF;
    }
    if (!this._input) this.done = true;

    var token,
        match,
        lines;
    if (!this._more) {
        this.yytext = '';
        this.match = '';
    }
    for (let i = 0; i < this.rules.length; i++) {
        match = this._input.match(this.rules[i]);
        if (match) {
            lines = match[0].match(/\n/g);
            if (lines) this.yylineno += lines.length;
            this.yytext += match[0];
            this.match += match[0];
            this.matches = match;
            this.yyleng = this.yytext.length;
            this._more = false;
            this._input = this._input.slice(match[0].length);
            this.matched += match[0];
            token = this.performAction(i);
            if (token) return token;
            else return;
        }
    }
    if (this._input === EOF) {
        return EOF;
    } else {
        this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(), 
                {text: "", token: null, line: this.yylineno});
    }
  }

  abstract performAction(ruleIndex: number): number | undefined;

  parseError(str: string, hash: ILexHash) {
    throw new Error(str);
  }

  showPosition(): string {
    const pre = this.pastInput();
    const c = new Array(pre.length + 1).join("-");
    return pre + this.upcomingInput() + "\n" + c+"^";
  }

  // displays upcoming input, i.e. for error messages
  pastInput(): string {
    const past = this.matched.substr(0, this.matched.length - this.match.length);
    return (past.length > 20 ? '...' : '') + past.substr(-20).replace(/\n/g, "");
  }

  // displays upcoming input, i.e. for error messages
  upcomingInput(): string {
    var next = this.match;
    if (next.length < 20) {
        next += this._input.substr(0, 20-next.length);
    }
    return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
  }

  // resets the lexer, sets new input 
  setInput(input: string, yy: any): void {
    this._input = input;
    this._more = this._less = this.done = false;
    this.yylineno = this.yyleng = 0;
    this.yytext = this.matched = this.match = '';
  }
}

export interface ILexHash {
  text: string;
  token: null;
  line: number;
}

export interface IYYLoc {
  first_line: number;
  first_column: number;
  last_line: number;
  last_column: number;
}