package com.fakenewsdetector.service;

import com.fakenewsdetector.client.MlServiceClient;
import com.fakenewsdetector.entity.PredictionHistory;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.repository.PredictionHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PredictionServiceTest {

    @Mock
    private MlServiceClient ml;

    @Mock
    private PredictionHistoryRepository history;

    @InjectMocks
    private PredictionService service;

    @Test
    void predictionPersistsMlResultForAuthenticatedUser() {
        User user = mock(User.class);
        MlServiceClient.MlResult result = new MlServiceClient.MlResult(
                "REAL", 0.91, java.util.List.of("report"), "1.0.0"
        );
        PredictionHistory saved = mock(PredictionHistory.class);
        when(ml.predict("article text")).thenReturn(result);
        when(history.save(any(PredictionHistory.class))).thenReturn(saved);
        when(saved.getId()).thenReturn(12L);
        when(saved.getPrediction()).thenReturn("REAL");
        when(saved.getConfidence()).thenReturn(BigDecimal.valueOf(0.91));
        when(saved.getModelVersion()).thenReturn("1.0.0");

        PredictionService.Response response = service.predict(user, "article text");

        ArgumentCaptor<PredictionHistory> captor = ArgumentCaptor.forClass(PredictionHistory.class);
        verify(history).save(captor.capture());
        assertThat(captor.getValue().getUser()).isSameAs(user);
        assertThat(captor.getValue().getNews()).isEqualTo("article text");
        assertThat(response.id()).isEqualTo(12L);
        assertThat(response.prediction()).isEqualTo("REAL");
        assertThat(response.modelVersion()).isEqualTo("1.0.0");
        assertThat(response.importantWords()).containsExactly("report");
    }

    @Test
    void mlFailureIsPropagatedAccordingToCurrentImplementation() {
        User user = mock(User.class);
        MlServiceClient.MlUnavailableException failure = new MlServiceClient.MlUnavailableException();
        when(ml.predict("article text")).thenThrow(failure);

        assertThatThrownBy(() -> service.predict(user, "article text"))
                .isSameAs(failure);
    }
}
