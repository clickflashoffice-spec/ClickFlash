FROM alpine:3.20 AS builder
RUN apk add --no-cache cmake g++ make openssl-dev sqlite-dev
WORKDIR /build
COPY . .
RUN cmake -B build -S . && cmake --build build

FROM alpine:3.20
RUN apk add --no-cache libstdc++ openssl sqlite-libs
COPY --from=builder /build/build/clickflash-master-cpp /usr/local/bin/
EXPOSE 8090
ENTRYPOINT ["clickflash-master-cpp"]
CMD ["--port=8090", "--db=/data/master.db"]
