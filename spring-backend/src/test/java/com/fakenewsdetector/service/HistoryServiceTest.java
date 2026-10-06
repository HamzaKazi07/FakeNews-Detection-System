package com.fakenewsdetector.service;

import com.fakenewsdetector.entity.PredictionHistory;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.repository.FeedbackRepository;
import com.fakenewsdetector.repository.PredictionHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HistoryServiceTest {

    @Mock
    private PredictionHistoryRepository repository;

    @Mock
    private FeedbackRepository feedbackRepository;

    @InjectMocks
    private HistoryService service;

    @Test
    void findForUserUsesUserScopedSortedPageAndMapsCreatedAtToDate() {
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        PredictionHistory history = mock(PredictionHistory.class);
        Instant createdAt = Instant.parse("2026-09-20T12:00:00Z");
        when(history.getId()).thenReturn(12L);
        when(history.getNews()).thenReturn("Article text");
        when(history.getPrediction()).thenReturn("REAL");
        when(history.getConfidence()).thenReturn(BigDecimal.valueOf(0.91));
        when(history.getModelVersion()).thenReturn("1.0.0");
        when(history.getCreatedAt()).thenReturn(createdAt);
        List<PredictionHistory> pageItems = new ArrayList<>();
        pageItems.add(history);
        for (int i = 0; i < 4; i++) {
            PredictionHistory additionalHistory = mock(PredictionHistory.class);
            when(additionalHistory.getId()).thenReturn(13L + i);
            pageItems.add(additionalHistory);
        }
        when(repository.findByUserId(eq(7L), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(new PageImpl<>(pageItems, PageRequest.of(2, 10), 25));
        FeedbackRepository.HistoryFeedbackProjection feedback =
                mock(FeedbackRepository.HistoryFeedbackProjection.class);
        when(feedback.getHistoryId()).thenReturn(12L);
        when(feedback.getValue()).thenReturn("yes");
        when(feedbackRepository.findHistoryFeedbackByHistoryIds(
                List.of(12L, 13L, 14L, 15L, 16L)
        ))
                .thenReturn(List.of(feedback));

        HistoryService.HistoryPage result = service.findForUser(user, 2, 10);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findByUserId(eq(7L), pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        assertThat(pageable.getPageNumber()).isEqualTo(2);
        assertThat(pageable.getPageSize()).isEqualTo(10);
        Sort.Order order = pageable.getSort().getOrderFor("createdAt");
        assertThat(order).isNotNull();
        assertThat(order.isDescending()).isTrue();
        assertThat(result.page()).isEqualTo(2);
        assertThat(result.size()).isEqualTo(10);
        assertThat(result.totalPages()).isEqualTo(3);
        assertThat(result.totalElements()).isEqualTo(25);
        assertThat(result.history()).hasSize(5);
        assertThat(result.history().get(0)).satisfies(item -> {
            assertThat(item.id()).isEqualTo(12L);
            assertThat(item.date()).isEqualTo(createdAt);
            assertThat(item.feedback()).isEqualTo("yes");
        });
    }

    @Test
    void findForUserReturnsNullFeedbackWhenHistoryHasNotBeenRated() {
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        PredictionHistory history = mock(PredictionHistory.class);
        when(history.getId()).thenReturn(12L);
        when(repository.findByUserId(eq(7L), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(history)));
        when(feedbackRepository.findHistoryFeedbackByHistoryIds(List.of(12L))).thenReturn(List.of());

        HistoryService.HistoryPage result = service.findForUser(user, 0, 20);

        assertThat(result.history()).singleElement()
                .satisfies(item -> assertThat(item.feedback()).isNull());
    }

    @Test
    void findForUserUsesDefaultAndMaximumPageSizes() {
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(repository.findByUserId(eq(7L), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service.findForUser(user, -1, 0);
        service.findForUser(user, 0, 250);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository, org.mockito.Mockito.times(2)).findByUserId(eq(7L), pageableCaptor.capture());
        assertThat(pageableCaptor.getAllValues().get(0).getPageNumber()).isZero();
        assertThat(pageableCaptor.getAllValues().get(0).getPageSize()).isEqualTo(20);
        assertThat(pageableCaptor.getAllValues().get(1).getPageSize()).isEqualTo(100);
    }
}
