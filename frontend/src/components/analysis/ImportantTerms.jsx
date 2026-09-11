export default function ImportantTerms({ terms = [] }) {
  return <section className="important-terms"><div className="important-terms__heading"><h4>Important terms</h4><span title="Terms with strong TF-IDF weights in the submitted text.">About these terms</span></div>{terms.length ? <div className="important-terms__list">{terms.map((term, index) => <span key={`${term}-${index}`}>{term}</span>)}</div> : <p>No highlighted terms available.</p>}</section>;
}
