package com.dailo.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@EnableCaching
@EnableAsync
@SpringBootApplication
@EnableScheduling
public class BackendApplication {

	public static void main(String[] args) {
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
		SpringApplication.run(BackendApplication.class, args);
	}

}
// bench on-1
// bench off-1
// bench off-1
// bench on-2
// bench off-2
// bench on-3
// bench off-3