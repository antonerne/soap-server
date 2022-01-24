FROM node:17-alpine3.14

# create app directory
WORKDIR /usr/src/app

#install app dependencies
COPY package*.json ./

RUN npm install

# building for production (uncomment)
#RUN npm ci --only=production

# bundle the app source
COPY . .

EXPOSE 6000
CMD [ "node", "server.js"]