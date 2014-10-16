/**
 * in input reader for parser/lexer, uses sticky behavior when available, falls back to standard string modification when it is not
 * @param {String} input
 */
Parser.InputReader = (function(Math, parser, lexer) {
    var stickyCompatible = RegExp.prototype.sticky !== undefined,
        rules,
        rule,
        max,
        i;

    function Parser_InputReader(input) {
        this.done = false;
        this.input = input;
        this.length = input.length;
        this.matches = [];
        this.position = 0;
    }

	//sticky implementation
    if (stickyCompatible) {
        Parser_InputReader.prototype = {
            addMatch: function addMatch(match) {
                this.matches.push(match);
                this.position += match.length;
                this.done = (this.position >= this.length);
            },

            ch: function ch() {
                var ch = this.input[this.position];
                this.addMatch(ch);
                return ch;
            },

            unCh: function unCh(chLength) {
                this.position -= chLength;
                this.position = Math.max(0, this.position);
                this.done = (this.position >= this.length);
            },

            substring: function substring(start, end) {
                start = (start != 0 ? this.position + start : this.position);
                end = (end != 0 ? start + end : this.length);
                return this.input.substring(start, end);
            },

            match: function match(rule) {
                var match;
                rule.lastIndex = this.position;
                if ((match = rule.exec(this.input)) !== null) {
                    return match;
                }
                return null;
            },

            toString: function toString() {
                return this.matches.join('');
            }
        };

        rules = lexer.rules;
        max = rules.length;
        i = 0;
        for(;i < max; i++) {
            rule = rules[i];
            rules[i] = new RegExp(rule.source.substring(1),'y');
        }
    }

    //fallback to non-sticky implementations
    else {

        Parser_InputReader.prototype = {
            addMatch: function addMatch(match) {
                this.input = this.input.slice(match.length);
                this.matches.push(match);
                this.position += match.length;
                this.done = (this.position >= this.length);
            },

            ch: function ch() {
                var ch = this.input[0];
                this.addMatch(ch);
                return ch;
            },

            unCh: function unCh(chLength) {
                this.position -= chLength;
                this.position = Math.max(0, this.position);
                this.done = (this.position >= this.length);
            },

            substring: function substring(start, end) {
                start = (start != 0 ? this.position + start : this.position);
                end = (end != 0 ? start + end : this.length);
                return this.input.substring(start, end);
            },

            match: function match(rule) {
                var match,
                    input = this.input;

                if ((match = input.match(rule)) !== null) {
                    return match;
                }

                return null;
            },

            toString: function toString() {
                return this.matches.join('');
            }
        };
    }

    return Parser_InputReader;
})(Math, parser, lexer);