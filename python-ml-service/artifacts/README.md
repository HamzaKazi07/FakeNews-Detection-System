# Local ML artifact staging

The trained model and TF-IDF vectorizer are intentionally not stored in Git.
Before building the ML service image, place the existing, approved artifacts here:

- `model.pkl`
- `vectorizer.pkl`

For a clean checkout, obtain these exact artifacts from the project owner or
approved artifact storage, then copy them into this directory. Do not retrain,
replace, or regenerate them as part of the build. The Docker build checks both
files and prints an actionable error if either is missing.

The `.pkl` files in this directory are ignored by Git.
