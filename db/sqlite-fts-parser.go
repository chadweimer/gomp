package db

import (
	"fmt"
	"strings"
	"unicode"

	"github.com/chadweimer/gomp/models"
)

type rawFTSToken struct {
	text      string
	isQuoted  bool
	isNegated bool
}

// buildSQLiteFTSQuery transforms user-supplied search text and target fields into a safe FTS5 query.
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

	colNames := make([]string, 0, len(fields))
	for _, f := range fields {
		colNames = append(colNames, string(f))
	}
	colPrefix := fmt.Sprintf("{%s} : ", strings.Join(colNames, " "))

	// Case 1: Only negative terms (e.g. "-walnuts -peanuts")
	if len(positiveTerms) == 0 {
		matchExpr = fmt.Sprintf("%s(%s)", colPrefix, strings.Join(negativeTerms, " OR "))
		stmt = "r.id NOT IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)"
		return stmt, matchExpr
	}

	// Case 2: Positive terms, optionally followed by negative terms
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

func parseQueryTokens(input string) (positive, negative []string) {
	tokens := tokenizeRawQuery(input)
	pendingOR := false

	for _, tok := range tokens {
		if !tok.isQuoted && !tok.isNegated && tok.text == "OR" {
			if len(positive) > 0 {
				pendingOR = true
			}
			continue
		}

		formatted := formatFTSToken(tok)
		if formatted == "" {
			if tok.isNegated {
				pendingOR = false
			}
			continue
		}

		if tok.isNegated {
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

func readNextToken(runes []rune, i int) (rawFTSToken, int) {
	isNegated := false
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

func readQuotedText(runes []rune, start int) (string, int) {
	i := start
	for i < len(runes) && runes[i] != '"' {
		i++
	}
	text := string(runes[start:i])
	if i < len(runes) && runes[i] == '"' {
		i++
	}
	return text, i
}

func readBareText(runes []rune, start int) (string, int) {
	i := start
	for i < len(runes) && !unicode.IsSpace(runes[i]) && runes[i] != '"' {
		i++
	}
	return string(runes[start:i]), i
}

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
