package com.in28minutes.microservices.currency_conversion_microservices;

import com.in28minutes.microservices.currency_conversion_microservices.entity.CurrencyConversion;
import com.in28minutes.microservices.currency_conversion_microservices.proxy.CurrencyExchangeProxy;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
		"eureka.client.enabled=false",
		"eureka.client.register-with-eureka=false",
		"eureka.client.fetch-registry=false",
		"spring.cloud.discovery.enabled=false",
		"management.tracing.enabled=false"
})
class CurrencyConversionMicroservicesApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private CurrencyExchangeProxy currencyExchangeProxy;

	@Test
	void contextLoads() {
	}

	@Test
	void feignCurrencyConversionShouldCalculateTotalAmount() throws Exception {
		CurrencyConversion exchangeResponse = new CurrencyConversion(
				10001L,
				"USD",
				"INR",
				BigDecimal.ZERO,
				BigDecimal.valueOf(65),
				BigDecimal.ZERO,
				"test-environment"
		);

		when(currencyExchangeProxy.retrieveExchangeValue(eq("USD"), eq("INR")))
				.thenReturn(exchangeResponse);

		mockMvc.perform(get("/currency-conversion-feign/from/USD/to/INR/quantity/10"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(10001))
				.andExpect(jsonPath("$.from").value("USD"))
				.andExpect(jsonPath("$.to").value("INR"))
				.andExpect(jsonPath("$.quantity").value(10))
				.andExpect(jsonPath("$.conversionMultiple").value(65))
				.andExpect(jsonPath("$.totalCalculatedAmount").value(650))
				.andExpect(jsonPath("$.environment").value("test-environment Feign"));
	}

	@Test
	void feignCurrencyConversionShouldReturnBadRequestWhenQuantityIsInvalid() throws Exception {
		mockMvc.perform(get("/currency-conversion-feign/from/USD/to/INR/quantity/-1"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value(containsString("Quantity must be greater than zero")))
				.andExpect(jsonPath("$.path").value("/currency-conversion-feign/from/USD/to/INR/quantity/-1"));
	}

	@Test
	void feignCurrencyConversionShouldReturnBadGatewayWhenExchangeServiceFails() throws Exception {
		when(currencyExchangeProxy.retrieveExchangeValue(eq("USD"), eq("INR")))
				.thenThrow(new RuntimeException("Exchange service unavailable"));

		mockMvc.perform(get("/currency-conversion-feign/from/USD/to/INR/quantity/10"))
				.andExpect(status().isBadGateway())
				.andExpect(jsonPath("$.status").value(502))
				.andExpect(jsonPath("$.message").value(
						"Currency conversion failed because currency-exchange-service is unavailable"
				))
				.andExpect(jsonPath("$.path").value("/currency-conversion-feign/from/USD/to/INR/quantity/10"));
	}
}