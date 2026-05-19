package com.in28minutes.microservices.currency_conversion_microservices.controller;

import com.in28minutes.microservices.currency_conversion_microservices.entity.CurrencyConversion;
import com.in28minutes.microservices.currency_conversion_microservices.exception.CurrencyConversionException;
import com.in28minutes.microservices.currency_conversion_microservices.proxy.CurrencyExchangeProxy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;

@Validated
@RestController
public class CurrencyConversionController {

    @Autowired
    private CurrencyExchangeProxy proxy;

    @Value("${currency-exchange-service.url}")
    private String currencyExchangeServiceUrl;

    @GetMapping("/currency-conversion/from/{from}/to/{to}/quantity/{quantity}")
    public CurrencyConversion calculateCurrencyConversion(
            @PathVariable
            @NotBlank(message = "From currency is required") String from,

            @PathVariable
            @NotBlank(message = "To currency is required") String to,

            @PathVariable
            @Positive(message = "Quantity must be greater than zero") BigDecimal quantity
    ) {

        HashMap<String, String> uriVariables = new HashMap<>();
        uriVariables.put("from", from);
        uriVariables.put("to", to);

        ResponseEntity<CurrencyConversion> responseEntity;

        try {
            responseEntity = new RestTemplate().getForEntity(
                    currencyExchangeServiceUrl + "/currency-exchange/from/{from}/to/{to}",
                    CurrencyConversion.class,
                    uriVariables
            );
        } catch (Exception exception) {
            throw new CurrencyConversionException(
                    "Currency conversion failed because currency-exchange-service is unavailable",
                    exception
            );
        }

        CurrencyConversion currencyConversion = responseEntity.getBody();

        if (currencyConversion == null) {
            throw new CurrencyConversionException(
                    "Currency conversion failed because exchange rate response was empty for " + from + " to " + to
            );
        }

        return new CurrencyConversion(
                currencyConversion.getId(),
                from,
                to,
                quantity,
                currencyConversion.getConversionMultiple(),
                quantity.multiply(currencyConversion.getConversionMultiple()),
                currencyConversion.getEnvironment() + " Rest Template"
        );

    }

    @GetMapping("/currency-conversion-feign/from/{from}/to/{to}/quantity/{quantity}")
    public CurrencyConversion calculateCurrencyConversionFeign(
            @PathVariable
            @NotBlank(message = "From currency is required") String from,

            @PathVariable
            @NotBlank(message = "To currency is required") String to,

            @PathVariable
            @Positive(message = "Quantity must be greater than zero") BigDecimal quantity
    ) {

        CurrencyConversion currencyConversion;

        try {
            currencyConversion = proxy.retrieveExchangeValue(from, to);
        } catch (Exception exception) {
            throw new CurrencyConversionException(
                    "Currency conversion failed because currency-exchange-service is unavailable",
                    exception
            );
        }

        if (currencyConversion == null) {
            throw new CurrencyConversionException(
                    "Currency conversion failed because exchange rate response was empty for " + from + " to " + to
            );
        }

        return new CurrencyConversion(
                currencyConversion.getId(),
                from,
                to,
                quantity,
                currencyConversion.getConversionMultiple(),
                quantity.multiply(currencyConversion.getConversionMultiple()),
                currencyConversion.getEnvironment() + " Feign"
        );

    }
}

//testing