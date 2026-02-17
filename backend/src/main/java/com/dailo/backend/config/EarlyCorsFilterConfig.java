package com.dailo.backend.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * EarlyCorsFilter를 Security보다 먼저 실행되도록 등록 (order = HIGHEST_PRECEDENCE).
 */
@Configuration
public class EarlyCorsFilterConfig {

    @Bean
    public FilterRegistrationBean<EarlyCorsFilter> earlyCorsFilterRegistration() {
        FilterRegistrationBean<EarlyCorsFilter> reg = new FilterRegistrationBean<>(new EarlyCorsFilter());
        reg.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return reg;
    }
}
