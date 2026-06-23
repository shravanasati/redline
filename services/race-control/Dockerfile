# builder stage
FROM golang:1.26-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git

COPY shared/go.mod shared/go.sum ./shared/
COPY race-control/go.mod race-control/go.sum ./race-control/

RUN cd ./shared && go mod download

RUN cd ./race-control && go mod download

COPY shared/ ./shared/
COPY race-control/ ./race-control/

RUN go work init ./shared ./race-control

WORKDIR /app/race-control
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main .

# production stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates

WORKDIR /root/
COPY --from=builder /app/main .

CMD ["./main"]