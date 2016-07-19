# GOMP: Go Meal Planner

Web-based recipe book.

## Configuration

The folliwing table summarizes the available configuration settings, which are settable through environment variables.
If a setting is present in both the configuration file and OS environment variable, the value in the file is used.

| ENV                      | Value    | Default               |
|--------------------------|----------|-----------------------|
| GOMP\_ROOT\_URL_PATH     | string   | &lt;empty&gt;         |
| PORT                     | uint     | 4000                  |
| GOMP\_UPLOAD\_DRIVER     | string   | fs                    |
| GOMP\_UPLOAD\_PATH       | string   | data                  |
| GOMP\_IS_DEVELOPMENT     | '0', '1' | 0                     |
| GOMP\_SECRET\_KEY        | string   | Secret123             |
| GOMP\_APPLICATION\_TITLE | string   | GOMP: Go Meal Planner |
| DATABASE_DRIVER          | string   | postgres              |
| DATABASE\_URL            | string   | &lt;empty&gt;         |

### Root URL Path

RootURLPath gets just the path portion of the base application url.
E.g., if the app sits at http://www.example.com/path/to/gomp,
this setting would be "/path/to/gomp".

Valid Values: Any valid url path, excluding domain.

### Port

Port gets the port number under which the site is being hosted.

Valid Values: Any valid port number.

## Database Support

Currently only PostgreSQL is supported.

## Credits

See [GoDeps/Godeps.json](GoDeps/Godeps.json)

## License

[The MIT License(MIT)](LICENSE)
