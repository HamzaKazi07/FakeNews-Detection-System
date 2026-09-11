package com.fakenewsdetector.entity;
import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="feedback")
public class Feedback {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="history_id",unique=true) private PredictionHistory history;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") private User user;
 @Column(nullable=false,length=3) private String value; @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
 protected Feedback(){} public Feedback(PredictionHistory h,User u,String v){history=h;user=u;value=v;createdAt=Instant.now();} public void setValue(String v){value=v;} public String getValue(){return value;}
}
