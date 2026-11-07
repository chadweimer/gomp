package db

import (
	"fmt"
	"strings"
	"unicode"

	"github.com/chadweimer/gomp/models"
	"github.com/samber/lo"
)

type parsedFTSQuery struct {
	stmt string
	arg  string
}

// buildSQLiteFTSQuery transforms user-supplied search text and target fields into a safe FTS5 query.
func buildSQLiteFTSQuery(filterFields []models.SearchField, rawQuery string) (string, string) {
	fields := lo.Intersect(filterFields, supportedSearchFields[:])
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
		matchExpr := colPrefix + strings.Join(negativeTerms, " OR ")
		stmt := "r.id NOT IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)"
		return stmt, matchExpr
	}

	// Case 2: Positive terms, optionally followed by negative terms
	var matchExpr string
	posExpr := strings.Join(positiveTerms, " ")
	if len(negativeTerms) > 0 {
		negExpr := strings.Join(negativeTerms, " NOT ")
		matchExpr = fmt.Sprintf("%s%s NOT %s", colPrefix, posExpr, negExpr)
	} else {
		matchExpr = colPrefix + posExpr
	}

	stmt := "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)"
	return stmt, matchExpr
}

func parseQueryTokens(input string) ([]string, []string) {
	runes := []rune(input)
	length := len(runes)
	i := 0

	var rawPositive []string
	var rawNegative []string

	for i < length {
		// Skip whitespace
		for i < length && unicode.IsSpace(runes[i]) {
			i++
		}
		if i >= length {
			break
		}

		isNegated := false
		if runes[i] == '-' && i+1 < length && !unicode.IsSpace(runes[i+1]) {
			isNegated = true
			i++
		}

		if i < length && runes[i] == '"' {
			// Quoted phrase
			i++ // skip opening quote
			start := i
			for i < length && runes[i] != '"' {
				i++
			}
			phrase := string(runes[start:i])
			if i < length && runes[i] == '"' {
				i++ // skip closing quote
			}
			phrase = cleanPhrase(phrase)
			if phrase != "" {
				formatted := `"` + phrase + `"`
				if isNegated {
					rawNegative = append(rawNegative, formatted)
				} else {
					rawPositive = append(rawPositive, formatted)
				}
			}
		} else {
			// Bare term
			start := i
			for i < length && !unicode.IsSpace(runes[i]) && runes[i] != '"' {
				i++
			}
			term := string(runes[start:i])
			if !isNegated && term == "OR" {
				rawPositive = append(rawPositive, "OR")
				continue
			}

			term = cleanTerm(term)
			if term != "" {
				formatted := term + "*"
				if isNegated {
					rawNegative = append(rawNegative, formatted)
				} else {
					rawPositive = append(rawPositive, formatted)
				}
			}
		}
	}

	// Clean up OR operators in rawPositive (avoid leading, trailing, or consecutive ORs)
	positive := cleanOROperators(rawPositive)

	return positive, rawNegative
}

func cleanPhrase(phrase string) string {
	// Remove characters that disrupt FTS5 phrases
	clean := strings.Map(func(r rune) rune {
		switch r {
		case '"', ':', '*', '^', '{', '}', '(', ')':
			return ' '
		default:
			return r
		}
	}, phrase)
	return strings.TrimSpace(clean)
}

func cleanTerm(term string) string {
	// Strip special FTS5 control characters
	clean := strings.Map(func(r rune) rune {
		switch r {
		case '"', ':', '*', '^', '{', '}', '(', ')', '~', '+', '&', '|', '-':
			return -1
		default:
			return r
		}
	}, term)
	return strings.TrimSpace(clean)
}

func cleanOROperators(tokens []string) []string {
	result := make([]string, 0, len(tokens))
	for _, tok := range tokens {
		if tok == "OR" {
			// Don't add OR if it would be at the start or consecutive
			if len(result) == 0 || result[len(result)-1] == "OR" {
				continue
			}
			result = append(result, "OR")
		} else {
			result = append(result, tok)
		}
	}
	// Don't leave trailing OR
	if len(result) > 0 && result[len(result)-1] == "OR" {
		result = result[:len(result)-1]
	}
	return result
}
