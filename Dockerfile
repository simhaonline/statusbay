##########################################
# Build golang container
##########################################
FROM golang:1.13.4-alpine AS go-builder

# Install OS level dependencies
RUN apk add --update alpine-sdk git && \
	git config --global http.https://gopkg.in.followRedirects true 

# Set workdir for the rest of the commands
WORKDIR /app

# Now add project files
COPY . .

# Build a binary
RUN go install -v ./...

##########################################
# Runtime container
##########################################
FROM alpine:3.8
COPY --from=go-builder /go/bin/statusbay /bin/statusbay

RUN mkdir -p /etc/statusbay/
COPY events.yaml /etc/statusbay/
EXPOSE 8080
ENTRYPOINT ["/bin/statusbay"]