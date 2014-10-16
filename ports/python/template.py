import collections
import re
#imports


class Jison:#extends
	symbols = {}
	terminals = {}
	productions = {}
	table = {}
	default_actions = {}
	version = '0.3.12'
	debug = False

	action_none = 0
	action_shift = 1
	action_deduce = 2
	action_accept = 3

	unput_stack = []

	def trace(self):
		"""trace"""

	def __init__(self):
		"""Setup Parser"""
		"""@@PARSER_INJECT@@"""

	def parser_perform_action(self, yy, yystate, s, o):
		"""@@ParserPerformAction@@"""

	def parser_lex(self):
		token = self.lexerLex()
		#end = 1

		if token is not None:
			return token

		return self.Symbols["end"]

	def parse_error(self, _str='', _hash=None):
		raise Exception(_str)

	def lexer_error(self, _str='', _hash=None):
		raise Exception(_str)

	def parse(self, _input):

		if self.table is None:
			raise Exception("Empty ")

		self.eof = ParserSymbol("Eof", 1)
		first_action = ParserAction(0, self.table[0])
		first_cached_action = ParserCachedAction(first_action)
		stack = collections.deque(first_cached_action)
		stack_count = 1
		vstack = collections.deque(None)
		vstach_count = 1
		yy = None
		_yy = None
		recovering = 0
		symbol = None
		action = None
		err_str = ''
		pre_error_symbol = None
		state = None

		self.set_input(_input)

		while True:
			# retrieve state number from top of stack
			state = stack[stack_count].action.state
			# use default actions if available
			if state is not None and self.default_actions[state.index]:
				action = self.default_actions[state.index]
			else:
				if symbol is None:
					symbol = self.parser_lex()
				# read action for current state and first input
				if state is not None:
					action = state.actions[symbol.index]
				else:
					action = None

			if action is None:
				if recovering is 0:
					# Report error
					expected = []
					


	# Jison generated lexer
	eof = None
	yy = None
	match = ''
	condition_stack = collections.deque()
	rules = {}
	conditions = {}
	done = False
	less = None
	more = None
	input = None
	offset = None
	ranges = None
	flex = False

	def set_input(self, _input):
		self.input = _input


class ParserCachedAction:
	def __init__(self, action, symbol=None):
		self.action = action
		self.symbol = symbol


class ParserAction:
	action = None
	state = None
	symbol = None

	def __init__(self, action, state=None, symbol=None):
		self.action = action
		self.state = state
		self.symbol = symbol


class ParserSymbol:
	name = None
	Index = 0
	index = -1
	symbols = {}
	symbols_by_name = {}

	def __init__(self, name, index):
		self.name = name
		self.index = index

	def add_action(self, parser_action):
		self.symbols[parser_action.index] = self.symbols_by_name[parser_action.name] = parser_action


class InputReader:
	input = None
	length = 0
	done = False
	matches = []
	position = 0

	def __init__(self, _input):
		self.input = _input
		self.length = len(_input)

	def add_match(self, match):
		self.matches.append(match)
		self.position += len(match)
		self.done = (self.position >= self.length)

	def ch(self):
		ch = self.input[self.position]
		self.add_match(ch)

	def un_ch(self, ch_length):
		self.position -= ch_length
		self.position = max(0, self.position)
		self.done = (self.position >= self.length)

	def substring(self, start, end):
		start = self.position if start == 0 else start + self.position
		end = self.length if end == 0 else start + end
		return self.input[start:end]

	def match(self, rule):
		matches = re.search(rule, self.position)
		if matches is not None:
			return matches.group()

		return None

	def to_string(self):
		return ''.join(self.matches)