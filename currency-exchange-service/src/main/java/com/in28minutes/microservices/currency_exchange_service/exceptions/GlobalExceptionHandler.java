package com.in28minutes.microservices.currency_exchange_service.exceptions;

import com.in28minutes.microservices.currency_exchange_service.entity.CurrencyExchange;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler{

    public ResponseEntity<ApiErrorResponse>
    handleCurrencyExchangeNotFoundException
            (
                    CurrencyExchangeNotFoundException exception ,
                    HttpServletRequest request
            ) {
         ApiErrorResponse response = new ApiErrorResponse(
                 LocalDateTime.now(),
                 HttpStatus.NOT_FOUND.value(),
                 HttpStatus.NOT_FOUND.getReasonPhrase(),
                 exception.getMessage(),
                 request.getRequestURI()

         );

         return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }


    public  ResponseEntity<ApiErrorResponse>
    handleGenericException (Exception exception ,
                            HttpServletRequest request) {

        ApiErrorResponse response = new ApiErrorResponse(

                LocalDateTime.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                "Something went wrong. Please try again later.",
                request.getRequestURI()
        ) ;

        return ResponseEntity.status
                (HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
