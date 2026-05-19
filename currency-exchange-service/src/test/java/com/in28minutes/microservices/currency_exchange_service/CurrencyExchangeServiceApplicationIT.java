package com.in28minutes.microservices.currency_exchange_service;

import com.in28minutes.microservices.currency_exchange_service.entity.CurrencyExchange;
import com.in28minutes.microservices.currency_exchange_service.repository.CurrencyExchangeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class CurrencyExchangeServiceApplicationIT {

	@Container
	static PostgreSQLContainer<?> postgres =
			new PostgreSQLContainer<>("postgres:16-alpine")
					.withDatabaseName("currencydb")
					.withUsername("test")
					.withPassword("test");

	@DynamicPropertySource
	static void configureProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", postgres::getJdbcUrl);
		registry.add("spring.datasource.username", postgres::getUsername);
		registry.add("spring.datasource.password", postgres::getPassword);
	}

	@Autowired
	private CurrencyExchangeRepository currencyExchangeRepository;

	@Test
	void contextLoads() {
	}

	@Test
	void findByFromAndToShouldReturnCurrencyExchangeFromFlywaySeedData() {
		CurrencyExchange currencyExchange =
				currencyExchangeRepository.findByFromAndTo("USD", "INR");

		assertThat(currencyExchange).isNotNull();
		assertThat(currencyExchange.getId()).isEqualTo(10001L);
		assertThat(currencyExchange.getFrom()).isEqualTo("USD");
		assertThat(currencyExchange.getTo()).isEqualTo("INR");
		assertThat(currencyExchange.getConversionMultiple()).isEqualByComparingTo("65.00");
	}

	@Test
	void findByFromAndToShouldReturnNullWhenExchangeRateDoesNotExist() {
		CurrencyExchange currencyExchange =
				currencyExchangeRepository.findByFromAndTo("USD", "ABC");

		assertThat(currencyExchange).isNull();
	}
}