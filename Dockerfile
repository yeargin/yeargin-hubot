FROM node:20-bullseye

# Set non-interactive mode for apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Install required packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends libfuzzy-dev libicu-dev redis-server && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

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

ENTRYPOINT ["/bin/sh", "-c", "npm run start"]
