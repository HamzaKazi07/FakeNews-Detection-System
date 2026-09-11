package com.fakenewsdetector.dto;
import jakarta.validation.constraints.*;
public final class AuthDtos { private AuthDtos(){} public record Register(@NotBlank @Size(min=2,max=100) String name,@NotBlank @Email @Size(max=254)String email,@NotBlank @Size(min=8,max=128)String password){} public record Login(@NotBlank @Email String email,@NotBlank String password){} public record UserView(Long id,String name,String email,String role){} public record AuthView(String token,UserView user){} }
