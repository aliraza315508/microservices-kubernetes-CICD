package com.in28minutes.microservices.api_gateway.exception;

public class InvalidLoginException extends RuntimeException {

    public InvalidLoginException() {
        super("Invalid username or password");
    }
}
