package com.fakenewsdetector.security;
import com.fakenewsdetector.entity.User; import io.jsonwebtoken.*; import io.jsonwebtoken.security.Keys; import java.nio.charset.StandardCharsets; import java.time.*; import java.util.*; import javax.crypto.SecretKey; import org.springframework.beans.factory.annotation.Value; import org.springframework.stereotype.Service;
@Service public class JwtService {
 private final SecretKey key; private final Duration expiration;
 public JwtService(@Value("${app.jwt-secret}") String secret,@Value("${app.jwt-expiration:PT7D}") Duration expires){if(secret.length()<32)throw new IllegalStateException("JWT_SECRET must be at least 32 characters");key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));expiration=expires;}
 public String issue(User u){Instant now=Instant.now();return Jwts.builder().subject(String.valueOf(u.getId())).claim("email",u.getEmail()).claim("role",u.getRole().name()).issuedAt(Date.from(now)).expiration(Date.from(now.plus(expiration))).signWith(key).compact();}
 public Claims parse(String token){return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();}
}
