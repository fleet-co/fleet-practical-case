import "./StatusMessages.css";

function StatusMessages({ statusMessage, errors, onClearErrors }) {
  return (
    <>
      {statusMessage ? <p className="status success">{statusMessage}</p> : null}

      {errors.length > 0 ? (
        <div className="status error">
          <div className="error-header">
            <strong>Errors ({errors.length})</strong>
            <button type="button" onClick={onClearErrors}>
              Clear
            </button>
          </div>
          <ul>
            {errors.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

export default StatusMessages;
