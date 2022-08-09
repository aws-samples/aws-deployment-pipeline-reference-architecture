FROM public.ecr.aws/amazoncorretto/amazoncorretto:11-al2-jdk
WORKDIR /app
COPY target/fruit-api.jar /app
ENTRYPOINT ["java","-jar","/app/fruit-api.jar"]