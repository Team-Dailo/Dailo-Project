package com.dailo.backend.service;

import com.dailo.backend.domain.enums.MemberStatus;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final MemberRepository memberRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return memberRepository.findByEmail(email)
                .map(this::createUserDetails)
                .orElseThrow(() -> new UsernameNotFoundException(email + " -> 데이터베이스에서 찾을 수 없습니다."));
    }

    private UserDetails createUserDetails(Member member) {
        String roleName = member.getRole() != null ? member.getRole().name() : "USER";
        GrantedAuthority grantedAuthority = new SimpleGrantedAuthority("ROLE_" + roleName);
        boolean enabled = !member.isSuspended() && member.getStatus() != MemberStatus.DELETED;

        return new User(
                member.getEmail(),
                member.getPassword(),
                enabled,
                true,
                true,
                true,
                Collections.singleton(grantedAuthority)
        );
    }
}