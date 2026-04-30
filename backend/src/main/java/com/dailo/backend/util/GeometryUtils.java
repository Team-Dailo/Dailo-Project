package com.dailo.backend.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;

public class GeometryUtils {

    private static final double EARTH_RADIUS = 6371000;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * 두 좌표(위도, 경도) 사이의 거리를 계산합니다. (단위: 미터)
     */
    public static double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS * c;
    }

    /**
     * Ray casting 알고리즘으로 점이 다각형 안에 있는지 확인합니다.
     * zonePolygon JSON 형식: [{"lat": 36.99, "lng": 127.92}, ...]
     */
    public static boolean isPointInPolygon(double lat, double lng, String zonePolygonJson) {
        if (zonePolygonJson == null || zonePolygonJson.isBlank()) return false;
        try {
            List<Map<String, Double>> polygon = MAPPER.readValue(
                    zonePolygonJson, new TypeReference<List<Map<String, Double>>>() {}
            );
            if (polygon == null || polygon.size() < 3) return false;

            int n = polygon.size();
            boolean inside = false;
            int j = n - 1;
            for (int i = 0; i < n; i++) {
                double xi = polygon.get(i).get("lat");
                double yi = polygon.get(i).get("lng");
                double xj = polygon.get(j).get("lat");
                double yj = polygon.get(j).get("lng");

                boolean intersect = ((yi > lng) != (yj > lng))
                        && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
                j = i;
            }
            return inside;
        } catch (Exception e) {
            return false;
        }
    }
}
