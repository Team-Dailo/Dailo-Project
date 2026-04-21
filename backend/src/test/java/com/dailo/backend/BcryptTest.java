package com.dailo.backend;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class BcryptTest {
    @Test
    public void generateHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        // Test the admin hash
        String adminHash = "$2a$10$O3vUY0GiUs6fdCRji3iPYOoOOn.3ctCO3RPelRjG6r6J1L5riyvuW";
        System.out.println("Admin Hash matches 'admin123': " + encoder.matches("admin123", adminHash));

        // Generate new hash for admin123
        String newHash = encoder.encode("admin123");
        System.out.println("New Admin Hash: " + newHash);
        System.out.println("New Admin Hash verification: " + encoder.matches("admin123", newHash));
    }
}
