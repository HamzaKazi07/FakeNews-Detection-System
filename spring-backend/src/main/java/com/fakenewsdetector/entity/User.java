package com.fakenewsdetector.entity;
import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="users")
public class User {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,length=100) private String name;
 @Column(nullable=false,unique=true,length=254) private String email;
 @Column(name="password_hash",nullable=false,length=100) private String passwordHash;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Role role;
 @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
 protected User() {} public User(String n,String e,String p,Role r){name=n;email=e;passwordHash=p;role=r;createdAt=Instant.now();}
 public Long getId(){return id;} public String getName(){return name;} public String getEmail(){return email;} public String getPasswordHash(){return passwordHash;} public Role getRole(){return role;}
}
