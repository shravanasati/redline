# builder stage
FROM golang:1.26-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git

COPY shared/go.mod shared/go.sum ./shared/
COPY grid-worker/go.mod grid-worker/go.sum ./grid-worker/

RUN cd ./shared && go mod download

RUN cd ./grid-worker && go mod download

COPY shared/ ./shared/
COPY grid-worker/ ./grid-worker/

RUN go work init ./shared ./grid-worker

WORKDIR /app/grid-worker
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main .

# production stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates

WORKDIR /root/
COPY --from=builder /app/main .

CMD ["./main"]