interface ErrorRetryProps {
  onRetry: () => void;
}

/** F-04-2: 자체 API 실패 시 재시도 버튼과 함께 오류 상태를 표시 */
export function ErrorRetry({ onRetry }: ErrorRetryProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-red-800">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
      >
        다시 시도
      </button>
    </div>
  );
}
