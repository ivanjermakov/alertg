from alpine:latest

run apk add nodejs npm

copy src /src
copy package.json /
copy tsconfig.json /

run npm install

entrypoint npx bun src/index.ts

