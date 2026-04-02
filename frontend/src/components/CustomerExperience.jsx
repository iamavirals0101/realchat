export default function CustomerExperience({ isCustomer, eta, conversation, feedback, setFeedback, onSubmitFeedback }) {
  if (!isCustomer || !conversation) return null;

  return (
    <div className="mb-3 space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
      <div className="text-xs text-blue-800">
        Estimated support response: <span className="font-semibold">~{eta?.etaMinutes || 60} minutes</span>
      </div>
      {conversation.status === "RESOLVED" ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr_auto]">
          <select
            value={feedback.rating}
            onChange={(e) => setFeedback((prev) => ({ ...prev, rating: e.target.value }))}
            className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs"
          >
            <option value="">Rate support</option>
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - Okay</option>
            <option value="2">2 - Poor</option>
            <option value="1">1 - Bad</option>
          </select>
          <input
            value={feedback.comment}
            onChange={(e) => setFeedback((prev) => ({ ...prev, comment: e.target.value }))}
            placeholder="Share quick feedback"
            className="rounded-lg border border-blue-200 px-2 py-1 text-xs"
          />
          <button onClick={onSubmitFeedback} className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white">
            Submit
          </button>
        </div>
      ) : null}
    </div>
  );
}
