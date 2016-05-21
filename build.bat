@echo off
del /q gomp.exe gomp.zip
go build -v
7z a gomp.zip gomp.exe LICENSE README.md db/ public/ templates/