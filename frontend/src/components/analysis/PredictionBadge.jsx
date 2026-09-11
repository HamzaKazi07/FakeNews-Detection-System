export default function PredictionBadge({ prediction }) {
  const isReal = prediction?.toUpperCase() === 'REAL';
  return <span className={`prediction-badge ${isReal ? 'prediction-badge--real' : 'prediction-badge--fake'}`}>{isReal ? 'Likely Real' : 'Likely Fake'}</span>;
}
