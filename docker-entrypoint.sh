#!/bin/sh

set -e

# First migrate the DB
./gomp db migrate up

# Then run the application
./gomp serve
