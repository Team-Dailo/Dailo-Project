package com.dailo.backend.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordVerifier {
    public static void main(String[] args) {
        if (args.length < 2) {
            System.out.println("Usage: PasswordVerifier <password> <hash>");
            return;
        }
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        boolean matches = encoder.matches(args[0], args[1]);
        System.out.println("Matches: " + matches);
    }
}
