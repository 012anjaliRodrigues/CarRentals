# build stage
# FROM public.ecr.aws/x3p0u5t8/ryeldigital/node-22.7.0-alpine:latest as build

# Set working directory
# WORKDIR /app

# Copy package files
# COPY ./public/package*.json ./

# Install dependencies
# RUN npm install --legacy-peer-deps

# COPY ./public/ ./

# RUN npm run build

# CMD ["top"]

# production stage
FROM public.ecr.aws/x3p0u5t8/ryeldigital/nginx-stable:latest as production

 # COPY --from=build /app/dist /usr/share/nginx/html
COPY ./public/dist /usr/share/nginx/html
COPY ./config/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
