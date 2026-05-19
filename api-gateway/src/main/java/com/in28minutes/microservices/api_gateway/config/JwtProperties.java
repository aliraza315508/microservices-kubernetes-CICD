package com.in28minutes.microservices.api_gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;

@Component
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {

    private String secret;
    private long expirationMinutes;
    private String username;
    private String password;




    public String getSecret() {
        return secret;
    }



    //sets the secret using VNB and VSL functions
    public void setSecret(String secret) {
        validateNotBlank(secret, "JWT_SECRET");
        validateSecretLength(secret);
        this.secret = secret;
    }


    //gets expiration time for jwt token
    public long getExpirationMinutes() {
        return expirationMinutes;
    }

    //validate expiration minutes and set them
    public void setExpirationMinutes(long expirationMinutes) {
        if (expirationMinutes <= 0) {
            throw new IllegalArgumentException("JWT_EXPIRATION_MINUTES must be greater than 0.");
        }

        this.expirationMinutes = expirationMinutes;
    }


    //expiration time is usually calculated in milliseconds.
    //property is easier to read as minutes:
    public long getExpirationMillis() {
        return expirationMinutes * 60 * 1000;
    }





    //login logic will compare the request username with this configured username.
    public String getUsername() {
        return username;
    }

    //validates and sets username
    public void setUsername(String username) {
        validateNotBlank(username, "JWT_USERNAME");
        this.username = username;
    }





    //logic will compare the request password with this configured password.
    public String getPassword() {
        return password;
    }

    //validates adn sets password
    public void setPassword(String password) {
        validateNotBlank(password, "JWT_PASSWORD");
        this.password = password;
    }






    //validate secret not empty
    private void validateNotBlank
    (String value, String environmentVariableName) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(environmentVariableName + " is null or empty");
        }

    }

    //validate secret length for string password
    private void validateSecretLength(String secret) {
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException("JWT_SECRET must be at least 32 bytes long for HS256 signing.");
        }
    }
}

//testing