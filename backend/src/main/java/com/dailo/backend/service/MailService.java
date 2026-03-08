package com.dailo.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    // 발신자
    @Value("${app.mail.from:no-reply@dailoapp.com}")
    private String from;

    // 프론트 주소 (비밀번호 재설정 등에서 사용)
    @Value("${app.front-base-url:http://localhost:3000}")
    private String frontBaseUrl;


    /* ===========================
        1. 이메일 인증 메일 (6자리 숫자)
     =========================== */
    @Async
    public void sendVerifyEmail(String toEmail, String authCode) {

        SimpleMailMessage msg = new SimpleMailMessage();

        msg.setFrom(from);
        msg.setTo(toEmail);
        msg.setSubject("[Dailo] 회원가입 이메일 인증 번호 안내");

        msg.setText(
                """
                안녕하세요. Dailo에 가입해 주셔서 감사합니다.

                아래 6자리 인증번호를 회원가입 화면에 입력해 주세요.

                인증번호: [ %s ]

                (인증번호는 보안을 위해 5분 동안만 유효합니다.)

                감사합니다.
                """.formatted(authCode)
        );

        mailSender.send(msg);
    }


    /* ===========================
        2. 비밀번호 재설정 메일 (링크 클릭)
     =========================== */
    @Async
    public void sendResetPasswordEmail(String toEmail, String rawToken) {

        String link =
                frontBaseUrl +
                        "/reset-password?token=" +
                        rawToken;

        SimpleMailMessage msg = new SimpleMailMessage();

        msg.setFrom(from);
        msg.setTo(toEmail);
        msg.setSubject("[Dailo] 비밀번호 재설정 링크 안내");

        msg.setText(
                """
                비밀번호 재설정 요청이 접수되었습니다.

                아래 링크를 클릭하여 새로운 비밀번호로 변경해 주세요.

                %s

                (해당 링크는 보안을 위해 20분 동안만 유효합니다.)
                """.formatted(link)
        );

        mailSender.send(msg);
    }
}