package com.in28minutes.microservices.api_gateway;

import com.in28minutes.microservices.api_gateway.dto.LoginRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
@TestPropertySource(properties = {
		"jwt.secret=test-secret-key-test-secret-key-test-secret-key",
		"jwt.expiration-minutes=60",
		"jwt.username=admin",
		"jwt.password=admin123",
		"eureka.client.enabled=false",
		"spring.cloud.discovery.enabled=false",
		"management.tracing.enabled=false"
})
class ApiGatewayApplicationTests {

	@Autowired
	private WebTestClient webTestClient;

	@Test
	void contextLoads() {
	}

	@Test
	void loginShouldReturnTokenWhenCredentialsAreValid() {
		LoginRequest request = new LoginRequest("admin", "admin123");

		webTestClient.post()
				.uri("/auth/login")
				.bodyValue(request)
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.token").exists();
	}

	@Test
	void loginShouldReturnUnauthorizedWhenCredentialsAreInvalid() {
		LoginRequest request = new LoginRequest("admin", "wrong-password");

		webTestClient.post()
				.uri("/auth/login")
				.bodyValue(request)
				.exchange()
				.expectStatus().isUnauthorized()
				.expectBody()
				.jsonPath("$.status").isEqualTo(401)
				.jsonPath("$.message").isEqualTo("Invalid username or password")
				.jsonPath("$.path").isEqualTo("/auth/login");
	}

	@Test
	void loginShouldReturnBadRequestWhenUsernameIsMissing() {
		LoginRequest request = new LoginRequest("", "admin123");

		webTestClient.post()
				.uri("/auth/login")
				.bodyValue(request)
				.exchange()
				.expectStatus().isBadRequest()
				.expectBody()
				.jsonPath("$.status").isEqualTo(400)
				.jsonPath("$.message").value(message ->
						message.toString().contains("Username is required")
				);
	}

	@Test
	void protectedRouteShouldReturnUnauthorizedWithoutToken() {
		webTestClient.get()
				.uri("/currency-exchange/from/USD/to/PKR")
				.exchange()
				.expectStatus().isUnauthorized();
	}
}