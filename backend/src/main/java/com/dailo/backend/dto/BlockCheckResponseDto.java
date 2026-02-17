package com.dailo.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlockCheckResponseDto {

    private boolean blocked;
    private String direction;  // I_BLOCKED, THEY_BLOCKED, MUTUAL, NONE

    public static BlockCheckResponseDto of(boolean iBlocked, boolean theyBlocked) {
        String direction;
        boolean blocked;

        if (iBlocked && theyBlocked) {
            direction = "MUTUAL";
            blocked = true;
        } else if (iBlocked) {
            direction = "I_BLOCKED";
            blocked = true;
        } else if (theyBlocked) {
            direction = "THEY_BLOCKED";
            blocked = true;
        } else {
            direction = "NONE";
            blocked = false;
        }

        return BlockCheckResponseDto.builder()
                .blocked(blocked)
                .direction(direction)
                .build();
    }
}
