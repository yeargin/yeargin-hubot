FROM node:16
MAINTAINER Stephen Yeargin <stephen@yearg.in>

# Install required packages
RUN apt-get update && \
   apt-get install -y libfuzzy-dev libicu-dev redis-server && \
   rm -rf /var/lib/apt/lists/*

# Move files into place
WORKDIR /opt/hubot
COPY . ./

# Create a hubot user
RUN useradd -ms /bin/bash hubot
RUN chown -fR hubot /opt/hubot
USER hubot

# Install dependencies
RUN npm install

# Default adapter and name
ENV HUBOT_ADAPTER slack
ENV HUBOT_NAME hubot

EXPOSE 8080

ENTRYPOINT ["/bin/sh", "-c", "bin/hubot --name $HUBOT_NAME --adapter $HUBOT_ADAPTER --alias '!'"]
