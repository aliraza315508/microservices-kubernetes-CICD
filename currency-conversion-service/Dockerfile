FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /app

COPY pom.xml .

RUN mvn dependency:go-offline

COPY src ./src

RUN mvn clean package -DskipTests

FROM eclipse-temurin:17.0.12_7-jre-jammy
WORKDIR /app

RUN groupadd --gid 10001 appgroup \
    && useradd --uid 10001 --gid 10001 --home-dir /app --shell /usr/sbin/nologin appuser

COPY --from=builder --chown=10001:10001 /app/target/*.jar app.jar

USER 10001:10001

EXPOSE 8100

ENTRYPOINT ["java","-XX:MaxRAMPercentage=75.0","-XX:InitialRAMPercentage=50.0","-jar","app.jar"]