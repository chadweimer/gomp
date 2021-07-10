# GOMP: Go Meal Planner

Web-based recipe book.

![Continuous Integration](https://img.shields.io/github/workflow/status/chadweimer/gomp/Continuous%20Integration)
[![Code Climate](https://img.shields.io/codeclimate/maintainability/chadweimer/gomp.svg)](https://codeclimate.com/github/chadweimer/gomp)
[![Closed Pull Requests](https://img.shields.io/github/issues-pr-closed-raw/chadweimer/gomp.svg)](https://github.com/chadweimer/gomp/pulls)
[![GitHub release](https://img.shields.io/github/release/chadweimer/gomp.svg)](https://github.com/chadweimer/gomp/releases)
[![license](https://img.shields.io/github/license/chadweimer/gomp.svg)](LICENSE)

## Installation

### Docker

The easiest method is via docker.

```bash
docker run -p 5000:5000 cwmr/gomp
```

On a fresh deployment, you can log into the application using the default user "admin@example.com" with password "password".

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
An example compose file can be found at [examples/docker-compose.yml](examples/docker-compose.yml) and is shown below.

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

A basic manifest is shown below. This manifest is roughly equivalent to the first docker command shown in the [Docker](#Docker) section above, and is thus not recommended for production use.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.service: web
  name: web
spec:
  selector:
    matchLabels:
      app.service: web
  template:
    metadata:
      labels:
        app.service: web
    spec:
      containers:
      - image: cwmr/gomp
        name: web
        ports:
        - containerPort: 5000
        restartPolicy: Always
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.service: web
  name: web
spec:
  ports:
  - port: 5000
    targetPort: 5000
  selector:
    app.service: web
```

:construction: TODO

### Manual

:construction: TODO

## Configuration

The following table summarizes the available configuration settings, which are settable through environment variables.

ENV                     |Value(s)         |Default          |Description
------------------------|-----------------|-----------------|------------
BASE_ASSETS_PATH        |string           |static           |The base path to the client assets.
DATABASE_DRIVER         |postgres, sqlite3|&lt;empty&gt;    |Which database/sql driver to use. If blank, the app will attempt to infer it based on the value of DATABASE_URL.
DATABASE_URL            |string           |file:data/data.db|The url (or path, connection string, etc) to use with the associated database driver when opening the database connection.
IS_DEVELOPMENT          |0, 1             |0                |Defines whether to run the application in "development mode". Development mode turns on additional features, such as logging, that may not be desirable in a production environment.
MIGRATIONS_FORCE_VERSION|int              |-1               |A version to force the migrations to on startup (will not run any of the migrations themselves). Set to a negative number to skip forcing a version.
MIGRATIONS_TABLE_NAME   |string           |&lt;empty&gt;    |The name of the database migrations table to use. Leave blank to use the default from <https://github.com/golang-migrate/migrate.>
PORT                    |uint             |5000             |The port number under which the site is being hosted.
SECURE_KEY              |[]string         |ChangeMe         |Used for session authentication. Recommended to be 32 or 64 ASCII characters. Multiple keys can be separated by commas.
UPLOAD_DRIVER           |fs, s3           |fs               |Used to select which backend data store is used for file uploads.
UPLOAD_PATH             |string           |data/uploads     |The path (full or relative) under which to store uploads. When using Amazon S3, this should be set to the bucket name.

All environment variables can also be prefixed with "GOMP_" (e.g., GOMP_IS_DEVELOPMENT=1) in cases where there is a need to avoid collisions with other applications.
The name with "GOMP_" is prefered if both are present.

For values that allow releative paths (e.g., BASE_ASSETS_PATH, DATABASE_URL for SQLite, and UPLOAD_PATH for the fs driver), they are always relative to the application working directory.
When using docker, this is "/var/app/gomp", so anything at or below the "data/" relative path is in the exposed "/var/app/gomp/data" volume.

## Database Support

Currently PostgreSQL and SQLite are supported.

## Building

This repository uses make. The simplest way to build the entire project is to simply issue the following command at the root of the repository:

```bash
make
```

The sections below describe additional operations that are available, though it is not a complete list. Refer the the [Makefile](Makefile) for more.

### Installing Dependencies

```bash
make install
```

The equivalent for uninstalling is `make uninstall`.

### Linting

```bash
make lint
```

### Compiling

```bash
make build
```

The equivalent for cleaning is `make clean`.

### Building Docker Images

```bash
make docker
```

### Creating Release Archives

```bash
make archive
```

These archives are deleted (cleaned) by the same `clean` target as above.

## Credits

See [static/package.json](static/package.json) and [go.mod](go.mod)
