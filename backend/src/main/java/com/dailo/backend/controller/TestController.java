package com.dailo.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/")
    public String home() {
        return "Dailo Backend Server is running! 🚀";
    }

    @GetMapping("/hello")
    public String hello() {
        return "Hello, Dailo Team! 안녕하세요 🎉";
    }
}

