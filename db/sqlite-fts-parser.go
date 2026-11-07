package db

import (
	"fmt"
	"strings"
	"unicode"

	"github.com/chadweimer/gomp/models"
)

// rawFTSToken represents a single lexical unit extracted from the user's raw
// search string before it is sanitized and formatted for SQLite FTS5.
type rawFTSToken struct {
	text      string
	isQuoted  bool // true when the token was enclosed in double quotes (e.g. "peanut butter")
	isNegated bool // true when the token was prefixed with '-' (e.g. -walnuts or -"peanut butter")
}

// buildSQLiteFTSQuery translates a user-supplied "web search" query string and
// a list of target recipe fields into a SQL WHERE clause fragment and a safe
// SQLite FTS5 MATCH expression.
//
// Background — Bridging PostgreSQL and SQLite Full-Text Search:
//
// In PostgreSQL, GOMP uses `websearch_to_wildcard_tsquery` (a thin wrapper around
// PostgreSQL's built-in `websearch_to_tsquery` defined in migration 0012). That
// function natively accepts human-typed search syntax without ever raising syntax
// errors on stray punctuation or unclosed quotes:
//   - Space-separated words are combined with implicit AND and given prefix
//     wildcards (`chocolate chip` -> `chocolate:* & chip:*`).
//   - Double-quoted phrases match exact word sequences without prefix wildcards
//     (`"chocolate chip"` -> `chocolate <-> chip`).
//   - A leading hyphen excludes a word or phrase (`-nuts` -> `!nuts:*`).
//   - Uppercase `OR` joins adjacent terms with logical OR (`apple OR banana`).
//
// SQLite's FTS5 engine (`recipe_fts MATCH ?`), by contrast, expects a strict
// domain-specific query grammar. Passing raw user input directly to `MATCH`
// causes runtime SQL errors (`fts5: syntax error`) whenever the input contains
// characters that have special meaning in FTS5 (such as `:`, `*`, `^`, `(`, `)`,
// `{`, `}`, `"`, `-`, `/`, `!`, `'`, `.`) or reserved uppercase keywords (`AND`,
// `OR`, `NOT`).
//
// This function pre-parses the user's input and constructs an equivalent,
// syntax-error-free FTS5 query.
func buildSQLiteFTSQuery(filterFields []models.SearchField, rawQuery string) (stmt, matchExpr string) {
	fields := normalizeSearchFields(filterFields)
	if len(fields) == 0 {
		return "", ""
	}

	trimmed := strings.TrimSpace(rawQuery)
	if trimmed == "" {
		return "", ""
	}

	positiveTerms, negativeTerms := parseQueryTokens(trimmed)
	if len(positiveTerms) == 0 && len(negativeTerms) == 0 {
		return "", ""
	}

	// In SQLite FTS5, `{col1 col2} : <expr>` restricts the search to the listed
	// columns of the virtual table instead of searching every column.
	//
	// IMPORTANT: In FTS5 grammar, the column filter prefix `{...} :` has higher
	// precedence than boolean operators (implicit AND, OR, NOT) and binds ONLY
	// to the immediately following token unless the right-hand expression is
	// wrapped in parentheses `{col1 col2} : (<expr>)`. Without parentheses,
	// `{name} : "chocolate"* "chip"*` would restrict `"chocolate"*` to `name`
	// but search `"chip"*` across ALL columns.
	colNames := make([]string, 0, len(fields))
	for _, f := range fields {
		colNames = append(colNames, string(f))
	}
	colPrefix := fmt.Sprintf("{%s} : ", strings.Join(colNames, " "))

	// Case 1: Only negative terms (e.g. `-walnuts -peanuts`).
	//
	// SQLite FTS5's `NOT` operator is strictly binary (`<left> NOT <right>`); it
	// filters rows out of `<left>`. FTS5 has no unary `NOT <right>` operator to
	// mean "all rows in the table except those matching <right>".
	//
	// When the user provides only exclusions and no positive search terms, we
	// construct an FTS5 query that matches any of the excluded terms (`OR`) and
	// negate the membership check at the SQL level using `r.id NOT IN (...)`.
	if len(positiveTerms) == 0 {
		matchExpr = fmt.Sprintf("%s(%s)", colPrefix, strings.Join(negativeTerms, " OR "))
		stmt = "r.id NOT IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)"
		return stmt, matchExpr
	}

	// Case 2: Positive terms, optionally combined with negative terms.
	//
	// In FTS5, space-separated terms are implicitly combined with `AND`
	// (e.g. `"chocolate"* "chip"*` requires both terms to match), while explicit
	// `OR` tokens in `positiveTerms` join adjacent terms with logical OR.
	//
	// When negative terms are also present, we use FTS5's binary `NOT` operator:
	//   `((<positive_expr>) NOT <neg1> NOT <neg2>)`
	// Wrapping `<positive_expr>` in its own parentheses is required because `NOT`
	// binds tighter than `OR` in FTS5. Without inner parentheses,
	// `"apple"* OR "banana"* NOT "walnuts"*` would be evaluated by FTS5 as
	// `"apple"* OR ("banana"* NOT "walnuts"*)`, failing to exclude walnuts from
	// recipes that matched `"apple"*`.
	posExpr := strings.Join(positiveTerms, " ")
	if len(negativeTerms) > 0 {
		negExpr := strings.Join(negativeTerms, " NOT ")
		matchExpr = fmt.Sprintf("%s((%s) NOT %s)", colPrefix, posExpr, negExpr)
	} else {
		matchExpr = fmt.Sprintf("%s(%s)", colPrefix, posExpr)
	}

	stmt = "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)"
	return stmt, matchExpr
}

// parseQueryTokens splits a raw search string into formatted FTS5 positive terms
// (which may include `"OR"` operators between terms) and formatted negative terms.
func parseQueryTokens(input string) (positive, negative []string) {
	tokens := tokenizeRawQuery(input)

	// pendingOR tracks whether an unquoted uppercase `OR` was seen after at least
	// one valid positive term. Deferring emission of `"OR"` until the next valid
	// positive term is encountered naturally strips invalid leading `OR`s
	// (`OR apple`), trailing `OR`s (`apple OR`), and consecutive `OR`s
	// (`apple OR OR banana`), which would otherwise cause FTS5 syntax errors.
	pendingOR := false

	for _, tok := range tokens {
		// Match PostgreSQL `websearch_to_tsquery` behavior: only an unquoted,
		// non-negated, uppercase `"OR"` acts as the logical OR operator.
		if !tok.isQuoted && !tok.isNegated && tok.text == "OR" {
			if len(positive) > 0 {
				pendingOR = true
			}
			continue
		}

		formatted := formatFTSToken(tok)
		if formatted == "" {
			// If a negated token contained only stripped punctuation (e.g. `---`),
			// clear any pending OR so `apple OR --- banana` doesn't bridge `OR`
			// across a discarded negation.
			if tok.isNegated {
				pendingOR = false
			}
			continue
		}

		if tok.isNegated {
			// Negated terms are collected into a separate slice and applied as
			// `NOT` clauses at the end of the FTS5 expression. If the user wrote
			// `apple OR -nuts banana`, the `OR` was immediately followed by a
			// negated term rather than a positive term, so we discard `pendingOR`
			// rather than unintentionally turning `apple ... banana` into an OR.
			// (By contrast, `apple -nuts OR banana` sets `pendingOR` *after*
			// `-nuts`, so `apple` and `banana` are still joined with `OR`.)
			pendingOR = false
			negative = append(negative, formatted)
			continue
		}

		if pendingOR {
			positive = append(positive, "OR")
			pendingOR = false
		}
		positive = append(positive, formatted)
	}

	return positive, negative
}

// tokenizeRawQuery scans the input string left-to-right into raw tokens,
// respecting double-quoted phrases and leading `-` negation prefixes.
func tokenizeRawQuery(input string) []rawFTSToken {
	runes := []rune(input)
	var tokens []rawFTSToken

	for i := skipSpaces(runes, 0); i < len(runes); i = skipSpaces(runes, i) {
		var tok rawFTSToken
		tok, i = readNextToken(runes, i)
		tokens = append(tokens, tok)
	}

	return tokens
}

func skipSpaces(runes []rune, i int) int {
	for i < len(runes) && unicode.IsSpace(runes[i]) {
		i++
	}
	return i
}

// readNextToken reads a single quoted phrase or whitespace-delimited bare word
// starting at index i, returning the token and the next rune index.
func readNextToken(runes []rune, i int) (rawFTSToken, int) {
	isNegated := false
	// A leading '-' acts as negation only when immediately followed by a
	// non-whitespace character (e.g. `-nuts` or `-"peanut butter"`). A standalone
	// `-` surrounded by spaces is treated as a bare token and later ignored.
	if runes[i] == '-' && i+1 < len(runes) && !unicode.IsSpace(runes[i+1]) {
		isNegated = true
		i++
	}

	if i < len(runes) && runes[i] == '"' {
		text, next := readQuotedText(runes, i+1)
		return rawFTSToken{text: text, isQuoted: true, isNegated: isNegated}, next
	}

	text, next := readBareText(runes, i)
	return rawFTSToken{text: text, isQuoted: false, isNegated: isNegated}, next
}

// readQuotedText reads runes after an opening `"` until the matching closing `"`
// (or the end of the input if the user left the quote unclosed, matching
// PostgreSQL's forgiving websearch behavior).
func readQuotedText(runes []rune, start int) (string, int) {
	i := start
	for i < len(runes) && runes[i] != '"' {
		i++
	}
	text := string(runes[start:i])
	if i < len(runes) && runes[i] == '"' {
		i++ // consume closing quote
	}
	return text, i
}

// readBareText reads a contiguous run of non-whitespace, non-quote runes.
// Stopping at `"` allows inputs like `foo"bar baz"` to split cleanly into the
// bare term `foo` followed by the quoted phrase `"bar baz"`.
func readBareText(runes []rune, start int) (string, int) {
	i := start
	for i < len(runes) && !unicode.IsSpace(runes[i]) && runes[i] != '"' {
		i++
	}
	return string(runes[start:i]), i
}

// formatFTSToken converts a raw token into its safe SQLite FTS5 representation:
//   - Quoted phrases become `"phrase"` (exact token sequence match, no prefix `*`).
//   - Bare terms become `"term"*` (prefix match on the token).
//
// Why bare terms are wrapped in double quotes before `*` (`"term"*`):
// In SQLite FTS5, unquoted barewords may ONLY contain ASCII letters/digits, `_`,
// or non-ASCII characters, and cannot be the uppercase words `AND`, `OR`, or `NOT`.
// Unquoted tokens containing common recipe punctuation—such as fractions (`3/4*`),
// apostrophes (`grandma's*`), or hyphens (`all-purpose*`)—or reserved keywords
// (`AND*`, `NOT*`) would either fail with a runtime `fts5: syntax error` or fail
// to match indexed text.
//
// By enclosing the cleaned term in double quotes and placing `*` immediately
// outside the closing quote (`"3/4"*`, `"all-purpose"*`, `"grandma's"*`), FTS5
// passes the string through the table's `porter unicode61` tokenizer:
//   - Internal punctuation (`/`, `-`, `'`) is split into constituent tokens
//     exactly the same way recipe text was tokenized when indexed (e.g.
//     `"all-purpose"*` matches `"all"` followed by prefix `"purpose"*`).
//   - Reserved words (`"AND"*`, `"NOT"*`) are treated as literal search words
//     rather than boolean operators.
func formatFTSToken(tok rawFTSToken) string {
	if tok.isQuoted {
		phrase := cleanPhrase(tok.text)
		if phrase == "" {
			return ""
		}
		return `"` + phrase + `"`
	}

	term := cleanTerm(tok.text)
	if term == "" {
		return ""
	}
	return `"` + term + `"*`
}

// cleanPhrase sanitizes the contents of a double-quoted phrase by replacing FTS5
// syntax characters with spaces. If the resulting phrase contains no letters or
// numbers (e.g. `": * ^"`), it returns `""` so the empty phrase is ignored.
func cleanPhrase(phrase string) string {
	clean := strings.Map(func(r rune) rune {
		switch r {
		case '"', ':', '*', '^', '{', '}', '(', ')':
			return ' '
		default:
			return r
		}
	}, phrase)
	clean = strings.TrimSpace(clean)
	if !strings.ContainsFunc(clean, isAlphanumeric) {
		return ""
	}
	return clean
}

// cleanTerm sanitizes an unquoted search word by stripping FTS5 operator
// characters and trimming any leading or trailing non-alphanumeric punctuation
// (e.g. `recipe:` -> `recipe`, `cup!` -> `cup`, `*sweet*` -> `sweet`).
// Internal characters like `-`, `/`, and `'` are preserved so terms like
// `all-purpose`, `3/4`, and `grandma's` remain intact inside `"term"*`.
func cleanTerm(term string) string {
	clean := strings.Map(func(r rune) rune {
		switch r {
		case '"', ':', '*', '^', '{', '}', '(', ')', '~', '+', '&', '|':
			return -1
		default:
			return r
		}
	}, term)
	return strings.TrimFunc(clean, func(r rune) bool {
		return !isAlphanumeric(r)
	})
}

func isAlphanumeric(r rune) bool {
	return unicode.IsLetter(r) || unicode.IsNumber(r)
}
