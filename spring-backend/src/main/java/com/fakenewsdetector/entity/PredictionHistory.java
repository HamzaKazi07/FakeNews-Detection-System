package com.fakenewsdetector.entity;
import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="prediction_history")
public class PredictionHistory {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") private User user;
 @Column(nullable=false,columnDefinition="TEXT") private String news;
 @Column(nullable=false,length=10) private String prediction;
 @Column(nullable=false) private double confidence;
 @Column(name="model_version",nullable=false,length=40) private String modelVersion;
 @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
 protected PredictionHistory(){} public PredictionHistory(User u,String n,String p,double c,String v){user=u;news=n;prediction=p;confidence=c;modelVersion=v;createdAt=Instant.now();}
 public Long getId(){return id;} public User getUser(){return user;} public String getNews(){return news;} public String getPrediction(){return prediction;} public double getConfidence(){return confidence;} public String getModelVersion(){return modelVersion;} public Instant getCreatedAt(){return createdAt;}
}
