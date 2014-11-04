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
					actions = self.table[state.index].actions
					for p in actions:
						if self.terminals[p] is not None and p > 2:
							expected.push(self.terminals[p].name)

					err_str = "Parser error on line " + self.yy.line_no + ":\n" + self.show
					


	# Jison generated lexer
	eof = None
	yy = None
	match = ''
	condition_stack = collections.deque()
	rules = {}
	conditions = {}
	done = False
	less = None
	_more = False
	input = None
	offset = None
	ranges = None
	flex = False
	line_expression = re.compile("(?:\r\n?|\n).*")

	def set_input(self, _input):
		self.input = InputReader(_input)
		self._more = self.less = self.done = False
		self.yy = ParserValue()#
		self.condition_stack.clear()
		self.condition_stack.append('INITIAL')

		if self.ranges is not None:
			self.yy.loc = ParserLocation()
			self.yy.loc.set_range(ParserRange(0, 0))
		else:
			self.yy.loc = ParserLocation()

		self.offset = 0

	def input(self):
		ch = self.input.ch()
		self.yy.text += ch
		self.yy.leng += 1
		self.offset += 1
		self.match += ch
		lines = self.line_expression.match(ch)
		if lines is not None:
			self.yy.line_no += 1
			self.yy.loc.last_line += 1
		else:
			self.yy.loc.last_column += 1

		if self.ranges is not None:
			self.yy.loc.range.y += 1

		return ch

	def unput(self, ch):
		yy = ParserValue()#
		_len = len(ch)
		lines = self.line_expression.split(ch)
		lines_count = len(lines)

		self.input.un_ch(_len)
		yy.text = self.yy.text[0: _len - 1]
		self.offset -= _len
		old_lines = self.line_expression.split(self.match)
		old_lines_count = len(old_lines)
		self.match = self.match[0:len(self.match) - 1]

		if lines_count - 1 > 0:
			yy.line_no = self.yy.line_no - lines_count - 1

		r = self.yy.loc.range
		old_lines_length = old_lines[old_lines_count - lines_count] if old_lines[old_lines_count - lines_count] is not None else 0

		yy.loc = ParserLocation( self.yy.loc.first_line, self.yy.line_no, self.yy.loc.first_column, self.yy.loc.first_line, None)#TODO

		if self.ranges is not None:
			yy.loc.range(ParserRange(r.x, r.x + self.yy.leng - _len))

		self.unput_stack.push(yy)

	def more(self):
		self._more = True

	def past_input(self):
		matched = self.input.to_string()
		past = matched[0:len(matched) - len(self.match)]

		result = past[-20].replace('\n', '')
		if len(past) > 20:
			return '...' + result
		return result

	def

class ParserLocation:
	first_line = 1
	last_line = 0
	first_column = 1
	last_column = 0
	range = None

	def __init__(self, first_line = 1, last_line = 0, first_column = 1, last_column = 0):
		self.first_line = first_line
		self.last_line = last_line
		self.first_column = first_column
		self.last_column = last_column

	def set_range(self, range):
		self.range = range

class ParserValue:
	leng = 0
	loc = None
	line_no = 0
	text = None




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


class ParserRange:
	x = None
	y = None

	def __init__(self, x, y):
		self.x = x
		self.y = y


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
		return ch

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