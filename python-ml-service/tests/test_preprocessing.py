from app.preprocessing import preprocess_text


def test_preprocessing_removes_url_html_and_stopwords():
    assert preprocess_text("The <b>CATS</b> are running at https://example.com") == "cat running"
