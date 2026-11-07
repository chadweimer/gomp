package db

import (
	"database/sql"
	"testing"

	"github.com/chadweimer/gomp/models"
)

func Test_buildSQLiteFTSQuery(t *testing.T) {
	sqliteDB, err := sql.Open(SQLiteDriverName, ":memory:")
	if err != nil {
		t.Fatalf("failed to open in-memory sqlite db: %v", err)
	}
	defer sqliteDB.Close()

	_, err = sqliteDB.Exec(`CREATE VIRTUAL TABLE recipe_fts USING fts5(
		name,
		ingredients,
		directions,
		storage_instructions,
		nutrition_info,
		tokenize='porter unicode61'
	)`)
	if err != nil {
		t.Fatalf("failed to create recipe_fts table: %v", err)
	}

	tests := []struct {
		name         string
		filterFields []models.SearchField
		rawQuery     string
		expectedStmt string
		expectedArg  string
	}{
		{
			name:         "empty query",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "",
			expectedStmt: "",
			expectedArg:  "",
		},
		{
			name:         "whitespace query",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "   ",
			expectedStmt: "",
			expectedArg:  "",
		},
		{
			name:         "invalid fields",
			filterFields: []models.SearchField{"invalid"},
			rawQuery:     "cookie",
			expectedStmt: "",
			expectedArg:  "",
		},
		{
			name:         "empty fields defaults to all supported fields",
			filterFields: []models.SearchField{},
			rawQuery:     "cookie",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name ingredients directions storage_instructions nutrition_info} : ("cookie"*)`,
		},
		{
			name:         "nil fields defaults to all supported fields",
			filterFields: nil,
			rawQuery:     "cookie",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name ingredients directions storage_instructions nutrition_info} : ("cookie"*)`,
		},
		{
			name:         "single word",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "cookie",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : ("cookie"*)`,
		},
		{
			name:         "multiple words",
			filterFields: []models.SearchField{models.SearchFieldName, models.SearchFieldIngredients},
			rawQuery:     "chocolate chip",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name ingredients} : ("chocolate"* "chip"*)`,
		},
		{
			name:         "quoted phrase",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     `"chocolate chip"`,
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : ("chocolate chip")`,
		},
		{
			name:         "unclosed quote",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     `"chocolate chip`,
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : ("chocolate chip")`,
		},
		{
			name:         "word with negation",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "chocolate -nuts",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : (("chocolate"*) NOT "nuts"*)`,
		},
		{
			name:         "only negation",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "-nuts -dairy",
			expectedStmt: "r.id NOT IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : ("nuts"* OR "dairy"*)`,
		},
		{
			name:         "quoted phrase with negation",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     `chocolate -"peanut butter"`,
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : (("chocolate"*) NOT "peanut butter")`,
		},
		{
			name:         "OR operator",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "apple OR banana",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : ("apple"* OR "banana"*)`,
		},
		{
			name:         "OR operator with negation",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "apple OR banana -walnuts",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : (("apple"* OR "banana"*) NOT "walnuts"*)`,
		},
		{
			name:         "OR followed by negated term does not bridge to next positive term",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "apple OR -nuts banana",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : (("apple"* "banana"*) NOT "nuts"*)`,
		},
		{
			name:         "negated term followed by OR bridges positive terms",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "apple -nuts OR banana",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : (("apple"* OR "banana"*) NOT "nuts"*)`,
		},
		{
			name:         "stray OR operators",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "OR apple OR OR banana OR",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : ("apple"* OR "banana"*)`,
		},
		{
			name:         "special punctuation",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "recipe: 3/4 cup! *sweet*",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : ("recipe"* "3/4"* "cup"* "sweet"*)`,
		},
		{
			name:         "hyphenated words and apostrophes",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "all-purpose grandma's",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : ("all-purpose"* "grandma's"*)`,
		},
		{
			name:         "reserved FTS5 keywords",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     "mac AND cheese NOT ham",
			expectedStmt: "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)",
			expectedArg:  `{name} : ("mac"* "AND"* "cheese"* "NOT"* "ham"*)`,
		},
		{
			name:         "all punctuation results in empty",
			filterFields: []models.SearchField{models.SearchFieldName},
			rawQuery:     `: * ^ & { } "---"`,
			expectedStmt: "",
			expectedArg:  "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			stmt, arg := buildSQLiteFTSQuery(tc.filterFields, tc.rawQuery)
			if stmt != tc.expectedStmt {
				t.Errorf("expected stmt %q, got %q", tc.expectedStmt, stmt)
			}
			if arg != tc.expectedArg {
				t.Errorf("expected arg %q, got %q", tc.expectedArg, arg)
			}
			if arg != "" {
				rows, err := sqliteDB.Query("SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?", arg)
				if err != nil {
					t.Errorf("generated invalid FTS5 query %q: %v", arg, err)
				} else {
					rows.Close()
				}
			}
		})
	}
}
