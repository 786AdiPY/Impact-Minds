export default function UserChip({ collapsed = false }) {
  return (
    <div className={`user-chip ${collapsed ? 'collapsed' : ''}`} title="Logged in via WebAuthn passkey">
      <div className="user-chip-avatar">
        AN
        <span className="uc-dot" />
      </div>
      {!collapsed && (
        <div className="user-chip-text">
          <div className="user-chip-name">Analyst</div>
          <div className="user-chip-role">SOC · WebAuthn</div>
        </div>
      )}
    </div>
  );
}
