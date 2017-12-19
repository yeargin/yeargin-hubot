FROM node:alpine

MAINTAINER Stephen Yeargin <stephen@yearg.in>

# Install global NPM packages
RUN npm install --global coffeescript yo generator-hubot

# Create hubot user
RUN adduser -h /hubot -s /bin/bash -S hubot
USER  hubot
WORKDIR /hubot

# Install hubot
RUN yo hubot --owner="" --name="hubot" --description="" --defaults
COPY package.json package.json
RUN npm install
COPY external-scripts.json /hubot/

# And go
ENTRYPOINT ["/bin/sh", "-c", "bin/hubot --adapter slack --alias '!'"]
