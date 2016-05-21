#!/bin/bash
rm -f gomp gomp.tar.gz
go build -v
tar -czf gomp.tar.gz gomp LICENSE README.md db/ public/ templates/