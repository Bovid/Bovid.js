import { Lexer } from './lexer';

describe('Lexer', () => {
  describe('lex()', () => {
    it('returns from calling .next() if it is defined', () => {
      class TestLexer extends Lexer {
        next(): string {
          return 'called next';
        }
        performAction() { return 0; }
      }

      expect(new TestLexer().lex()).toBe('called next');
    });
  });
});