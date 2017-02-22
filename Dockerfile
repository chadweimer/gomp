FROM golang:1.7.5-alpine
MAINTAINER ch@dweimer.com

ENV PORT 5000

COPY . $GOPATH/src/github.com/chadweimer/gomp
WORKDIR $GOPATH/src/github.com/chadweimer/gomp

ENV PATH $GOPATH/src/github.com/chadweimer/gomp/node_modules/.bin:$PATH

VOLUME /var/app/gomp/data

RUN echo '{ "allow_root": true }' > /root/.bowerrc \
  && apk add --no-cache --virtual .build-deps curl git nodejs \
  && curl "https://glide.sh/get" | sh \
  && glide install \
  && go build \
  && npm install --unsafe-perm
  && npm prune --unsafe-perm --production \
  && apk del .build-deps

EXPOSE 5000
ENTRYPOINT ["./gomp"]
