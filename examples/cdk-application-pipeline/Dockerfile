FROM public.ecr.aws/amazoncorretto/amazoncorretto:11-al2-jdk as build
USER nobody
WORKDIR /app
COPY target/fruit-api.jar /app
ENTRYPOINT ["java","-jar","/app/fruit-api.jar"]

FROM build AS vulnscan
USER root
COPY --from=aquasec/trivy:latest /usr/local/bin/trivy /usr/local/bin/trivy
RUN trivy filesystem --exit-code 1 --no-progress -s HIGH,CRITICAL /
USER nobody