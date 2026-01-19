# 1단계: 빌드 단계
FROM gradle:8.11.1-jdk17 AS builder

# 작업 디렉토리 설정
WORKDIR /app

# Gradle 파일 복사 (의존성 캐싱용)
COPY build.gradle settings.gradle gradlew ./
COPY gradle ./gradle

# 의존성 다운로드 (캐시 활용)
RUN ./gradlew dependencies --no-daemon

# 소스 코드 복사
COPY src ./src

# 빌드 (테스트 제외)
RUN ./gradlew clean build -x test --no-daemon

# 2단계: 실행 단계
FROM eclipse-temurin:17-jre-alpine

# 작업 디렉토리
WORKDIR /app

# 빌드된 JAR 파일 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# 포트 노출
EXPOSE 8080

# 환경변수 설정 (기본값)
ENV SPRING_PROFILES_ACTIVE=prod
ENV DB_PASSWORD=changeme

# 실행 명령
ENTRYPOINT ["java", "-jar", "app.jar"]

