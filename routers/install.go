package routers

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"gopkg.in/macaron.v1"
)

func Install(ctx *macaron.Context) {
	if _, err := os.Stat("./data/"); os.IsNotExist(err) {
		err = os.Mkdir("./data/", 0775)
		if err != nil {
			log.Fatal(err)
		}
	}

	db, err := sql.Open("sqlite3", "./data/gomp.db")
	if err != nil {
		log.Fatal(err)
	}
	_, err = db.Exec("CREATE TABLE recipes (id INTEGER NOT NULL PRIMARY KEY, name TEXT, description TEXT)")
	if err != nil {
		log.Fatal(err)
	}

	ctx.HTML(http.StatusOK, "install")
}
