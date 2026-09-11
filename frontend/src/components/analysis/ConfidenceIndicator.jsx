export default function ConfidenceIndicator({ confidence }) {
  const value = Math.max(0, Math.min(100, Number(confidence) || 0));
  return (
    <section className="confidence-indicator" aria-label={`Model confidence ${value}%`}>
      <div className="confidence-indicator__heading"><span>Model confidence</span><strong>{value}%</strong></div>
      <div className="confidence-indicator__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}><i style={{ width: `${value}%` }} /></div>
      <p>This is the model’s classification confidence, not a factual-verification score.</p>
    </section>
  );
}
