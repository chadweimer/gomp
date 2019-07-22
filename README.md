[![TravisCI](https://img.shields.io/travis/chadweimer/gomp.svg?label=travisci)](https://travis-ci.org/chadweimer/gomp)
[![Code Climate](https://img.shields.io/codeclimate/maintainability/chadweimer/gomp.svg)](https://codeclimate.com/github/chadweimer/gomp)
[![SonarQube Tech Debt](https://img.shields.io/sonar/https/sonarcloud.io/chadweimer%3Agomp/tech_debt.svg)](https://sonarcloud.io/dashboard?id=chadweimer%3Agomp)
[![Closed Pull Requests](https://img.shields.io/github/issues-pr-closed-raw/chadweimer/gomp.svg)](https://github.com/chadweimer/gomp/pulls)
[![GitHub release](https://img.shields.io/github/release/chadweimer/gomp.svg)](https://github.com/chadweimer/gomp/releases)
[![license](https://img.shields.io/github/license/chadweimer/gomp.svg)](LICENSE)

# GOMP: Go Meal Planner

Web-based recipe book.

## Configuration

The following table summarizes the available configuration settings, which are settable through environment variables.

| ENV                             | Value    | Default               |
|---------------------------------|----------|-----------------------|
| PORT                            | uint     | 4000                  |
| GOMP\_UPLOAD\_DRIVER            | string   | fs                    |
| GOMP\_UPLOAD\_PATH              | string   | data                  |
| GOMP\_IS_DEVELOPMENT            | '0', '1' | 0                     |
| SECURE\_KEY                     | []string | &lt;nil&gt;           |
| GOMP\_APPLICATION\_TITLE        | string   | GOMP: Go Meal Planner |
| DATABASE_DRIVER                 | string   | postgres              |
| DATABASE\_URL                   | string   | &lt;empty&gt;         |
| GOMP\_FORCE\_MIGRATION\_VERSION | int      | -1                    |

## Database Support

Currently only PostgreSQL is supported.

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
