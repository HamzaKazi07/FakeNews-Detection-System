import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import CheckNews from '../components/CheckNews';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../api/client', () => ({
  getApiErrorMessage: (_error, fallback) => fallback,
  unwrapApiData: (response) => response.data?.data ?? response.data,
}));

const articleUrl = 'https://www.bbc.co.uk/news/articles/example';

describe('CheckNews analysis modes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    axios.get.mockResolvedValue({
      data: {
        source: 'BBC News RSS Feed',
        news: [{
          title: 'BBC headline',
          description: 'A short article summary.',
          link: articleUrl,
          prediction: null,
          confidence: null,
        }],
      },
    });
  });

  it('shows feed details without an automatic classification and analyzes by the existing URL workflow', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 12,
          prediction: 'FAKE',
          confidence: 0.8957,
          importantWords: ['headline'],
          scraped_text: 'Article text returned by the existing URL workflow.',
          source_url: articleUrl,
        },
      },
    });

    render(<CheckNews backendUrl="http://localhost:8080" user={{ id: 1 }} />);

    expect(await screen.findByRole('heading', { name: 'BBC headline' })).toBeInTheDocument();
    expect(screen.getByText('BBC News RSS Feed')).toBeInTheDocument();
    expect(screen.getByText('A short article summary.')).toBeInTheDocument();
    expect(screen.queryByText(/FAKE MODEL SIGNAL/i)).not.toBeInTheDocument();
    expect(screen.queryByText('FAKE', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read full article ↗' })).toHaveAttribute('href', articleUrl);

    await user.click(screen.getByRole('button', { name: 'Analyze article →' }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8080/api/predict-url',
        { url: articleUrl },
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        }),
      );
    });

    expect(await screen.findByRole('heading', { name: 'AI model assessment' })).toBeInTheDocument();
    expect(screen.getByText('FAKE', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('89.57%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: articleUrl })).toHaveAttribute('href', articleUrl);
    expect(screen.getByText('View extracted article')).toBeInTheDocument();
    expect(screen.getByText(
      'This is an AI model prediction, not a factual determination. Verify important claims using reliable sources.',
    )).toBeInTheDocument();
  });

  it('clears a prior result when switching modes and formats fractional confidence', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 15,
          prediction: 'REAL',
          confidence: 0.9157,
          importantWords: ['report'],
        },
      },
    });

    render(<CheckNews backendUrl="http://localhost:8080" user={{ id: 1 }} />);
    await screen.findByRole('heading', { name: 'BBC headline' });
    await user.type(screen.getByRole('textbox', { name: 'News article text' }), 'A sufficiently detailed news article for analysis.');
    await user.click(screen.getByRole('button', { name: /Analyze News/ }));

    expect(await screen.findByRole('heading', { name: 'AI model assessment' })).toBeInTheDocument();
    expect(screen.getByText('91.57%')).toBeInTheDocument();
    expect(screen.getByText('report')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '👍 Yes' }));
    expect(axios.post).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8080/api/feedback',
      { entry_id: 15, feedback: 'yes' },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );

    await user.click(screen.getByRole('tab', { name: 'URL' }));
    expect(screen.queryByRole('heading', { name: 'AI model assessment' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example-news-site.com/article')).toHaveValue('');

    await user.click(screen.getByRole('tab', { name: 'Voice' }));
    expect(screen.queryByRole('heading', { name: 'AI model assessment' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Voice transcript' })).toHaveValue('');
    await user.click(screen.getByRole('tab', { name: 'Text' }));
    expect(screen.queryByRole('heading', { name: 'AI model assessment' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'News article text' })).toHaveValue('A sufficiently detailed news article for analysis.');
  });

  it('passes the URL through the existing endpoint and unwraps its response envelope', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 18,
          prediction: 'REAL',
          confidence: 1,
          importantWords: [],
          source_url: articleUrl,
          scraped_text: 'The extracted article text is sufficiently long for display.',
        },
      },
    });

    render(<CheckNews backendUrl="http://localhost:8080" user={{ id: 1 }} />);
    await screen.findByRole('heading', { name: 'BBC headline' });
    await user.click(screen.getByRole('tab', { name: 'URL' }));
    await user.type(screen.getByPlaceholderText('https://example-news-site.com/article'), articleUrl);
    await user.click(screen.getByRole('button', { name: 'Scrape & Verify' }));

    expect(await screen.findByRole('heading', { name: 'AI model assessment' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: articleUrl })).toHaveAttribute('href', articleUrl);
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/predict-url',
      { url: articleUrl },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('analyzes an editable voice transcript through the existing text endpoint', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: { id: 20, prediction: 'REAL', confidence: 0.5, importantWords: [] },
      },
    });

    render(<CheckNews backendUrl="http://localhost:8080" user={{ id: 1 }} />);
    await screen.findByRole('heading', { name: 'BBC headline' });
    await user.click(screen.getByRole('tab', { name: 'Voice' }));
    await user.type(screen.getByRole('textbox', { name: 'Voice transcript' }), 'Reviewed speech transcript for news analysis.');
    await user.click(screen.getByRole('button', { name: 'Analyze transcript' }));

    expect(await screen.findByRole('heading', { name: 'AI model assessment' })).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/predict',
      { text: 'Reviewed speech transcript for news analysis.' },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('records browser speech into the editable transcript and reports recognition errors', async () => {
    const user = userEvent.setup();
    let recognition;
    class MockSpeechRecognition {
      start = vi.fn();
      stop = vi.fn();
      onstart = null;
      onresult = null;
      onerror = null;
      onend = null;
    }
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: class extends MockSpeechRecognition {
        constructor() {
          super();
          recognition = this;
        }
      },
    });

    render(<CheckNews backendUrl="http://localhost:8080" user={{ id: 1 }} />);
    await screen.findByRole('heading', { name: 'BBC headline' });
    await user.click(screen.getByRole('tab', { name: 'Voice' }));
    await user.click(screen.getByRole('button', { name: '🎙️ Start recording' }));
    expect(recognition.start).toHaveBeenCalledOnce();

    act(() => {
      recognition.onstart();
      recognition.onresult({ results: [[{ transcript: 'A spoken news headline.' }]] });
      recognition.onend();
    });
    expect(screen.getByRole('textbox', { name: 'Voice transcript' })).toHaveValue('A spoken news headline.');
    expect(screen.getByText('Transcript ready')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Analyze transcript' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/predict',
      { text: 'A spoken news headline.' },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    ));

    await user.click(screen.getByRole('tab', { name: 'Voice' }));
    await user.click(screen.getByRole('button', { name: '🎙️ Start recording' }));
    act(() => {
      recognition.onerror({ error: 'not-allowed' });
      recognition.onend();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Microphone access was denied');
  });

  it('offers editable transcript input when browser speech recognition is unavailable', async () => {
    const user = userEvent.setup();
    render(<CheckNews backendUrl="http://localhost:8080" user={{ id: 1 }} />);
    await screen.findByRole('heading', { name: 'BBC headline' });
    await user.click(screen.getByRole('tab', { name: 'Voice' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Speech recognition is not supported');
    expect(screen.getByRole('button', { name: '🎙️ Start recording' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Voice transcript' })).toBeEnabled();

    await user.click(screen.getByRole('tab', { name: 'Text' }));
    await user.click(screen.getByRole('tab', { name: 'Voice' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Speech recognition is not supported');
  });

  it('keeps Image OCR on its existing prediction endpoint', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({
      data: {
        id: 23,
        prediction: 'REAL',
        confidence: 0.5,
        importantWords: [],
        extracted_text: 'Text extracted from the uploaded image.',
      },
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<CheckNews backendUrl="http://localhost:8080" user={{ id: 1 }} />);
    await screen.findByRole('heading', { name: 'BBC headline' });
    await user.click(screen.getByRole('tab', { name: 'Image OCR' }));
    const image = new File(['image bytes'], 'article.png', { type: 'image/png' });
    fireEvent.change(document.getElementById('imageFile'), { target: { files: [image] } });
    await user.click(screen.getByRole('button', { name: 'Scan & Analyze' }));

    expect(await screen.findByRole('heading', { name: 'AI model assessment' })).toBeInTheDocument();
    expect(screen.getByText('Extracted image text')).toBeInTheDocument();
    expect(screen.getByText('Text extracted from the uploaded image.')).toBeInTheDocument();
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/predict-image',
      expect.any(FormData),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('rejects images larger than 10 MB with a clear size limit', async () => {
    const user = userEvent.setup();
    render(<CheckNews backendUrl="http://localhost:8080" user={{ id: 1 }} />);
    await screen.findByRole('heading', { name: 'BBC headline' });
    await user.click(screen.getByRole('tab', { name: 'Image OCR' }));
    const oversizedImage = new File(['x'], 'large.png', { type: 'image/png' });
    Object.defineProperty(oversizedImage, 'size', { value: 10 * 1024 * 1024 + 1 });

    fireEvent.change(document.getElementById('imageFile'), {
      target: { files: [oversizedImage] },
    });

    expect(screen.getByText('Choose an image that is 10 MB or smaller.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scan & Analyze' })).not.toBeInTheDocument();
  });

  it('accepts an image exactly 10 MB in size', async () => {
    const user = userEvent.setup();
    render(<CheckNews backendUrl="http://localhost:8080" user={{ id: 1 }} />);
    await screen.findByRole('heading', { name: 'BBC headline' });
    await user.click(screen.getByRole('tab', { name: 'Image OCR' }));
    const maxSizeImage = new File(['x'], 'maximum.png', { type: 'image/png' });
    Object.defineProperty(maxSizeImage, 'size', { value: 10 * 1024 * 1024 });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:max-size-preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    fireEvent.change(document.getElementById('imageFile'), {
      target: { files: [maxSizeImage] },
    });

    expect(screen.getByRole('button', { name: 'Scan & Analyze' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
