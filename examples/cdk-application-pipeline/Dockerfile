FROM public.ecr.aws/amazoncorretto/amazoncorretto:17-al2022-jdk as build
USER nobody
WORKDIR /app
COPY target/fruit-api.jar /app
ENTRYPOINT ["java","-jar","/app/fruit-api.jar"]

# Use multi-stage builds to scan newly created image with Trivy. This second stage 'vulnscan'
# isn't published to Amazon ECR and is never run. It is only used to run the Trivy scan
# against the newly created image in the 'build' stage.
#
# This stage must run as root so Trivy can scan all files in the image, not just
# those accessible by the nobody user. The user is switched back to 'nobody' at
# the end to ensure that even if this image is used for something it is done
# without the 'root' user.

FROM build AS vulnscan
USER root
COPY --from=aquasec/trivy:latest /usr/local/bin/trivy /usr/local/bin/trivy
RUN trivy filesystem --exit-code 1 --no-progress --ignore-unfixed -s HIGH,CRITICAL /
USER nobody