package com.fakenewsdetector.repository;
import com.fakenewsdetector.entity.User; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface UserRepository extends JpaRepository<User,Long>{ Optional<User> findByEmailIgnoreCase(String email); boolean existsByEmailIgnoreCase(String email); }
