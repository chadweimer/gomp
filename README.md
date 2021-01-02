# GOMP: Go Meal Planner

Web-based recipe book.

[![TravisCI](https://img.shields.io/travis/com/chadweimer/gomp.svg?label=travisci)](https://travis-ci.com/chadweimer/gomp)
[![Code Climate](https://img.shields.io/codeclimate/maintainability/chadweimer/gomp.svg)](https://codeclimate.com/github/chadweimer/gomp)
[![SonarQube Tech Debt](https://img.shields.io/sonar/https/sonarcloud.io/chadweimer%3Agomp/tech_debt.svg)](https://sonarcloud.io/dashboard?id=chadweimer%3Agomp)
[![Closed Pull Requests](https://img.shields.io/github/issues-pr-closed-raw/chadweimer/gomp.svg)](https://github.com/chadweimer/gomp/pulls)
[![GitHub release](https://img.shields.io/github/release/chadweimer/gomp.svg)](https://github.com/chadweimer/gomp/releases)
[![license](https://img.shields.io/github/license/chadweimer/gomp.svg)](LICENSE)

## Configuration

The following table summarizes the available configuration settings, which are settable through environment variables.

| ENV                              | Value(s)             | Default               | Description |
|----------------------------------|----------------------|-----------------------|-------------|
| DATABASE\_DRIVER                 | 'postgres', 'sqlite3' | &lt;empty&gt;        | Which database/sql driver to use. If blank, the app will attempt to infer it based on the value of DATABASE\_URL. |
| DATABASE\_URL                    | string               | file:data/data.db     | The url (or path, connection string, etc) to use with the associated database driver when opening the database connection. |
| GOMP\_APPLICATION\_TITLE         | string               | GOMP: Go Meal Planner | Used where the application name (title) is displayed on screen. |
| GOMP_BASE_ASSETS_PATH            | string               | static                | The base path to the client assets. |
| GOMP\_IS\_DEVELOPMENT            | '0', '1'             | 0                     | Defines whether to run the application in "development mode". Development mode turns on additional features, such as logging, that may not be desirable in a production environment. |
| GOMP\_MIGRATIONS\_FORCE\_VERSION | int                  | -1                    | A version to force the migrations to on startup (will not run any of the migrations themselves). Set to a negative number to skip forcing a version. |
| GOMP\_MIGRATIONS\_TABLE\_NAME    | string               | &lt;empty&gt;         | The name of the database migrations table to use. Leave blank to use the default from <https://github.com/golang-migrate/migrate.> |
| GOMP\_UPLOAD\_DRIVER             | 'fs', 's3'           | fs                    | Used to select which backend data store is used for file uploads. |
| GOMP\_UPLOAD\_PATH               | string               | data/uploads          | The path (full or relative) under which to store uploads. When using Amazon S3, this should be set to the bucket name. |
| PORT                             | uint                 | 4000                  | The port number under which the site is being hosted. |
| SECURE\_KEY                      | []string             | ChangeMe              | Used for session authentication. Recommended to be 32 or 64 ASCII characters. Multiple keys can be separated by commas. |

## Database Support

Currently PostgreSQL and SQLite are supported.

## Building

### Installing Dependencies

```bash
make [re]install
```

### Compiling

```bash
make [re]build
```

### Docker Images

```bash
make docker
```

## Credits

See [static/package.json](static/package.json) and [go.mod](go.mod)
