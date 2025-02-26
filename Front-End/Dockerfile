FROM node:hydrogen-alpine

WORKDIR /app

COPY package*.json ./
COPY public ./public
COPY index.html ./
COPY .serve.json ./

RUN npm install --only=production

RUN npm install -g serve

EXPOSE 3000

CMD ["npm", "start"]
