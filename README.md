[![TravisCI](https://img.shields.io/travis/chadweimer/gomp.svg?style=flat-square&label=travisci)](https://travis-ci.org/chadweimer/gomp)
[![Code Climate](https://img.shields.io/codeclimate/github/chadweimer/gomp.svg?style=flat-square)](https://codeclimate.com/github/chadweimer/gomp)
[![Closed Pull Requests](https://img.shields.io/github/issues-pr-closed-raw/chadweimer/gomp.svg?style=flat-square)](https://github.com/chadweimer/gomp/pulls)
[![GitHub release](https://img.shields.io/github/release/chadweimer/gomp.svg?style=flat-square)](https://github.com/chadweimer/gomp/releases)
[![license](https://img.shields.io/github/license/chadweimer/gomp.svg?style=flat-square)](LICENSE)

# GOMP: Go Meal Planner

Web-based recipe book.

## Configuration

The following table summarizes the available configuration settings, which are settable through environment variables.

| ENV                      | Value    | Default               |
|--------------------------|----------|-----------------------|
| PORT                     | uint     | 4000                  |
| GOMP\_UPLOAD\_DRIVER     | string   | fs                    |
| GOMP\_UPLOAD\_PATH       | string   | data                  |
| GOMP\_IS_DEVELOPMENT     | '0', '1' | 0                     |
| SECURE\_KEY              | []string | &lt;nil&gt;           |
| GOMP\_APPLICATION\_TITLE | string   | GOMP: Go Meal Planner |
| DATABASE_DRIVER          | string   | postgres              |
| DATABASE\_URL            | string   | &lt;empty&gt;         |

### Port

Port gets the port number under which the site is being hosted.

Valid Values: Any valid port number.

## Database Support

Currently only PostgreSQL is supported.

## Credits

See [glide.yaml](glide.yaml) and [static/bower.json](static/bower.json)
