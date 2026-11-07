FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/prague-pong.db
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
# Admin scripts (STIS import, backup) run with tsx inside the container
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/lib ./src/lib
EXPOSE 3000
CMD ["node", "build"]
