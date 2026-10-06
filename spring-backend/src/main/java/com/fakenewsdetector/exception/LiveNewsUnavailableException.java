package com.fakenewsdetector.exception;

public class LiveNewsUnavailableException extends RuntimeException {

    public LiveNewsUnavailableException() {
        super("The configured live news feed is temporarily unavailable.");
    }
}
