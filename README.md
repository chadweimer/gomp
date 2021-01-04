# GOMP: Go Meal Planner

Web-based recipe book.

[![TravisCI](https://img.shields.io/travis/com/chadweimer/gomp.svg?label=travisci)](https://travis-ci.com/chadweimer/gomp)
[![Code Climate](https://img.shields.io/codeclimate/maintainability/chadweimer/gomp.svg)](https://codeclimate.com/github/chadweimer/gomp)
[![SonarQube Tech Debt](https://img.shields.io/sonar/https/sonarcloud.io/chadweimer%3Agomp/tech_debt.svg)](https://sonarcloud.io/dashboard?id=chadweimer%3Agomp)
[![Closed Pull Requests](https://img.shields.io/github/issues-pr-closed-raw/chadweimer/gomp.svg)](https://github.com/chadweimer/gomp/pulls)
[![GitHub release](https://img.shields.io/github/release/chadweimer/gomp.svg)](https://github.com/chadweimer/gomp/releases)
[![license](https://img.shields.io/github/license/chadweimer/gomp.svg)](LICENSE)

## Installation

### Docker

The easiest method is via docker.

```bash
docker run -p 5000:5000 cwmr/gomp
```

The above command will use the default configuration, which includes using an embedded SQLite database and ephemeral storage, which is not recommended in production.
In order to have persistent storage, you can use a bind mount or named volume with the volume exposed by the container at "/var/app/gomp/data".

```bash
docker run -p 5000:5000 -v /path/on/host:/var/app/gomp/data cwmr/gomp
```

The equivalent compose file, this time using a named volume, would look like the following.

```yaml
version: '2'

volumes:
  data:
services:
  web:
    image: cwmr/gomp
    volumes:
      - data:/var/app/gomp/data
    ports:
      - 5000:5000
```

#### With PostgreSQL

The easiest way to deploy with a PostgreSQL database is via `docker-compose`.
An example compose file can be found at the root of this repo and is shown below.

```yaml
version: '2'

volumes:
  data:
  db-data:
services:
  web:
    image: cwmr/gomp
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgres://dbuser:dbpassword@db/gomp?sslmode=disable
    volumes:
      - data:/var/app/gomp/data
    ports:
      - 5000:5000
  db:
    image: postgres
    environment:
      - POSTGRES_PASSWORD=dbpassword
      - POSTGRES_USER=dbuser
      - POSTGRES_DB=gomp
    volumes:
      - db-data:/var/lib/postgresql/data
```

You will obviously want to cater the values (e.g., passwords) for your deployment.

### Kubernetes

TODO

### Manual

TODO

## Configuration

The following table summarizes the available configuration settings, which are settable through environment variables.

| ENV                              | Value(s)             | Default               | Description |
|----------------------------------|----------------------|-----------------------|-------------|
| DATABASE\_DRIVER                 | 'postgres', 'sqlite3' | &lt;empty&gt;        | Which database/sql driver to use. If blank, the app will attempt to infer it based on the value of DATABASE\_URL. |
| DATABASE\_URL                    | string               | file:data/data.db     | The url (or path, connection string, etc) to use with the associated database driver when opening the database connection. |
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
