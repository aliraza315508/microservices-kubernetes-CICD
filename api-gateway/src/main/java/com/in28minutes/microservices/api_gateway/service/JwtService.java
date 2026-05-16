package com.in28minutes.microservices.api_gateway.service;

import com.in28minutes.microservices.api_gateway.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final JwtProperties jwtProperties;


    //we will use jwt properties for generation token
    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }



    //verifies the token and send required information from the token
    private Claims extractAllClaims(String token) {

        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    //gets username from the token payload
    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    //check if toke is not expired
    private boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }


    //checks if token satisfies the validation
    public boolean isTokenValid(String token, String username) {
        String tokenUsername = extractUsername(token);

        return tokenUsername.equals(username) && !isTokenExpired(token);
    }

    //generates the token
    public String generateToken(String username) {
        Date issuedAt = new Date();
        Date expiration = new
                Date(issuedAt.getTime() + jwtProperties.getExpirationMillis());

        return Jwts.builder()
                .subject(username)
                .issuedAt(issuedAt)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }




    //generates the secretkey you will use for signing the token
    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);

        return Keys.hmacShaKeyFor(keyBytes);
    }
}