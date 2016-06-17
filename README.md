# GOMP: Go Meal Planner

Web-based recipe book and weekly meal planner.

## Building and Running

```bash
$ go get github.com/chadweimer/gomp
$ cd $GOPATH/src/github.com/chadweimer/gomp
$ go build
$ ./gomp
```

## Configuration

The folliwing table summarizes the available configuration settings, which are settable through environment variables.
If a setting is present in both the configuration file and OS environment variable, the value in the file is used.

| ENV                    | Value    | Default                |
|------------------------|----------|------------------------|
| GOMP_ROOT_URL_PATH     | string   | &lt;empty&gt;          |
| PORT                   | uint     | 4000                   |
| GOMP_UPLOAD_DRIVER     | string   | fs                     |
| GOMP_UPLOAD_PATH       | string   | data                   |
| GOMP_IS_DEVELOPMENT    | '0', '1' | 0                      |
| GOMP_SECRET_KEY        | string   | Secret123              |
| GOMP_APPLICATION_TITLE | string   | GOMP: Go Meal Planner  |
| DATABASE_DRIVER        | string   | sqlite3                |
| DATABASE_URL           | string   | sqlite3://data/gomp.db |

### Root URL Path

RootURLPath gets just the path portion of the base application url.
E.g., if the app sits at http://www.example.com/path/to/gomp,
this setting would be "/path/to/gomp".

Valid Values: Any valid url path, excluding domain.

### Port

Port gets the port number under which the site is being hosted.

Valid Values: Any valid port number.

## Database Support

## Credits

* [Negroni](https://github.com/urfave/negroni)
* [httprouter](https://github.com/julienschmidt/httprouter)
* [mattn/go-sqlite3](https://github.com/mattn/go-sqlite3)
* [lib/pq](https://github.com/lib/pq)
* [mattes/migrate](https://github.com/mattes/migrate)
* [disintegration/imaging](https://github.com/disintegration/imaging)
* [unrolled/render](https://github.com/unrolled/render)
* [Gorilla Sessions](https://github.com/gorilla/sessions)
* [Graceful](https://github.com/tylerb/graceful)
* [AWS SDK](https://github.com/aws/aws-sdk-go)
* [GoDep](https://github.com/tools/godep)
* [Materialize CSS](http://materializecss.com)
* [jQuery](https://jquery.com)

## License

[The MIT License(MIT)](LICENSE)
