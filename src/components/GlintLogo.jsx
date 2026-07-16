// GLINT wordmark — gradient "GL"/"NT" with a mint sparkle standing in for the
// dot of the "I". Built as markup (not a raster) so it stays crisp at any size
// and always matches the live theme palette.

export default function GlintLogo({ size = 20, showMark = false, word = true }) {
  return (
    <span className="glint-lockup" style={{ fontSize: size }}>
      {showMark && (
        <span className="glint-box">
          <svg viewBox="0 0 24 24" width="0.62em" height="0.62em" aria-hidden="true">
            <path d="M12 3L14.2 9.8L21 12L14.2 14.2L12 21L9.8 14.2L3 12L9.8 9.8Z" fill="#04120d" />
          </svg>
        </span>
      )}
      {word && (
        <span className="glint-word" aria-label="GLINT">
          <span className="gseg">GL</span>
          <span className="glint-i">
            <svg className="glint-sparkle" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
              <path d="M12 2C12.5 7.4 13.6 9.6 18 10.5C13.6 11.4 12.5 13.6 12 19C11.5 13.6 10.4 11.4 6 10.5C10.4 9.6 11.5 7.4 12 2Z" />
            </svg>
            <span className="glint-stem" />
          </span>
          <span className="gseg">NT</span>
        </span>
      )}
    </span>
  );
}
