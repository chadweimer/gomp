# GOMP: Go Meal Planner

Web-based recipe book and weekly meal planner.

## Building and Running

```bash
cd $GOPATH/src
git clone https://github.com/chadweimer/gomp.git
cd gomp
go build
./gomp
```

## Configuration

Certain aspects of the application (e.g., the database url) can be configured either through an
JSON application configuration file ( and/or envionment variables. The folliwing table summarizes
the available settings. If a setting is present in both the configuration file and OS environment
variable, the value in the file is used.

| JSON              | ENV                    | Value (JSON / ENV)    | Default                |
|-------------------|------------------------|-----------------------|------------------------|
| root_url_path     | GOMP_ROOT_URL_PATH     | string / string       | &lt;empty&gt;          |
| port              | PORT                   | uint / unit           | 4000                   |
| upload_driver     | GOMP_UPLOAD_DRIVER     | string / string       | fs                     |
| upload_path       | GOMP_UPLOAD_PATH       | string / string       | data                   |
| is_development    | GOMP_IS_DEVELOPMENT    | bool / '0', '1'       | false, 0               |
| secret_key        | GOMP_SECRET_KEY        | string / string       | Secret123              |
| application_title | GOMP_APPLICATION_TITLE | string / string       | GOMP: Go Meal Planner  |
| database_driver   | DATABASE_DRIVER        | string / string       | sqlite3                |
| database_url      | DATABASE_URL           | string / string       | sqlite3://data/gomp.db |

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
