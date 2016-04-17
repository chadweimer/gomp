package models

import (
	"database/sql"
	"log"
	"os"

	// sqlite3 database driver
	_ "github.com/mattn/go-sqlite3"
)

func OpenDatabase() *sql.DB {
	dbEmpty := false
	if _, err := os.Stat("./data/gomp.db"); os.IsNotExist(err) {
		dbEmpty = true
	}

	db, err := sql.Open("sqlite3", "./data/gomp.db")
	if err != nil {
		log.Fatal(err)
	}

	if dbEmpty {
		_, err = db.Exec("CREATE TABLE recipes (id INTEGER NOT NULL PRIMARY KEY, name TEXT)")
		if err != nil {
			log.Fatal(err)
		}
		_, err = db.Exec("INSERT INTO recipes(id,name) VALUES (1, 'Steak and Eggs'), (2, 'Pittsburgh Salad')")
		if err != nil {
			log.Fatal(err)
		}
	}

	return db
}
