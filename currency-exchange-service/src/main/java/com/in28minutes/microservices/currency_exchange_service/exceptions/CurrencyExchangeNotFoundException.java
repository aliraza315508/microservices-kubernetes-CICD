package com.in28minutes.microservices.currency_exchange_service.exceptions ;


public class CurrencyExchangeNotFoundException extends RuntimeException {

    public CurrencyExchangeNotFoundException(String from , String to) {
        super("Currency exchange rate not found for " + from + " to " + to);
    }

}