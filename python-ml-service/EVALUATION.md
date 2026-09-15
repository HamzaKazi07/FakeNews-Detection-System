# Model Evaluation Protocol

The current `model.pkl` and `vectorizer.pkl` are preserved. No independently verified evaluation score is associated with this artifact pair.

## External evaluation

Evaluate the existing artifacts without fitting either object:

1. Obtain a newly labeled dataset from a different source or later time period.
2. Require both `FAKE` and `REAL` examples with reliable labels.
3. Remove exact and near-duplicate articles that overlap the training sources.
4. Apply `app.preprocessing.preprocess_text` to the same title-plus-body text used by training.
5. Call `vectorizer.transform(...)`, then `model.predict(...)` and `model.predict_proba(...)`.
6. Report accuracy, precision, recall, F1, and a confusion matrix.

The repository contains no independent held-out dataset. `dataset/fake_news.csv` is the same labeled source data as `Fake.csv` plus `True.csv`, so it is not suitable for external evaluation.

## Future retraining

Use `app.training.create_vectorizer`, `app.training.prepare_article_text`, and the label contract `0 = FAKE`, `1 = REAL`. Split data before fitting the vectorizer. Keep the test set untouched until final reporting; use only the training and validation partitions for model selection, then optionally refit on train plus validation. Save the metrics and evaluation dataset identity with the model version.