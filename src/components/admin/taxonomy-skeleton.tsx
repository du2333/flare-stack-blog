import "./taxonomy.css";

export function TaxonomySkeleton() {
  return (
    <div
      className="taxonomy-workspace fuwari-card-base animate-pulse"
      aria-busy="true"
    >
      <header className="taxonomy-heading">
        <div className="taxonomy-skeleton-line" />
      </header>
      <div className="taxonomy-browser">
        <aside className="taxonomy-explorer">
          <div className="taxonomy-mode-tabs h-10" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="taxonomy-skeleton-row">
              <div className="taxonomy-skeleton-line" />
            </div>
          ))}
        </aside>
        <section className="taxonomy-results">
          <div className="taxonomy-selection-heading">
            <div className="taxonomy-skeleton-line" />
          </div>
          <div className="taxonomy-post-scroll">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="taxonomy-skeleton-row">
                <div className="taxonomy-skeleton-line" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
