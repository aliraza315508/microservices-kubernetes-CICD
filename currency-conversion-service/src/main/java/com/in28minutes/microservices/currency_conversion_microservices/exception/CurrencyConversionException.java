package com.in28minutes.microservices.currency_conversion_microservices.exception;

public class CurrencyConversionException extends RuntimeException {

    public CurrencyConversionException(String message) {
        super(message);
    }

    public CurrencyConversionException(String message, Throwable cause) {
        super(message, cause);
    }
}