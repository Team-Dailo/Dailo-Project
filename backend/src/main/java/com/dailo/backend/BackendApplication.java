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
// bench edit-1
// bench edit-1
// bench edit-2
// bench edit-2
// bench edit-3
// bench edit-4
// bench edit-5
// bench edit-6
// bench edit-7
// bench edit-8
// bench on-1
// bench off-2
// bench off-3
// bench off-4
// bench off-5
// bench on-1
// bench on-1
