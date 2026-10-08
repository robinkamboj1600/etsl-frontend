/**
 * A button label that switches text (Copy → Copied) without the button
 * changing width: every option takes the same grid cell, only one shows.
 */
export function StableLabel({ value, options }) {
  return (
    <span className="inline-grid">
      {options.map((o) => (
        <span key={o} className={o === value ? "col-start-1 row-start-1" : "invisible col-start-1 row-start-1"} aria-hidden={o !== value}>
          {o}
        </span>
      ))}
    </span>
  );
}
